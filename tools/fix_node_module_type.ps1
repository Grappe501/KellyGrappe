Write-Host ""
Write-Host "======================================"
Write-Host "Fixing Node Module Type"
Write-Host "======================================"

$packagePath = Join-Path (Get-Location) "package.json"

if (!(Test-Path $packagePath)) {
    Write-Host "package.json not found."
    exit
}

Write-Host "Reading package.json..."

$package = Get-Content $packagePath -Raw | ConvertFrom-Json

if ($package.type -eq "module") {

    Write-Host "type: module already set."
    exit

}

Write-Host "Adding type: module"

$package | Add-Member -NotePropertyName type -NotePropertyValue "module" -Force

$package |
    ConvertTo-Json -Depth 10 |
    Set-Content $packagePath

Write-Host ""
Write-Host "package.json updated successfully."
Write-Host ""
Write-Host "You can now rerun your scripts without warnings."
Write-Host ""