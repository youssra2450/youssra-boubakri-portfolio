# Shared helpers of the Windows launcher scripts (start-windows.ps1, stop-windows.ps1, update-content.ps1).
#
# Windows PowerShell 5.1 compatible. Saved as UTF-8 *with BOM* so that the accented French messages display
# correctly in Windows PowerShell 5.1 (which reads BOM-less scripts with the ANSI code page).

$ErrorActionPreference = 'Stop'

$script:RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$script:BackendDir = Join-Path $script:RepoRoot 'backend'
$script:FrontendDir = Join-Path $script:RepoRoot 'frontend'
$script:LocalDbScript = Join-Path $script:BackendDir 'scripts\local_db.py'
$script:ApiTitle = 'Portfolio — API'
$script:SiteTitle = 'Portfolio — Site'
$script:PythonProbe = "import sys;print('.'.join(map(str,sys.version_info[:3])));print(sys.executable)"
$script:MinPython = [version]'3.10'
$script:MaxPythonExclusive = [version]'3.13'   # the pgserver wheels (embedded PostgreSQL) exist for 3.10-3.12
$script:Utf8NoBom = New-Object System.Text.UTF8Encoding $false

# ------------------------------------------------------------------------------------------------------
# Console output (short bilingual lines: French first, English second)
# ------------------------------------------------------------------------------------------------------

function Write-Title([string]$Text) {
    Write-Host ''
    Write-Host "  $Text" -ForegroundColor White
    Write-Host ('  ' + ('=' * $Text.Length)) -ForegroundColor DarkGray
}

function Write-Step([int]$Index, [int]$Total, [string]$Fr, [string]$En) {
    Write-Host ''
    Write-Host ('[{0}/{1}] {2}' -f $Index, $Total, $Fr) -ForegroundColor Cyan -NoNewline
    Write-Host (' / {0}' -f $En) -ForegroundColor DarkCyan
}

function Write-Line([string]$Marker, [string]$Fr, [string]$En, [ConsoleColor]$Color, [ConsoleColor]$SecondColor) {
    Write-Host ('      {0} {1}' -f $Marker, $Fr) -ForegroundColor $Color -NoNewline
    if ($En) { Write-Host (' / {0}' -f $En) -ForegroundColor $SecondColor } else { Write-Host '' }
}

function Write-Ok([string]$Fr, [string]$En = '') { Write-Line 'OK' $Fr $En Green DarkGreen }
function Write-Info([string]$Fr, [string]$En = '') { Write-Line '..' $Fr $En Gray DarkGray }
function Write-Warn([string]$Fr, [string]$En = '') { Write-Line '!!' $Fr $En Yellow DarkYellow }

function Stop-WithError([string]$Fr, [string]$En, [string[]]$Hints = @()) {
    Write-Host ''
    Write-Host "  ERREUR : $Fr" -ForegroundColor Red
    Write-Host "  ERROR  : $En" -ForegroundColor Red
    foreach ($hint in $Hints) { Write-Host "    -> $hint" -ForegroundColor Yellow }
    Write-Host ''
    exit 1
}

# ------------------------------------------------------------------------------------------------------
# Paths, files, processes
# ------------------------------------------------------------------------------------------------------

function Resolve-FullPath([string]$Path, [string]$Default) {
    if (-not $Path) { $Path = $Default }
    if (-not [System.IO.Path]::IsPathRooted($Path)) { $Path = Join-Path $script:RepoRoot $Path }
    return [System.IO.Path]::GetFullPath($Path)
}

function Get-VenvPython([string]$VenvDir) { Join-Path $VenvDir 'Scripts\python.exe' }

function Write-Utf8File([string]$Path, [string]$Content) {
    [System.IO.File]::WriteAllText($Path, $Content, $script:Utf8NoBom)
}

