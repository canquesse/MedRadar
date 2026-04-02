@echo off
chcp 65001 > nul
title MedTech Digest

cd /d "%~dp0"
echo.
echo  Medtech Digest baslatiliyor...
echo.

REM Ollama çalışıyor mu?
curl -s http://localhost:11434 > nul 2>&1
if errorlevel 1 (
  echo  Ollama baslatiliyor...
  start "" "C:\Users\%USERNAME%\AppData\Local\Programs\Ollama\ollama.exe"
  timeout /t 4 /nobreak > nul
)

REM Model var mi? (qwen2.5:3b - llama3.2:3b'den cok daha iyi Turkce)
ollama list 2>nul | findstr "qwen2.5:3b" > nul
if errorlevel 1 (
  echo  AI modeli indiriliyor - ilk kurulum ~2GB, bekleyiniz...
  ollama pull qwen2.5:3b
)

echo  Server baslatiliyor...
start /b npm start

timeout /t 3 /nobreak > nul
echo  Tarayici aciliyor...
start http://localhost:3000

echo.
echo  Hazir! Bu pencereyi acik birakin.
echo  Kapatmak icin bu pencereyi kapatin.
echo.
pause
