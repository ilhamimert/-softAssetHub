# iSoft AssetHub - Otomatik Baslat
$root = 'C:\Users\ILHAMI~1\Desktop\SOFTAS~2'

# Backend
Start-Process 'cmd' -ArgumentList '/k', "cd /d `"$root\backend`" && node --max-old-space-size=4096 server.js" -WindowStyle Minimized

Start-Sleep -Seconds 4

# Frontend
Start-Process 'cmd' -ArgumentList '/k', "cd /d `"$root\frontend`" && npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 5

# Hierarchy-Web
Start-Process 'cmd' -ArgumentList '/k', "cd /d `"$root\hierarchy-web`" && dotnet run --urls http://localhost:5050" -WindowStyle Minimized

Start-Sleep -Seconds 10

# Tarayici ac
Start-Process 'http://localhost:3000'
