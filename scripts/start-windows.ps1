<#
.SYNOPSIS
    Starts the whole portfolio locally on Windows: embedded PostgreSQL + FastAPI API + React site.

.DESCRIPTION
    One-click launcher used by start.bat. Needs only Python (3.10, 3.11 or 3.12) and Node.js (20.19+ or 22.12+).
    No Docker and no PostgreSQL installation: the database is the PostgreSQL 16 bundled in the "pgserver"
    Python package, stored in .local\pgdata. Every step is idempotent: running it again is fast and reuses
    what is already installed or running.

.PARAMETER ApiPort   Port of the FastAPI backend (default 8000).
.PARAMETER WebPort   Port of the Vite development server = the site (default 5173).
.PARAMETER DbPort    Port of the embedded PostgreSQL (default 5433, so it never clashes with a system PostgreSQL).
.PARAMETER DataDir   Folder for local state: database files, logs, PIDs (default .local).
.PARAMETER VenvDir   Python virtual environment of the backend (default backend\.venv).
.PARAMETER NoBrowser     Do not open the browser at the end.
.PARAMETER NoNewWindows  Run the API and the site as hidden background processes (logs in <DataDir>\logs)
                         instead of two "Portfolio — API" / "Portfolio — Site" windows.

.EXAMPLE
    start.bat
.EXAMPLE
    start.bat -ApiPort 8001 -WebPort 5174 -NoBrowser
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)][int]$ApiPort = 8000,
    [ValidateRange(1, 65535)][int]$WebPort = 5173,
    [ValidateRange(1, 65535)][int]$DbPort = 5433,
    [string]$DataDir = '',
    [string]$VenvDir = '',
    [switch]$NoBrowser,
    [switch]$NoNewWindows
)

. (Join-Path $PSScriptRoot 'lib\common.ps1')

$DataDir = Resolve-FullPath $DataDir '.local'
$VenvDir = Resolve-FullPath $VenvDir 'backend\.venv'
$VenvPython = Get-VenvPython $VenvDir
$LogDir = Join-Path $DataDir 'logs'
$StampDir = Join-Path $DataDir 'stamps'
$TotalSteps = 6
$StartedAt = Get-Date

