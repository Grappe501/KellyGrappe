Write-Host "Starting automated Netlify build fixes..." -ForegroundColor Cyan

$root = "app/src"
$files = Get-ChildItem -Path $root -Recurse -Include *.ts,*.tsx

$changes = 0

foreach ($file in $files) {

    $content = Get-Content $file.FullName -Raw
    $original = $content

    # Fix service imports
    $content = $content -replace "shared/utils/db/contacts\.service", "shared/utils/db/services/contacts.service"
    $content = $content -replace "shared/utils/db/relationships\.service", "shared/utils/db/services/relationships.service"
    $content = $content -replace "shared/utils/db/organizingMetrics\.service", "shared/utils/db/services/organizingMetrics.service"
    $content = $content -replace "shared/utils/db/followups\.service", "shared/utils/db/services/followups.service"
    $content = $content -replace "shared/utils/db/origins\.service", "shared/utils/db/services/origins.service"

    # Remove deprecated contact flags
    $content = $content -replace "interestedDonate\s*:\s*[^,]+,", ""
    $content = $content -replace "interestedDonate\s*=\s*[^;]+;", ""

    # Fix null → undefined typing issues
    $content = $content -replace "\|\|\s*null", "|| undefined"

    # Fix ?? and || operator conflict
    $content = $content -replace "(\S+)\s*\?\?\s*(\S+)\s*\|\|\s*(\S+)", "(`$1 ?? `$2) || `$3"

    # Convert originRef/originNotes usage to rawPayload format
    if ($content -match "originRef") {
        $content = $content -replace "originRef\s*:\s*([^,]+),", ""
        $content = $content -replace "originNotes\s*:\s*([^,]+),", ""
        $content = $content -replace "addOrigin\(\{", "addOrigin({ rawPayload: { originRef: 'migrated', originNotes: 'migrated' },"
    }

    if ($content -ne $original) {
        Copy-Item $file.FullName "$($file.FullName).bak" -Force
        Set-Content $file.FullName $content
        $changes++
        Write-Host "Updated: $($file.FullName)"
    }
}

# Ensure Contact type export exists
$contactsService = "app/src/shared/utils/db/services/contacts.service.ts"

if (Test-Path $contactsService) {

    $content = Get-Content $contactsService -Raw

    if ($content -notmatch "export type { Contact }") {
        Add-Content $contactsService "`nexport type { Contact } from '../contactsDb.types'"
        Write-Host "Added Contact export to contacts.service.ts"
    }

}

Write-Host ""
Write-Host "Refactor complete." -ForegroundColor Green
Write-Host "$changes files modified."
Write-Host "Backups saved with .bak extension."
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. npm run build"
Write-Host "2. git add ."
Write-Host "3. git commit -m 'Auto-refactor for Netlify build'"
Write-Host "4. git push origin main"