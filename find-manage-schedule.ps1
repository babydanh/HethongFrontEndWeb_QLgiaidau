$root = 'D:\Duancanhan\Project_QuanLyGiaiDau\HethongFrontEndWeb_QLgiaidau\src'
$paths = Get-ChildItem -Path $root -Recurse -File -Include *.ts,*.tsx | Where-Object { $_.FullName -match 'admin|organizer|manage|management|bracket' }
$patterns = @('scheduledAt','scheduledDate','startTime','matchDate','matchTime','schedule','set.*time','date.*time')
$paths | Select-String -Pattern $patterns -CaseSensitive:$false | ForEach-Object { '{0}:{1}:{2}' -f $_.Path, $_.LineNumber, $_.Line.Trim() } | Out-File -Encoding utf8 'D:\Duancanhan\Project_QuanLyGiaiDau\manage-schedule-search.txt'
