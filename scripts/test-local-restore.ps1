param([Parameter(Mandatory=$true)][string]$BackupPath)
$ErrorActionPreference = 'Stop'
$backup = (Resolve-Path -LiteralPath $BackupPath).Path
$manifest = Get-Content -LiteralPath (Join-Path $backup 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($manifest.version -ne 1 -or $manifest.kind -ne 'sarkisian-crm-local') { throw 'Unsupported backup manifest' }
foreach ($name in @('database.dump','uploads.tar.gz','crm_files.tar.gz','.env.local')) {
    $entries = @($manifest.files | Where-Object { $_.name -eq $name })
    if ($entries.Count -ne 1) { throw "Missing or duplicate manifest entry: $name" }
    if ((Get-FileHash -LiteralPath (Join-Path $backup $name) -Algorithm SHA256).Hash -ne $entries[0].sha256) { throw "Checksum mismatch: $name" }
}
function Invoke-LocalDocker([string[]]$Arguments) {
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Docker command failed: $($Arguments[0])" }
}
$name = 'crm-restore-check-' + [Guid]::NewGuid().ToString('N')
$created = $false
try {
    # No published ports, no application connection and no production volume.
    Invoke-LocalDocker @('run','-d','--name',$name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=restore_check','postgres:15-alpine')
    $created = $true
    $ready = $false
    for ($i=0; $i -lt 30; $i++) {
        & docker exec $name pg_isready -U postgres -d restore_check *> $null
        if ($LASTEXITCODE -eq 0) { $ready=$true; break }
        Start-Sleep -Seconds 1
    }
    if (!$ready) { throw 'Restore test PostgreSQL did not start' }
    Invoke-LocalDocker @('cp',(Join-Path $backup 'database.dump'),"${name}:/tmp/database.dump")
    Invoke-LocalDocker @('exec',$name,'pg_restore','--exit-on-error','--no-owner','-U','postgres','-d','restore_check','/tmp/database.dump')
    # Validate restored table constraints and core records without printing personal data.
    Invoke-LocalDocker @('exec',$name,'psql','-U','postgres','-d','restore_check','-v','ON_ERROR_STOP=1','-c','SELECT count(*) AS tables_restored FROM information_schema.tables WHERE table_schema=''public'';')
    foreach ($volume in @('uploads','crm_files')) {
        Invoke-LocalDocker @('run','--rm','--network','none','--tmpfs','/restore','--mount',"type=bind,source=$backup,target=/backup,readonly",'node:22-alpine','tar','-xzf',"/backup/$volume.tar.gz",'-C','/restore')
    }
    $report = @{ verifiedAt=[DateTime]::UtcNow.ToString('o'); database='Restored successfully with pg_restore --exit-on-error'; fileVolumes='Both archives extracted successfully'; sourceUntouched=$true }
    [IO.File]::WriteAllText((Join-Path $backup 'restore-check.json'),($report|ConvertTo-Json),[Text.UTF8Encoding]::new($false))
    Write-Output 'PASS: database and both file archives restored in isolated temporary containers.'
} finally {
    if ($created) { Invoke-LocalDocker @('rm','-f',$name) }
}
