$root = 'D:\Duancanhan\Project_QuanLyGiaiDau\HethongFrontEndWeb_QLgiaidau\src'
Get-ChildItem -Path $root -Recurse -File -Include '*.tsx','*.ts' |
  Where-Object { $_.FullName -match '(profile|settings|account)' } |
  Select-Object -ExpandProperty FullName |
  Set-Content -Encoding utf8 'D:\Duancanhan\Project_QuanLyGiaiDau\HethongFrontEndWeb_QLgiaidau\.web-profile-inventory-final.txt'
