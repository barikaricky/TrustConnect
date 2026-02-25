@echo off
echo ========================================
echo TrustConnect - Ngrok Setup (Best Practice)
echo ========================================
echo.
echo This will set up a secure tunnel so your phone
echo can connect from ANYWHERE (no WiFi/firewall issues)
echo.

REM Check if ngrok is installed
where ngrok >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Ngrok is already installed!
    echo.
    goto :start_tunnel
)

echo [INFO] Ngrok not found. Installing...
echo.
echo Please visit: https://ngrok.com/download
echo.
echo Instructions:
echo 1. Download ngrok for Windows
echo 2. Extract to any folder
echo 3. Add to PATH or place in this directory
echo.
echo After installation, run this script again.
echo.
pause
exit /b 1

:start_tunnel
echo [INFO] Starting ngrok tunnel...
echo.
echo This will create a public URL like: https://xxxx-xx-xx-xx.ngrok-free.app
echo Your phone will use this URL to connect to your backend.
echo.
echo Press Ctrl+C to stop the tunnel when done testing.
echo.
timeout /t 3 /nobreak >nul

REM Start ngrok tunnel for port 3000
ngrok http 3000 --log=stdout
