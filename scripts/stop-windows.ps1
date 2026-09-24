<#
.SYNOPSIS
    Stops what start-windows.ps1 started: the API, the website and the embedded PostgreSQL.

.DESCRIPTION
    Used by stop.bat. Only processes recorded by the launcher (<DataDir>\pids.json) are stopped, or, when
    that file is missing, the windows titled "Portfolio — API" / "Portfolio — Site". Other programs using
    the same ports are never touched. The embedded database is shut down cleanly (pg_ctl stop -m fast).

.PARAMETER ApiPort / WebPort / DbPort  Ports used by start-windows.ps1 (only used to report their state).
.PARAMETER DataDir       Folder for local state (default .local).
.PARAMETER VenvDir       Python virtual environment of the backend (default backend\.venv).
.PARAMETER KeepDatabase  Leave the embedded PostgreSQL running.
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)][int]$ApiPort = 8000,
    [ValidateRange(1, 65535)][int]$WebPort = 5173,
    [ValidateRange(1, 65535)][int]$DbPort = 5433,
    [string]$DataDir = '',
    [string]$VenvDir = '',
    [switch]$KeepDatabase
)

. (Join-Path $PSScriptRoot 'lib\common.ps1')

$DataDir = Resolve-FullPath $DataDir '.local'
$VenvDir = Resolve-FullPath $VenvDir 'backend\.venv'
$VenvPython = Get-VenvPython $VenvDir

Write-Title 'Portfolio — arrêt / stop'

# ------------------------------------------------------------------------------------------------------
# 1. API and website
# ------------------------------------------------------------------------------------------------------
Write-Step 1 2 "Arrêt du site et de l'API" 'Stopping the website and the API'
$state = Read-LauncherState $DataDir
$stoppedPorts = @()
$recorded = $false
foreach ($entry in @(@('site', 'Site', 'Site arrêté', 'Site déjà arrêté'), @('api', 'API', 'API arrêtée', 'API déjà arrêtée'))) {
    $key = $entry[0]; $label = $entry[1]; $stoppedFr = $entry[2]; $alreadyFr = $entry[3]
    if (-not $state.ContainsKey($key)) { continue }
    $recorded = $true
    $record = $state[$key]
    if (Test-RecordAlive $record) {
        Stop-ProcessTree ([int]$record.pid)
        $stoppedPorts += [int]$record.port
        Write-Ok "$stoppedFr (port $($record.port))" "$label stopped"
    } else {
        Write-Info $alreadyFr "$label already stopped"
    }
    $state.Remove($key)
}
if (-not $recorded) {
    # No record (e.g. the file was deleted): fall back to the launcher's window titles, nothing else.
    $windows = @(Get-Process -Name powershell, pwsh -ErrorAction SilentlyContinue |
        Where-Object { $_.MainWindowTitle -eq $ApiTitle -or $_.MainWindowTitle -eq $SiteTitle })
    foreach ($window in $windows) {
        $title = $window.MainWindowTitle
        Stop-ProcessTree $window.Id
        Write-Ok "Fenêtre « $title » fermée" "window closed"
    }
    if ($windows.Count -eq 0) { Write-Info 'Aucun serveur lancé par start.bat en cours' 'no server started by start.bat is running' }
}
Save-LauncherState $DataDir $state

# Give the operating system a moment to release the listening sockets.
$deadline = (Get-Date).AddSeconds(10)
while ((Get-Date) -lt $deadline -and @($stoppedPorts | Where-Object { Get-PortOwner $_ }).Count -gt 0) {
    Start-Sleep -Milliseconds 300
}

# ------------------------------------------------------------------------------------------------------
# 2. Embedded PostgreSQL
# ------------------------------------------------------------------------------------------------------
Write-Step 2 2 'Arrêt de la base de données' 'Stopping the database'
if ($KeepDatabase) {
    Write-Info 'Base de données laissée en marche (-KeepDatabase)' 'database left running'
} elseif (-not (Test-Path -LiteralPath (Join-Path $DataDir 'pgdata\PG_VERSION'))) {
    Write-Info 'Aucune base de données locale' 'no local database'
} elseif (-not (Test-Path -LiteralPath $VenvPython)) {
    Write-Warn "Environnement Python introuvable ($VenvDir) : base non arrêtée" 'Python environment not found: database not stopped'
} else {
    & $VenvPython $LocalDbScript stop --local-dir $DataDir
    if ($LASTEXITCODE -eq 0) { Write-Ok 'Base de données arrêtée' 'database stopped' }
    else { Write-Warn "La base de données n'a pas pu être arrêtée (voir ci-dessus)" 'the database could not be stopped (see above)' }
    if ($state.ContainsKey('db_port')) { $state.Remove('db_port') }
    if ($state.ContainsKey('data_dir')) { $state.Remove('data_dir') }
    Save-LauncherState $DataDir $state
}

Write-Host ''
$busy = @()
$ports = @(@('API', $ApiPort), @('site', $WebPort))
if (-not $KeepDatabase) { $ports += , @('base de données / database', $DbPort) }
foreach ($port in $ports) {
    $owner = Get-PortOwner $port[1]
    if ($owner) { $busy += "port $($port[1]) ($($port[0])) : $owner" }
}
if ($busy.Count -gt 0) {
    Write-Warn 'Ports encore utilisés par des programmes non lancés par start.bat (laissés intacts) :' 'ports still used by programs not started by start.bat (left untouched):'
    foreach ($line in $busy) { Write-Host "         $line" -ForegroundColor DarkYellow }
} else {
    Write-Ok "Ports $ApiPort, $WebPort et $DbPort libres" 'ports are free'
}
Write-Host ''
Write-Host '  Tout est arrêté. / Everything is stopped.' -ForegroundColor Green
Write-Host ''
exit 0
