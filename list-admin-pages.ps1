Get-ChildItem -Path (Join-Path $PSScriptRoot 'src/app/admin') -Recurse -File -Include *.ts,*.tsx |
  ForEach-Object { $_.FullName }
