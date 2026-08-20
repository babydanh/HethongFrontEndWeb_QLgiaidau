$patterns = @('Người dùng & phân quyền','system-roles','updateSystemRoles','Tất cả vai trò','ORGANIZER','MODERATOR')
Get-ChildItem -Path (Join-Path $PSScriptRoot 'src') -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx |
  Select-String -Pattern $patterns -CaseSensitive:$false |
  Where-Object { $_.Path -notmatch '\\node_modules\\' } |
  ForEach-Object { "{0}:{1}:{2}" -f $_.Path, $_.LineNumber, $_.Line.Trim() }
