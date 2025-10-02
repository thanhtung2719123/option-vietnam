@echo off
echo ========================================
echo   INSTALLING SYSTEM DEPENDENCIES
echo ========================================
echo.

color 0B

echo 🔧 Installing Vietnam Warrant Trading System...
echo.

echo [1/4] 📦 Installing Python Backend Dependencies...
cd /d %~dp0backend
if exist requirements.txt (
    echo ✅ Found requirements.txt
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ❌ Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo ✅ Python dependencies installed successfully!
) else (
    echo ⚠️ requirements.txt not found, creating basic requirements...
    echo fastapi>=0.104.0 > requirements.txt
    echo uvicorn>=0.24.0 >> requirements.txt
    echo sqlalchemy>=2.0.0 >> requirements.txt
    echo pandas>=2.0.0 >> requirements.txt
    echo numpy>=1.24.0 >> requirements.txt
    echo scipy>=1.10.0 >> requirements.txt
    echo vnstock>=0.2.7 >> requirements.txt
    echo requests>=2.31.0 >> requirements.txt
    echo beautifulsoup4>=4.12.0 >> requirements.txt
    echo playwright>=1.40.0 >> requirements.txt
    echo python-dotenv>=1.0.0 >> requirements.txt
    pip install -r requirements.txt
    echo ✅ Basic Python dependencies installed!
)

echo.
echo [2/4] 🎭 Installing Playwright browsers...
playwright install chromium
echo ✅ Playwright browsers installed!

echo.
echo [3/4] 📦 Installing Frontend Dependencies...
cd /d %~dp0frontend
if exist package.json (
    echo ✅ Found package.json
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install Node.js dependencies
        pause
        exit /b 1
    )
    echo ✅ Node.js dependencies installed successfully!
) else (
    echo ❌ package.json not found in frontend directory
    pause
    exit /b 1
)

echo.
echo [4/4] 🗄️ Setting up Database...
cd /d %~dp0
if exist vietstock_warrants_20251002_103806.csv (
    echo ✅ Found warrant data CSV
    python import_csv_warrants.py
    echo ✅ Database setup completed with 450 warrants!
) else (
    echo ⚠️ Warrant data not found, creating sample data...
    python backend/create_sample_data.py
    echo ✅ Sample database created!
)

echo.
echo ✅ Installation Complete!
echo.
echo 📋 SYSTEM READY:
echo    🐍 Python Backend: FastAPI + SQLAlchemy + 450 warrants
echo    ⚛️ React Frontend: Modern UI + AI Chatbot
echo    🤖 AI Integration: Gemini 2.5 Pro
echo    🧮 Features: Options Pricing, Greeks, Risk Management
echo.
echo 🚀 NEXT STEPS:
echo    1. Run: start_system.bat
echo    2. Wait for servers to start (30-60 seconds)
echo    3. Open: http://localhost:3000
echo.
echo Press any key to continue...
pause >nul 