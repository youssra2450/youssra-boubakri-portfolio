<#
.SYNOPSIS
    Re-applies database\seed\portfolio.json to the embedded database (python -m app.database.seed --force).

.DESCRIPTION
    Used by update-content.bat after editing database\seed\portfolio.json. The content tables are emptied
    and reloaded from the file (contact messages are kept). The file is validated first: if it contains an
    error, nothing is changed. Works whether the site is running or not; the running site shows the new
    content after a page refresh.

.PARAMETER DbPort   Port of the embedded PostgreSQL when it has to be started (default 5433).
.PARAMETER DataDir  Folder for local state (default .local).
.PARAMETER VenvDir  Python virtual environment of the backend (default backend\.venv).
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)][int]$DbPort = 5433,
    [string]$DataDir = '',
    [string]$VenvDir = ''
)

. (Join-Path $PSScriptRoot 'lib\common.ps1')

$DataDir = Resolve-FullPath $DataDir '.local'
$VenvDir = Resolve-FullPath $VenvDir 'backend\.venv'
$VenvPython = Get-VenvPython $VenvDir
$SeedFile = Join-Path $RepoRoot 'database\seed\portfolio.json'

Write-Title 'Portfolio — mise à jour du contenu / content update'

Write-Step 1 3 'Vérification' 'Checking'
if (-not (Test-SupportedPython (Get-PythonInfo $VenvPython)) -or -not (Test-Path -LiteralPath (Join-Path $DataDir 'pgdata\PG_VERSION'))) {
    Stop-WithError "Le projet n'a pas encore été installé sur ce PC." 'The project has not been set up on this computer yet.' `
        @("Double-cliquez d'abord sur start.bat (une seule fois), puis relancez update-content.bat.",
          'Double-click start.bat first (once), then run update-content.bat again.')
}
if (-not (Test-Path -LiteralPath $SeedFile)) {
    Stop-WithError "Fichier introuvable : $SeedFile" "File not found: $SeedFile"
}
Write-Ok "Fichier de contenu : $SeedFile" 'content file found'

Write-Step 2 3 'Base de données' 'Database'
& $VenvPython $LocalDbScript status --local-dir $DataDir | Out-Null
$wasRunning = ($LASTEXITCODE -eq 0)
$env:PYTHONUTF8 = '1'
$dbOutput = @(& $VenvPython $LocalDbScript start --port $DbPort --local-dir $DataDir)
if ($LASTEXITCODE -ne 0) {
    Stop-WithError 'La base de données ne démarre pas (voir le message ci-dessus).' 'The database did not start (see the message above).'
}
$env:DATABASE_URL = ($dbOutput | Where-Object { $_ -match '^postgresql' } | Select-Object -Last 1)
Write-Ok 'Base de données prête' 'database ready'

Write-Step 3 3 'Application du contenu' 'Applying the content'
Push-Location -LiteralPath $BackendDir
try {
    & $VenvPython -m app.database.seed --force
    $seedExit = $LASTEXITCODE
} finally {
    Pop-Location
}
if (-not $wasRunning) {
    & $VenvPython $LocalDbScript stop --local-dir $DataDir | Out-Null
}
if ($seedExit -ne 0) {
    Stop-WithError "Le contenu n'a pas été mis à jour : database\seed\portfolio.json contient une erreur (voir le message ci-dessus)." `
        'The content was not updated: database\seed\portfolio.json contains an error (see the message above).' `
        @('Corrigez le fichier (virgule, guillemet ou crochet manquant) puis relancez update-content.bat.',
          'Fix the file (missing comma, quote or bracket) and run update-content.bat again. Nothing was changed.')
}

Write-Host ''
Write-Host '  Contenu mis à jour. / Content updated.' -ForegroundColor Green
if ($wasRunning) {
    Write-Host '  Actualisez la page du site (Ctrl+F5) ; comptez jusqu''à une minute de cache.' -ForegroundColor Gray
    Write-Host '  Refresh the site (Ctrl+F5); allow up to one minute of browser cache.' -ForegroundColor Gray
} else {
    Write-Host '  Lancez start.bat pour voir le site. / Run start.bat to see the site.' -ForegroundColor Gray
}
Write-Host ''
exit 0
