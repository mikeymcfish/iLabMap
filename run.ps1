$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    $env:UV_PYTHON_INSTALL_DIR = Join-Path $PSScriptRoot '.runtime\python'
    uv --cache-dir .runtime/cache sync --locked
    if ($LASTEXITCODE -ne 0) { throw 'Dependency setup failed.' }
}
& .\.venv\Scripts\python.exe -m flask --app app:create_app init-db
if ($LASTEXITCODE -ne 0) { throw 'Database setup failed.' }
& .\.venv\Scripts\python.exe -m flask --app app:create_app import-recovery
if ($LASTEXITCODE -ne 0) { throw 'Recovery import failed.' }
Write-Host 'Staff password: instance\admin-password.txt'
Write-Host 'Local app: http://127.0.0.1:5015'
& .\.venv\Scripts\python.exe main.py
