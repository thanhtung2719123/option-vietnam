@echo off
echo ========================================
echo    VIETNAM WARRANT TRADING SYSTEM
echo ========================================
echo.

REM Set colors
color 0A

echo [1/4] 🔧 Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found! Please install Python first.
    pause
    exit /b 1
)
echo ✅ Python found!

echo.
echo [2/4] 🔧 Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js found!

echo.
echo [3/4] 🚀 Starting Backend Server (FastAPI)...
echo    📍 Backend will run on: http://localhost:8001
echo    📊 Database: SQLite (450 warrants loaded)
echo    🧮 Features: Options Pricing, Greeks, Risk Management
echo.

REM Start backend in new window
start "Vietnam Warrant Backend" cmd /k "cd /d %~dp0backend & echo 🔥 Starting FastAPI Backend... & python main.py"

REM Wait a bit for backend to start
timeout /t 5 /nobreak >nul

echo.
echo [4/4] 🌐 Starting Frontend Server (React)...
echo    📍 Frontend will run on: http://localhost:3000
echo    🤖 Features: AI Chatbot (Gemini 2.5 Pro), Greeks Calculator
echo.

REM Start frontend in new window
start "Vietnam Warrant Frontend" cmd /k "cd /d %~dp0frontend & echo 🔥 Starting React Frontend... & npm start"

echo.
echo ✅ System Starting Complete!
echo.
echo 📋 SYSTEM OVERVIEW:
echo    🔗 Backend API:  http://localhost:8001
echo    🌐 Frontend UI:  http://localhost:3000
echo    📊 Database:     SQLite (450 warrants)
echo    🤖 AI Chatbot:   Gemini 2.5 Pro integrated
echo.
echo 💡 USAGE:
echo    - Wait for both servers to fully start (30-60 seconds)
echo    - Open browser to http://localhost:3000
echo    - Use AI chatbot for Greeks explanations
echo    - Calculate options pricing and risk metrics
echo.
echo 🛑 TO STOP: Close both terminal windows or press Ctrl+C in each
echo.
echo Press any key to open the frontend in your browser...
pause >nul

REM Open browser after a delay
timeout /t 10 /nobreak >nul
start http://localhost:3000

echo.
echo 🎉 Vietnam Warrant Trading System is now running!
echo    Check the terminal windows for server logs.
echo.
pause 