if (@(@($ApiPort, $WebPort, $DbPort) | Select-Object -Unique).Count -lt 3) {
    Stop-WithError "Les ports de l'API ($ApiPort), du site ($WebPort) et de la base ($DbPort) doivent être différents." `
        "The API ($ApiPort), website ($WebPort) and database ($DbPort) ports must be different."
}

Write-Title 'Portfolio — Youssra Boubakri · démarrage local / local start'
Write-Host "  $RepoRoot" -ForegroundColor DarkGray
New-Item -ItemType Directory -Force -Path $DataDir, $LogDir, $StampDir | Out-Null

# ------------------------------------------------------------------------------------------------------
# 1. Prerequisites: Python, Node.js, free ports
# ------------------------------------------------------------------------------------------------------
Write-Step 1 $TotalSteps 'Vérification des prérequis' 'Checking prerequisites'

$venvInfo = $null
if (Test-Path -LiteralPath $VenvPython) { $venvInfo = Get-PythonInfo $VenvPython }
$recreateVenv = $false
if (Test-SupportedPython $venvInfo) {
    Write-Ok "Python $($venvInfo.Version) (environnement existant)" "Python $($venvInfo.Version) (existing environment)"
} else {
    $search = Find-BasePython
    if ($null -eq $search.Selected) { Stop-ForMissingPython $search.Found }
    $basePython = $search.Selected
    Write-Ok "Python $($basePython.Version) trouvé" "Python $($basePython.Version) found"
    if (Test-Path -LiteralPath $VenvDir) {
        $recreateVenv = $true
        if ($venvInfo) {
            Write-Warn "L'environnement $VenvDir utilise Python $($venvInfo.Version) : il sera recréé" "the environment uses Python $($venvInfo.Version): it will be recreated"
        } else {
            Write-Warn "L'environnement $VenvDir est inutilisable : il sera recréé" 'the environment is broken: it will be recreated'
        }
    }
}

$node = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
$npm = Get-Command npm.cmd -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $node -or -not $npm) {
    Stop-WithError 'Node.js est introuvable.' 'Node.js was not found.' `
        @('Installez la version LTS de Node.js depuis https://nodejs.org/ puis relancez start.bat.',
          'Install the LTS version of Node.js from https://nodejs.org/ and run start.bat again.')
}
$nodeVersionText = (Invoke-Capture $node.Source @('--version')).Stdout.TrimStart('v')
try { $nodeVersion = [version]$nodeVersionText } catch { $nodeVersion = [version]'0.0' }
$nodeOk = ($nodeVersion.Major -eq 20 -and $nodeVersion.Minor -ge 19) -or ($nodeVersion.Major -eq 22 -and $nodeVersion.Minor -ge 12) -or ($nodeVersion.Major -ge 23)
if (-not $nodeOk) {
    Stop-WithError "Node.js $nodeVersionText est trop ancien (20.19+ ou 22.12+ requis)." "Node.js $nodeVersionText is too old (20.19+ or 22.12+ required)." `
        @('Installez la version LTS de Node.js depuis https://nodejs.org/ puis relancez start.bat.',
          'Install the LTS version of Node.js from https://nodejs.org/ and run start.bat again.')
}
Write-Ok "Node.js $nodeVersionText"

# Next port after $Port that is free and not used by the other two roles (for error hints).
function Get-PortSuggestion([int]$Port) {
    $candidate = $Port + 1
    while ($candidate -lt 65535 -and (($candidate -in @($ApiPort, $WebPort, $DbPort)) -or (Get-PortOwner $candidate))) { $candidate++ }
    return $candidate
}

$reuseApi = $false
$apiOwner = Get-PortOwner $ApiPort
if ($apiOwner) {
    if (Test-PortfolioApi $ApiPort) {
        $reuseApi = $true
        Write-Ok "L'API tourne déjà sur le port $ApiPort : elle sera réutilisée" "the API is already running on port ${ApiPort}: reusing it"
    } else {
        Stop-WithError "Le port $ApiPort (API) est déjà utilisé par un autre programme : $apiOwner." `
            "Port $ApiPort (API) is already used by another program: $apiOwner." `
            @("Fermez ce programme, ou choisissez un autre port : start.bat -ApiPort $(Get-PortSuggestion $ApiPort)",
              "Close that program, or pick another port: start.bat -ApiPort $(Get-PortSuggestion $ApiPort)")
    }
}
$reuseSite = $false
$siteOwner = Get-PortOwner $WebPort
if ($siteOwner) {
    if (Test-PortfolioSite $WebPort) {
        $reuseSite = $true
        Write-Ok "Le site tourne déjà sur le port $WebPort : il sera réutilisé" "the site is already running on port ${WebPort}: reusing it"
    } else {
        Stop-WithError "Le port $WebPort (site) est déjà utilisé par un autre programme : $siteOwner." `
            "Port $WebPort (site) is already used by another program: $siteOwner." `
            @("Fermez ce programme, ou choisissez un autre port : start.bat -WebPort $(Get-PortSuggestion $WebPort)",
              "Close that program, or pick another port: start.bat -WebPort $(Get-PortSuggestion $WebPort)")
    }
}
if (-not $apiOwner -and -not $siteOwner) { Write-Ok "Ports $ApiPort (API) et $WebPort (site) libres" "ports $ApiPort and $WebPort are free" }

# ------------------------------------------------------------------------------------------------------
# 2. Backend: virtual environment, Python packages, .env
# ------------------------------------------------------------------------------------------------------
Write-Step 2 $TotalSteps 'Préparation du backend' 'Preparing the backend'

$venvCreated = $false
if ($recreateVenv) {
    # Only ever delete a folder that really is a virtual environment.
    if (-not (Test-Path -LiteralPath (Join-Path $VenvDir 'pyvenv.cfg'))) {
        Stop-WithError "Le dossier $VenvDir existe mais n'est pas un environnement Python." `
            "$VenvDir exists but is not a Python virtual environment." `
            @('Déplacez ce dossier ou choisissez-en un autre avec -VenvDir.', 'Move that folder away or choose another one with -VenvDir.')
    }
    try { Remove-Item -LiteralPath $VenvDir -Recurse -Force }
    catch {
        Stop-WithError "Impossible de supprimer l'ancien environnement $VenvDir (fichier en cours d'utilisation ?)." `
            "Could not delete the old environment $VenvDir (file in use?)." `
            @('Lancez stop.bat, fermez les fenêtres Python ouvertes, puis relancez start.bat.',
              'Run stop.bat, close any open Python windows, then run start.bat again.')
    }
}
if (-not (Test-Path -LiteralPath $VenvPython)) {
    Assert-VenvPathFits $VenvDir
    Write-Info "Création de l'environnement Python ($VenvDir)" 'creating the Python virtual environment'
    & $basePython.Path -m venv $VenvDir
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $VenvPython)) {
        Stop-WithError "Impossible de créer l'environnement Python." 'Could not create the Python virtual environment.'
    }
    $venvCreated = $true
}

$requirements = @((Join-Path $BackendDir 'requirements.txt'), (Join-Path $BackendDir 'requirements-local.txt'))
$pythonStampFile = Join-Path $StampDir 'python-packages.sha256'
$pythonStamp = Get-TextHash $requirements @($VenvPython.ToLowerInvariant())
$needInstall = $venvCreated -or ((Read-Stamp $pythonStampFile) -ne $pythonStamp)
if (-not $needInstall) {
    $importCheck = Invoke-Capture $VenvPython @('-c', 'import fastapi, uvicorn, sqlalchemy, alembic, psycopg, pgserver')
    $needInstall = $importCheck.ExitCode -ne 0
}
if ($needInstall) {
    Assert-VenvPathFits $VenvDir
    Write-Info 'Installation des paquets Python (première fois : 1 à 5 minutes)' 'installing Python packages (first time: 1-5 minutes)'
    & $VenvPython -m pip install --disable-pip-version-check --no-input --quiet -r $requirements[0] -r $requirements[1]
    if ($LASTEXITCODE -ne 0) {
        Stop-WithError "L'installation des paquets Python a échoué." 'Installing the Python packages failed.' `
            @('Vérifiez la connexion Internet puis relancez start.bat.', 'Check the Internet connection and run start.bat again.')
    }
    Write-Stamp $pythonStampFile $pythonStamp
    Write-Ok 'Paquets Python installés' 'Python packages installed'
} else {
    Write-Ok 'Paquets Python déjà à jour' 'Python packages up to date'
}

