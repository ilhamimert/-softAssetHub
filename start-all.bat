@echo off
title iSoft AssetHub - Servisler Baslatiliyor...

:: Backend (Node.js)
start "AssetHub Backend" /MIN cmd /k "cd /d "C:\Users\ilhami mert ye┼Ÿil├Âz\Desktop\─░softAssetHub\backend" && node --max-old-space-size=4096 server.js"

:: 3 saniye bekle (backend DB baglantisi kursun)
timeout /t 3 /nobreak >nul

:: Frontend (Vite)
start "AssetHub Frontend" /MIN cmd /k "cd /d "C:\Users\ilhami mert ye┼Ÿil├Âz\Desktop\─░softAssetHub\frontend" && npm run dev"

:: 5 saniye bekle
timeout /t 5 /nobreak >nul

:: Hierarchy-Web (ASP.NET Core)
start "AssetHub Hierarchy" /MIN cmd /k "cd /d "C:\Users\ilhami mert ye┼Ÿil├Âz\Desktop\─░softAssetHub\hierarchy-web" && dotnet run --urls "http://localhost:5050""

:: Tarayici ac
timeout /t 8 /nobreak >nul
start "" "http://localhost:3000"

exit
