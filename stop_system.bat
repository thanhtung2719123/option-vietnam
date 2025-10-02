@echo off
echo ========================================
echo   STOPPING VIETNAM WARRANT SYSTEM
echo ========================================
echo.

color 0C

echo 🛑 Stopping all system processes...
echo.

echo [1/3] 🔥 Killing Python processes (Backend)...
taskkill /f /im python.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️ No Python processes found
) else (
    echo ✅ Python processes stopped
)

echo.
echo [2/3] 🔥 Killing Node.js processes (Frontend)...
taskkill /f /im node.exe >nul 2>&1
if errorlevel 1 (
    echo ⚠️ No Node.js processes found
) else (
    echo ✅ Node.js processes stopped
)

echo.
echo [3/3] 🔥 Killing any remaining processes on ports 3000 and 8001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8001') do taskkill /f /pid %%a >nul 2>&1
echo ✅ Port cleanup completed

echo.
echo ✅ Vietnam Warrant Trading System stopped!
echo.
echo 💡 All servers have been terminated.
echo    You can now restart the system using start_system.bat
echo.
pause 