$envFile = Join-Path $RepoRoot '.env'
$envExample = Join-Path $RepoRoot '.env.example'
function New-SecretKey {
    $bytes = New-Object byte[] 48
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    return ([Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_'))
}
if (-not (Test-Path -LiteralPath $envFile)) {
    if (-not (Test-Path -LiteralPath $envExample)) {
        Stop-WithError 'Le fichier .env.example est introuvable.' '.env.example is missing.'
    }
    $content = [System.IO.File]::ReadAllText($envExample)
    $content = [regex]::Replace($content, '(?m)^SECRET_KEY=.*$', 'SECRET_KEY=' + (New-SecretKey))
    Write-Utf8File $envFile $content
    Write-Ok 'Fichier .env créé (avec une clé secrète aléatoire)' '.env created with a random SECRET_KEY'
} else {
    $content = [System.IO.File]::ReadAllText($envFile)
    $match = [regex]::Match($content, '(?m)^\s*SECRET_KEY\s*=\s*(.*?)\s*$')
    if (-not $match.Success) {
        $content = $content.TrimEnd() + [Environment]::NewLine + 'SECRET_KEY=' + (New-SecretKey) + [Environment]::NewLine
        Write-Utf8File $envFile $content
        Write-Ok 'SECRET_KEY ajoutée au fichier .env' 'SECRET_KEY added to .env'
    } elseif ($match.Groups[1].Value.Trim('"', "'").Length -lt 32) {
        $content = [regex]::Replace($content, '(?m)^\s*SECRET_KEY\s*=.*$', 'SECRET_KEY=' + (New-SecretKey))
        Write-Utf8File $envFile $content
        Write-Ok 'SECRET_KEY trop courte remplacée dans .env' 'short SECRET_KEY replaced in .env'
    } else {
        Write-Ok 'Configuration .env présente' '.env found'
    }
}

# Child processes (migrations, seed, API, site) inherit these variables; they take precedence over .env.
$env:PYTHONUTF8 = '1'
$env:SITE_URL = "http://localhost:$WebPort"
$env:VITE_SITE_URL = "http://localhost:$WebPort"
$env:VITE_DEV_API_TARGET = "http://127.0.0.1:$ApiPort"
$env:PORTFOLIO_LOCAL_DIR = $DataDir

# ------------------------------------------------------------------------------------------------------
# 3. Embedded PostgreSQL
# ------------------------------------------------------------------------------------------------------
Write-Step 3 $TotalSteps 'Démarrage de la base de données' 'Starting the database'
if (-not (Test-Path -LiteralPath (Join-Path $DataDir 'pgdata\PG_VERSION'))) {
    Write-Info 'Première initialisation de PostgreSQL (environ 30 secondes)' 'first-time PostgreSQL setup (about 30 seconds)'
}
$dbOutput = @(& $VenvPython $LocalDbScript start --port $DbPort --local-dir $DataDir)
if ($LASTEXITCODE -ne 0) {
    Stop-WithError 'La base de données PostgreSQL ne démarre pas (voir le message ci-dessus).' 'PostgreSQL did not start (see the message above).' `
        @("Journal / log : $(Join-Path $DataDir 'postgres.log')", "Port occupé ? Essayez / Port busy? Try: start.bat -DbPort $($DbPort + 1)")
}
$databaseUrl = ($dbOutput | Where-Object { $_ -match '^postgresql' } | Select-Object -Last 1)
if (-not $databaseUrl) { Stop-WithError "Adresse de la base de données introuvable." 'The database URL was not returned.' }
$env:DATABASE_URL = $databaseUrl
$actualDbPort = [int]([regex]::Match($databaseUrl, '@[^:/]+:(\d+)/').Groups[1].Value)
Write-Ok "PostgreSQL prêt sur le port $actualDbPort" "PostgreSQL ready on port $actualDbPort"

# ------------------------------------------------------------------------------------------------------
# 4. Schema migrations + content
# ------------------------------------------------------------------------------------------------------
Write-Step 4 $TotalSteps 'Mise à jour de la base (tables et contenu)' 'Migrating and seeding the database'
Push-Location -LiteralPath $BackendDir
try {
    & $VenvPython -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { Stop-WithError 'La migration de la base a échoué.' 'Database migration failed.' }
    Write-Ok 'Tables à jour' 'schema up to date'
    & $VenvPython -m app.database.seed
    if ($LASTEXITCODE -ne 0) {
        Stop-WithError 'Le chargement du contenu a échoué (voir le message ci-dessus).' 'Loading the content failed (see the message above).' `
            @('Vérifiez database\seed\portfolio.json (virgules, guillemets).', 'Check database\seed\portfolio.json (commas, quotes).')
    }
    Write-Ok 'Contenu chargé (database\seed\portfolio.json)' 'content loaded'
} finally {
    Pop-Location
}

# ------------------------------------------------------------------------------------------------------
# 5. Frontend dependencies
# ------------------------------------------------------------------------------------------------------
Write-Step 5 $TotalSteps 'Préparation du site' 'Preparing the website'
$lockFile = Join-Path $FrontendDir 'package-lock.json'
$nodeModules = Join-Path $FrontendDir 'node_modules'
$npmStampFile = Join-Path $StampDir 'npm-packages.sha256'
$npmStamp = Get-TextHash @($lockFile, (Join-Path $FrontendDir 'package.json'))
$needNpm = -not (Test-Path -LiteralPath (Join-Path $nodeModules 'vite\bin\vite.js'))
if (-not $needNpm -and (Read-Stamp $npmStampFile) -ne $npmStamp) {
    # No stamp yet: trust npm's own record of the last install when it is newer than the lock file.
    $hiddenLock = Join-Path $nodeModules '.package-lock.json'
    $needNpm = -not ((Test-Path -LiteralPath $hiddenLock) -and (Get-Item -LiteralPath $hiddenLock).LastWriteTimeUtc -ge (Get-Item -LiteralPath $lockFile).LastWriteTimeUtc)
    if (-not $needNpm -and (Read-Stamp $npmStampFile)) { $needNpm = $true }   # the lock file changed since our last install
}
if ($needNpm) {
    Write-Info 'Installation des paquets du site (première fois : 1 à 3 minutes)' 'installing website packages (first time: 1-3 minutes)'
    Push-Location -LiteralPath $FrontendDir
    try { & $npm.Source install --no-audit --no-fund --loglevel=error } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) {
        Stop-WithError "L'installation des paquets du site a échoué." 'Installing the website packages failed.' `
            @('Vérifiez la connexion Internet puis relancez start.bat.', 'Check the Internet connection and run start.bat again.')
    }
    Write-Ok 'Paquets du site installés' 'website packages installed'
} else {
    Write-Ok 'Paquets du site déjà à jour' 'website packages up to date'
}
Write-Stamp $npmStampFile $npmStamp

# ------------------------------------------------------------------------------------------------------
# 6. API + site
# ------------------------------------------------------------------------------------------------------
Write-Step 6 $TotalSteps "Démarrage de l'API et du site" 'Starting the API and the website'
$state = Read-LauncherState $DataDir
$state['data_dir'] = $DataDir
$state['db_port'] = $actualDbPort

function ConvertTo-PsLiteral([string]$Value) { "'" + $Value.Replace("'", "''") + "'" }

# Opens a titled PowerShell window running the server. The server runs as a child process in the same console
# while the window re-asserts its title every 2 s: child programs (e.g. the "net use" call Vite makes through
# cmd.exe on Windows) would otherwise rename the window, and stop-windows.ps1 relies on the title as a fallback.
function Start-ServerWindow([string]$Title, [string]$WorkingDirectory, [string]$FilePath, [string[]]$Arguments, [string]$Url) {
    $body = @(
        "`$Host.UI.RawUI.WindowTitle = $(ConvertTo-PsLiteral $Title)",
        "Write-Host $(ConvertTo-PsLiteral "$Title  ->  $Url") -ForegroundColor Cyan",
        "Write-Host 'Fermer cette fenêtre arrête ce serveur. / Closing this window stops this server.' -ForegroundColor DarkGray",
        "Write-Host ''",
        "Set-Location -LiteralPath $(ConvertTo-PsLiteral $WorkingDirectory)",
        "`$server = Start-Process -FilePath $(ConvertTo-PsLiteral $FilePath) -ArgumentList $(ConvertTo-PsLiteral (ConvertTo-ArgumentString $Arguments)) -NoNewWindow -PassThru",
        "try { while (-not `$server.HasExited) { `$Host.UI.RawUI.WindowTitle = $(ConvertTo-PsLiteral $Title); Start-Sleep -Seconds 2 } }",
        "finally { if (-not `$server.HasExited) { Stop-Process -Id `$server.Id -Force -ErrorAction SilentlyContinue } }",
        "Write-Host ''",
        "Write-Host 'Le serveur est arrêté (voir les messages ci-dessus). / The server has stopped (see the messages above).' -ForegroundColor Yellow"
    ) -join [Environment]::NewLine
    $encoded = [Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes($body))
    return Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-NoExit', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', $encoded) `
        -WorkingDirectory $WorkingDirectory -PassThru
}

# Starts a hidden background server whose output goes to <DataDir>\logs. cmd.exe performs the redirection:
# Start-Process -RedirectStandardOutput would make the server inherit every inheritable handle of this
# launcher, including its own stdout when a caller captures it, and that caller would then wait forever.
# Without -Redirect* parameters Start-Process uses ShellExecute: the environment is inherited, handles are not.
function Start-ServerHidden([string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory, [string]$LogName) {
    $out = Join-Path $LogDir "$LogName.out.log"
    $err = Join-Path $LogDir "$LogName.err.log"
    $command = (ConvertTo-ArgumentString (@($FilePath) + $Arguments)) + " < NUL > `"$out`" 2> `"$err`""
    return Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\cmd.exe') -ArgumentList "/d /s /c `"$command`"" `
        -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru
}

