$root = 'D:\Duancanhan\Project_QuanLyGiaiDau\HethongFrontEndWeb_QLgiaidau\src'
$patterns = @('scheduledAt','scheduledDate','startTime','matchDate','matchTime','updateMatch','bracket','schedule')
$items = Get-ChildItem -Path $root -Recurse -File -Include *.ts,*.tsx |
  Where-Object { $_.FullName -match 'tournament|bracket|match|manage|organizer|admin' }
$items |
  Select-String -Pattern $patterns -CaseSensitive:$false |
  ForEach-Object { '{0}:{1}:{2}' -f $_.Path, $_.LineNumber, $_.Line.Trim() } |
  Out-File -Encoding utf8 'D:\Duancanhan\Project_QuanLyGiaiDau\bracket-manager-search.txt'
