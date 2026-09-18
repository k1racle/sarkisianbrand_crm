# Starts independent hidden Windows processes, not temporary terminal sessions.
# No migrations, seeds, credentials or external integration checks are performed.
$ErrorActionPreference = 'Stop'
$localWorkspaceRoot = Split-Path -Parent $PSScriptRoot
$localBackendRoot = Join-Path $localWorkspaceRoot 'backend'
$localFrontendRoot = Join-Path $localWorkspaceRoot 'frontend'
$localLogRoot = Join-Path $localWorkspaceRoot '.screenshots/local-services'
$localRunId = [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0, 8)

function Test-LocalServicePort([int]$Port) {
    $localSocket = New-Object System.Net.Sockets.TcpClient
    try { return $localSocket.ConnectAsync('127.0.0.1', $Port).Wait(300) -and $localSocket.Connected }
    catch { return $false }
    finally { $localSocket.Dispose() }
}

function Start-LocalService([string]$Label, [int]$Port, [string]$Executable, [string[]]$Arguments, [string]$WorkingDirectory) {
    if (Test-LocalServicePort $Port) {
        return [pscustomobject]@{ Service = $Label; Port = $Port; ProcessId = $null; State = 'Already running; unchanged' }
    }
    $localStdout = Join-Path $localLogRoot "$localRunId-$Label.log"
    $localStderr = Join-Path $localLogRoot "$localRunId-$Label-error.log"
    $localProcess = Start-Process -FilePath $Executable -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -RedirectStandardOutput $localStdout -RedirectStandardError $localStderr -PassThru
    $localStartupWatch = [Diagnostics.Stopwatch]::StartNew()
    while (-not (Test-LocalServicePort $Port)) {
        if ($localProcess.HasExited -or $localStartupWatch.Elapsed.TotalSeconds -gt 60) {
            throw "$Label did not start. Check $localStdout and $localStderr"
        }
        Start-Sleep -Milliseconds 200
    }
    return [pscustomobject]@{ Service = $Label; Port = $Port; ProcessId = $localProcess.Id; State = 'Started in background' }
}

if (-not (Test-LocalServicePort 5432)) { throw 'Start your existing local PostgreSQL service on port 5432 first. This script never creates a database.' }
foreach ($localArtifact in @((Join-Path $localBackendRoot 'dist/src/main.js'), (Join-Path $localFrontendRoot '.output/server/index.mjs'))) {
    if (-not (Test-Path -LiteralPath $localArtifact)) { throw "Build backend and frontend first. Missing: $localArtifact" }
}
$localNodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$localRedisExecutable = (Get-Command redis-server.exe -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $localLogRoot -Force | Out-Null

# Preserve the existing queue snapshot. Redis continues in the same directory;
# nothing is flushed, discarded or moved to an empty Redis database.
$localRedisSnapshot = Join-Path $localWorkspaceRoot 'dump.rdb'
if (-not (Test-LocalServicePort 6379) -and (Test-Path -LiteralPath $localRedisSnapshot)) {
    Copy-Item -LiteralPath $localRedisSnapshot -Destination (Join-Path $localLogRoot "$localRunId-redis-snapshot.rdb")
}
Start-LocalService 'redis' 6379 $localRedisExecutable @('--bind', '127.0.0.1', '--port', '6379') $localWorkspaceRoot

$localProcessEnvironment = @{
    NODE_ENV = 'production'; SITE_URL = 'http://localhost:3001'; SEO_INDEXING_ENABLED = 'false';
    CORS_ORIGIN = 'http://localhost:3001,http://127.0.0.1:3001';
    ECOSYSTEM_AUTOMATION_ENABLED = 'false'; STOREFRONT_EXTERNAL_CALLS_ENABLED = 'false';
    MAIL_DELIVERY_ENABLED = 'false'; LOYALTY_MAINTENANCE_ENABLED = 'false';
    REDIS_URL = 'redis://127.0.0.1:6379';
    NUXT_PUBLIC_API_BASE = 'http://localhost:3000/api/v1'; NUXT_SEO_API_BASE = 'http://localhost:3000/api/v1';
    NUXT_PUBLIC_SITE_URL = 'http://localhost:3001'; NUXT_PUBLIC_SEO_INDEXING_ENABLED = 'false';
    PORT = '3000'; HOST = '0.0.0.0';
}
$localOriginalEnvironment = @{}
try {
    foreach ($localEnvironmentKey in $localProcessEnvironment.Keys) {
        $localOriginalEnvironment[$localEnvironmentKey] = [Environment]::GetEnvironmentVariable($localEnvironmentKey, 'Process')
        [Environment]::SetEnvironmentVariable($localEnvironmentKey, $localProcessEnvironment[$localEnvironmentKey], 'Process')
    }
    Start-LocalService 'backend' 3000 $localNodeExecutable @('dist/src/main.js') $localBackendRoot
    [Environment]::SetEnvironmentVariable('PORT', '3001', 'Process')
    Start-LocalService 'frontend' 3001 $localNodeExecutable @('.output/server/index.mjs') $localFrontendRoot
}
finally {
    foreach ($localEnvironmentKey in $localOriginalEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($localEnvironmentKey, $localOriginalEnvironment[$localEnvironmentKey], 'Process')
    }
}
