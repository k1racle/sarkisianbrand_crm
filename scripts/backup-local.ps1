param()
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$compose = @('compose','--env-file',(Join-Path $root '.env.local'),'-f',(Join-Path $root 'docker-compose.local.yml'))
function Invoke-LocalDocker([string[]]$Arguments) {
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed: $($Arguments[0])" }
}
$stamp = (Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
$destination = Join-Path $root "backups/local-$stamp"
[void](New-Item -ItemType Directory -Path $destination)
$dbContainer = (& docker @compose ps -q postgres).Trim()
if ($LASTEXITCODE -ne 0 -or !$dbContainer) { throw 'Local PostgreSQL is not running' }
$running = @(& docker @compose ps --status running --services)
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect local containers' }
$restartBackend = $running -contains 'backend'
$remote = "/tmp/crm-$stamp.dump"
try {
    # Quiesce this local application's writes while database and file volumes are copied.
    if ($restartBackend) { Invoke-LocalDocker ($compose + @('stop','backend')) }
    Invoke-LocalDocker ($compose + @('exec','-T','postgres','pg_dump','-U','postgres','-d','sarkisian_brand','-Fc','-f',$remote))
    Invoke-LocalDocker @('cp',"${dbContainer}:$remote",(Join-Path $destination 'database.dump'))
    foreach ($volume in @('uploads','crm_files')) {
        # Inspect first: Docker must not silently create a missing source volume.
        Invoke-LocalDocker @('volume','inspect',"sarkisian-crm-local_$volume",'--format','{{.Name}}')
        Invoke-LocalDocker @('run','--rm','--network','none','--mount',"type=volume,source=sarkisian-crm-local_$volume,target=/data,readonly",'--mount',"type=bind,source=$destination,target=/backup",'node:22-alpine','tar','-czf',"/backup/$volume.tar.gz",'-C','/data','.')
    }
    Copy-Item -LiteralPath (Join-Path $root '.env.local') -Destination (Join-Path $destination '.env.local')
    $files = @('database.dump','uploads.tar.gz','crm_files.tar.gz','.env.local') | ForEach-Object {
        $path = Join-Path $destination $_
        @{ name=$_; sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash; bytes=(Get-Item -LiteralPath $path).Length }
    }
    $manifest = @{ version=1; kind='sarkisian-crm-local'; createdAt=[DateTime]::UtcNow.ToString('o'); files=$files }
    [IO.File]::WriteAllText((Join-Path $destination 'manifest.json'),($manifest|ConvertTo-Json -Depth 5),[Text.UTF8Encoding]::new($false))
    Write-Output "Backup ready: $destination"
} finally {
    & docker exec $dbContainer rm -f $remote | Out-Null
    if ($restartBackend) { Invoke-LocalDocker ($compose + @('start','backend')) }
}