function Get-TextHash([string[]]$Files, [string[]]$Extra = @()) {
    $builder = New-Object System.Text.StringBuilder
    foreach ($file in $Files) {
        if (Test-Path -LiteralPath $file) { [void]$builder.AppendLine((Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash) }
        else { [void]$builder.AppendLine("missing:$file") }
    }
    foreach ($value in $Extra) { [void]$builder.AppendLine($value) }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($builder.ToString()))
        return ([System.BitConverter]::ToString($bytes) -replace '-', '')
    } finally { $sha.Dispose() }
}

function Read-Stamp([string]$Path) {
    if (Test-Path -LiteralPath $Path) { return ([System.IO.File]::ReadAllText($Path)).Trim() }
    return ''
}

function Write-Stamp([string]$Path, [string]$Value) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
    Write-Utf8File $Path $Value
}

function ConvertTo-ArgumentString([string[]]$Arguments) {
    $quoted = foreach ($argument in $Arguments) {
        if ($argument -eq '') { '""' }
        elseif ($argument -match '[\s"]') { '"' + ($argument -replace '(\\*)"', '$1$1\"' -replace '(\\+)$', '$1$1') + '"' }
        else { $argument }
    }
    return ($quoted -join ' ')
}

# Runs a program without a window and returns its exit code and output (used for short probes).
function Invoke-Capture([string]$FilePath, [string[]]$Arguments = @(), [string]$WorkingDirectory = $script:RepoRoot) {
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $FilePath
    $info.Arguments = ConvertTo-ArgumentString $Arguments
    $info.WorkingDirectory = $WorkingDirectory
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    try { $process = [System.Diagnostics.Process]::Start($info) }
    catch { return [pscustomobject]@{ ExitCode = -1; Stdout = ''; Stderr = $_.Exception.Message } }
    $stderrTask = $process.StandardError.ReadToEndAsync()
    $stdout = $process.StandardOutput.ReadToEnd()
    $process.WaitForExit()
    return [pscustomobject]@{ ExitCode = $process.ExitCode; Stdout = $stdout.Trim(); Stderr = $stderrTask.Result.Trim() }
}

function Get-PythonInfo([string]$FilePath, [string[]]$Prefix = @()) {
    $result = Invoke-Capture $FilePath ($Prefix + @('-c', $script:PythonProbe))
    if ($result.ExitCode -ne 0) { return $null }
    $lines = @($result.Stdout -split "`r?`n")
    if ($lines.Count -lt 2) { return $null }
    try { $version = [version]$lines[0].Trim() } catch { return $null }
    return [pscustomobject]@{ Version = $version; Path = $lines[1].Trim() }
}

function Test-SupportedPython($Info) {
    return ($null -ne $Info) -and ($Info.Version -ge $script:MinPython) -and ($Info.Version -lt $script:MaxPythonExclusive)
}

# Finds an installed Python 3.10, 3.11 or 3.12 (py launcher first, then python.exe on PATH).
function Find-BasePython {
    $candidates = New-Object System.Collections.Generic.List[object]
    $launcher = Get-Command py.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($launcher) { foreach ($v in '3.12', '3.11', '3.10') { $candidates.Add(@($launcher.Source, "-$v")) } }
    foreach ($name in 'python.exe', 'python3.exe') {
        foreach ($command in @(Get-Command $name -CommandType Application -ErrorAction SilentlyContinue)) { $candidates.Add(@($command.Source)) }
    }
    if ($launcher) { $candidates.Add(@($launcher.Source)) }

    $found = New-Object System.Collections.Generic.List[object]
    foreach ($candidate in $candidates) {
        $prefix = @()
        if ($candidate.Count -gt 1) { $prefix = @($candidate[1..($candidate.Count - 1)]) }
        $info = Get-PythonInfo $candidate[0] $prefix
        if ($null -eq $info) { continue }
        if (Test-SupportedPython $info) { return [pscustomobject]@{ Selected = $info; Found = $found } }
        $found.Add($info)
    }
    return [pscustomobject]@{ Selected = $null; Found = $found }
}