function Wait-Until([scriptblock]$Condition, [int]$TimeoutSeconds, [System.Diagnostics.Process]$Process) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (& $Condition) { return $true }
        if ($Process -and $Process.HasExited) { return $false }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Get-LogTail([string]$LogName) {
    $lines = @()
    foreach ($suffix in 'err', 'out') {
        $file = Join-Path $LogDir "$LogName.$suffix.log"
        if (Test-Path -LiteralPath $file) { $lines += @(Get-Content -LiteralPath $file -Tail 15 -ErrorAction SilentlyContinue) }
    }
    return $lines
}

$mode = 'window'
if ($NoNewWindows) { $mode = 'background' }
$apiProcess = $null
$siteProcess = $null

if (-not $reuseApi) {
    $apiArguments = @('-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', "$ApiPort")
    if ($NoNewWindows) {
        $apiProcess = Start-ServerHidden $VenvPython $apiArguments $BackendDir 'api'
    } else {
        $apiProcess = Start-ServerWindow $ApiTitle $BackendDir $VenvPython $apiArguments "http://localhost:$ApiPort/api/docs"
    }
    $state['api'] = New-ProcessRecord $apiProcess $ApiPort $mode $ApiTitle
    Save-LauncherState $DataDir $state
    Write-Info "API en cours de démarrage (port $ApiPort)" 'API starting'
    if (-not (Wait-Until { Test-PortfolioApi $ApiPort } 90 $apiProcess)) {
        $hints = @('Lisez les messages de la fenêtre « Portfolio — API ». / Read the messages in the "Portfolio — API" window.')
        if ($NoNewWindows) { $hints = @(Get-LogTail 'api') }
        Stop-WithError "L'API ne répond pas." 'The API did not start.' $hints
    }
}
$health = Invoke-HttpGet "http://127.0.0.1:$ApiPort/api/health"
if ($health -and $health.Status -eq 200) { Write-Ok "API prête : http://localhost:$ApiPort/api/docs" "API ready" }
else { Write-Warn "L'API répond mais signale un problème de base de données" 'the API answers but reports a database problem' }

