@echo off
echo ========================================
echo TrustConnect Android Connection Setup
echo ========================================
echo.

REM Try to find ADB in common Android SDK locations
set ADB_PATH=

if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
) else if exist "%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe
) else if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=C:\Users\%USERNAME%\AppData\Local\Android\Sdk\platform-tools\adb.exe
) else (
    echo [ERROR] ADB not found in common locations
    echo.
    echo Please install Android Studio or Android SDK Platform Tools
    echo Download from: https://developer.android.com/tools/releases/platform-tools
    echo.
    pause
    exit /b 1
)

echo [INFO] Found ADB at: %ADB_PATH%
echo.

echo [1/3] Checking connected devices...
"%ADB_PATH%" devices
echo.

echo [2/3] Setting up port forwarding (port 3000)...
"%ADB_PATH%" reverse tcp:3000 tcp:3000

if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Port 3000 forwarded successfully!
    echo.
    echo The Android emulator can now access your backend at:
    echo   http://localhost:3000/api
    echo.
) else (
    echo [ERROR] Failed to setup port forwarding
    echo.
    echo Make sure:
    echo   1. Android emulator is running
    echo   2. USB debugging is enabled
    echo   3. Device is connected via ADB
    echo.
)

echo [3/3] Connection Status:
"%ADB_PATH%" reverse --list
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo You can now test the mobile app.
echo Press any key to exit...
pause >nul
