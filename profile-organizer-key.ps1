$p = Join-Path $PSScriptRoot 'src/app/(player)/profile/page.tsx'
Select-String -Path $p -Pattern 'tickets|requestOrganizer|organizer|isEmailVerified|verification' -CaseSensitive:$false -Context 3,5 |
  Out-File -Encoding utf8 (Join-Path $PSScriptRoot 'profile-organizer-key.txt')