if (-not $reuseSite) {
    # Equivalent to "npm run dev -- --port <WebPort> --strictPort" without the npm/cmd.exe wrappers.
    $siteArguments = @((Join-Path $FrontendDir 'node_modules\vite\bin\vite.js'), '--port', "$WebPort", '--strictPort')
    if ($NoNewWindows) {
        $siteProcess = Start-ServerHidden $node.Source $siteArguments $FrontendDir 'site'
    } else {
        $siteProcess = Start-ServerWindow $SiteTitle $FrontendDir $node.Source $siteArguments "http://localhost:$WebPort"
    }
    $state['site'] = New-ProcessRecord $siteProcess $WebPort $mode $SiteTitle
    Save-LauncherState $DataDir $state
    Write-Info "Site en cours de démarrage (port $WebPort)" 'website starting'
    if (-not (Wait-Until { Test-PortfolioSite $WebPort } 120 $siteProcess)) {
        $hints = @('Lisez les messages de la fenêtre « Portfolio — Site ». / Read the messages in the "Portfolio — Site" window.')
        if ($NoNewWindows) { $hints = @(Get-LogTail 'site') }
        Stop-WithError 'Le site ne répond pas.' 'The website did not start.' $hints
    }
}
Save-LauncherState $DataDir $state
$proxied = Invoke-HttpGet "http://localhost:$WebPort/api/health"
if ($proxied -and $proxied.Status -eq 200) { Write-Ok "Site prêt et relié à l'API" 'website ready and connected to the API' }
else { Write-Warn "Le site répond, mais n'atteint pas l'API (port $ApiPort)" "the website answers but cannot reach the API on port $ApiPort" }