function Stop-ForMissingPython($Found) {
    $versions = (@($Found | ForEach-Object { $_.Version.ToString() }) | Select-Object -Unique) -join ', '
    if ($versions) {
        Stop-WithError "Python $versions trouvé, mais la base de données intégrée demande Python 3.10, 3.11 ou 3.12." `
            "Python $versions found, but the embedded database needs Python 3.10, 3.11 or 3.12." `
            @('Installez Python 3.12 depuis https://www.python.org/downloads/ (cochez « Add python.exe to PATH »).',
              'Install Python 3.12 from https://www.python.org/downloads/ (tick "Add python.exe to PATH").',
              'Puis relancez start.bat. / Then run start.bat again.')
    }
    Stop-WithError 'Python est introuvable.' 'Python was not found.' `
        @('Installez Python 3.12 depuis https://www.python.org/downloads/ (cochez « Add python.exe to PATH »).',
          'Install Python 3.12 from https://www.python.org/downloads/ (tick "Add python.exe to PATH").',
          'Puis relancez start.bat. / Then run start.bat again.')
}

# Deepest file installed in the virtual environment (pgserver wheel):
#   Lib\site-packages\pgserver\pginstall\include\postgresql\server\snowball\libstemmer\stem_ISO_8859_1_indonesian.h
$script:DeepestVenvFileLength = 111

function Test-LongPathsEnabled {
    try { return ((Get-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem' -Name LongPathsEnabled -ErrorAction Stop).LongPathsEnabled -eq 1) }
    catch { return $false }
}

# Windows limits paths to 259 characters unless long paths are enabled: fail early with a clear message
# instead of a cryptic pip error when the project sits in a very deep folder.
function Assert-VenvPathFits([string]$VenvDir) {
    $total = $VenvDir.Length + 1 + $script:DeepestVenvFileLength
    if ($total -le 257 -or (Test-LongPathsEnabled)) { return }
    Stop-WithError "Le dossier du projet est trop profond pour Windows (chemins de $total caractères, maximum 259)." `
        "The project folder is too deep for Windows (paths of $total characters, maximum 259)." `
        @('Déplacez le dossier du projet vers un emplacement plus court, par exemple C:\portfolio, puis relancez start.bat.',
          'Move the project folder to a shorter location, for example C:\portfolio, then run start.bat again.')
}

# ------------------------------------------------------------------------------------------------------
# Network
# ------------------------------------------------------------------------------------------------------

# Returns $null when nothing listens on the port, otherwise a short description of the owner process.
function Get-PortOwner([int]$Port) {
    if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
        $connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if (-not $connection) { return $null }
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        if ($process) { return ('{0} (PID {1})' -f $process.ProcessName, $process.Id) }
        return ('PID {0}' -f $connection.OwningProcess)
    }
    foreach ($address in '127.0.0.1', '::1') {
        $family = ([System.Net.IPAddress]::Parse($address)).AddressFamily
        $client = New-Object System.Net.Sockets.TcpClient $family
        try {
            $pending = $client.BeginConnect($address, $Port, $null, $null)
            if ($pending.AsyncWaitHandle.WaitOne(400) -and $client.Connected) { return 'unknown program' }
        } catch { } finally { $client.Close() }
    }
    return $null
}

# Plain HTTP GET without proxy; returns $null when the server cannot be reached.
function Invoke-HttpGet([string]$Url, [int]$TimeoutMs = 4000) {
    $response = $null
    try {
        $request = [System.Net.HttpWebRequest]::Create($Url)
        $request.Timeout = $TimeoutMs
        $request.ReadWriteTimeout = $TimeoutMs
        $request.Proxy = $null
        $response = $request.GetResponse()
    } catch {
        $exception = $_.Exception
        while ($exception -and -not ($exception -is [System.Net.WebException])) { $exception = $exception.InnerException }
        if ($exception -and $exception.Response) { $response = $exception.Response } else { return $null }
    }
    try {
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        return [pscustomobject]@{ Status = [int]$response.StatusCode; Body = $reader.ReadToEnd() }
    } catch { return $null } finally { $response.Close() }
}

function Test-PortfolioApi([int]$Port) {
    $response = Invoke-HttpGet "http://127.0.0.1:$Port/api/health"
    return ($null -ne $response) -and ($response.Body -match '"service"\s*:\s*"portfolio-api"')
}

function Test-PortfolioSite([int]$Port) {
    $response = Invoke-HttpGet "http://localhost:$Port/"
    return ($null -ne $response) -and ($response.Status -eq 200) -and ($response.Body -match 'og:site_name')
}

# ------------------------------------------------------------------------------------------------------
# Launcher state (.local\pids.json): what start-windows.ps1 started, so that stop-windows.ps1 stops only that
# ------------------------------------------------------------------------------------------------------

function Get-StateFile([string]$DataDir) { Join-Path $DataDir 'pids.json' }

function Read-LauncherState([string]$DataDir) {
    $file = Get-StateFile $DataDir
    if (-not (Test-Path -LiteralPath $file)) { return @{} }
    try { $json = [System.IO.File]::ReadAllText($file) | ConvertFrom-Json } catch { return @{} }
    $state = @{}
    foreach ($property in $json.PSObject.Properties) { $state[$property.Name] = $property.Value }
    return $state
}

function Save-LauncherState([string]$DataDir, [hashtable]$State) {
    New-Item -ItemType Directory -Force -Path $DataDir | Out-Null
    $file = Get-StateFile $DataDir
    if ($State.Count -eq 0) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue; return }
    Write-Utf8File $file ($State | ConvertTo-Json -Depth 5)
}

function New-ProcessRecord([System.Diagnostics.Process]$Process, [int]$Port, [string]$Mode, [string]$Title) {
    $started = ''
    try { $started = $Process.StartTime.ToUniversalTime().ToString('o') } catch { }
    return [ordered]@{ pid = $Process.Id; started = $started; port = $Port; mode = $Mode; title = $Title }
}

# True when the recorded process still runs and is the same process (guards against PID reuse).
function Test-RecordAlive($Record) {
    if ($null -eq $Record -or -not $Record.pid) { return $false }
    $process = Get-Process -Id ([int]$Record.pid) -ErrorAction SilentlyContinue
    if (-not $process) { return $false }
    if (-not $Record.started) { return $true }
    try {
        $expected = [datetime]::Parse($Record.started, [System.Globalization.CultureInfo]::InvariantCulture,
            [System.Globalization.DateTimeStyles]::RoundtripKind)
        return [math]::Abs(($process.StartTime.ToUniversalTime() - $expected.ToUniversalTime()).TotalSeconds) -lt 2
    } catch { return $true }
}

# Stops a process and all its descendants (children first).
function Stop-ProcessTree([int]$ProcessId) {
    $processes = @(Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId, CreationDate -ErrorAction SilentlyContinue)
    $byId = @{}
    foreach ($process in $processes) { $byId[[int]$process.ProcessId] = $process }
    $children = @{}
    foreach ($process in $processes) {
        $parentId = [int]$process.ParentProcessId
        $parent = $byId[$parentId]
        # A child must be younger than its parent (protects against recycled parent PIDs).
        if ($parent -and $process.CreationDate -and $parent.CreationDate -and
            $process.CreationDate -ge $parent.CreationDate -and $parentId -ne [int]$process.ProcessId) {
            if (-not $children.ContainsKey($parentId)) { $children[$parentId] = New-Object System.Collections.Generic.List[int] }
            $children[$parentId].Add([int]$process.ProcessId)
        }
    }
    $ordered = New-Object System.Collections.Generic.List[int]
    $stack = New-Object System.Collections.Stack
    $stack.Push($ProcessId)
    while ($stack.Count -gt 0) {
        $id = [int]$stack.Pop()
        if ($ordered.Contains($id)) { continue }
        $ordered.Add($id)
        if ($children.ContainsKey($id)) { foreach ($child in $children[$id]) { $stack.Push($child) } }
    }
    for ($i = $ordered.Count - 1; $i -ge 0; $i--) {
        Stop-Process -Id $ordered[$i] -Force -ErrorAction SilentlyContinue
    }
}