$elapsed = [int]((Get-Date) - $StartedAt).TotalSeconds
Write-Host ''
Write-Host "  Le portfolio est prêt ($elapsed s) / The portfolio is ready" -ForegroundColor Green
Write-Host ''
Write-Host "    Site                        http://localhost:$WebPort" -ForegroundColor White
Write-Host "    Documentation de l'API      http://localhost:$ApiPort/api/docs" -ForegroundColor Gray
Write-Host "    Base de données / database  PostgreSQL, port $actualDbPort ($DataDir)" -ForegroundColor Gray
Write-Host ''
if ($NoNewWindows) {
    Write-Host "  Serveurs en arrière-plan, journaux / background servers, logs: $LogDir" -ForegroundColor DarkGray
} else {
    Write-Host '  Les serveurs tournent dans les fenêtres « Portfolio — API » et « Portfolio — Site ».' -ForegroundColor DarkGray
    Write-Host '  The servers run in the "Portfolio — API" and "Portfolio — Site" windows.' -ForegroundColor DarkGray
}
Write-Host '  Pour tout arrêter : double-cliquez sur stop.bat / To stop everything: double-click stop.bat' -ForegroundColor DarkGray
Write-Host ''

if (-not $NoBrowser) { Start-Process "http://localhost:$WebPort/" }
exit 0
