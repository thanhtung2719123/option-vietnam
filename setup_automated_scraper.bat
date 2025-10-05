@echo off
REM Windows Task Scheduler Setup Script for Automated Warrant Scraper
REM This script helps setup daily automated scraping on Windows

echo ========================================
echo Vietnamese Warrant Automated Scraper
echo Setup Script for Windows Task Scheduler
echo ========================================
echo.

echo Installing required Python packages...
pip install schedule playwright pandas
python -m playwright install chromium

echo.
echo ========================================
echo Setup Options:
echo ========================================
echo 1. Run scraper NOW (test)
echo 2. Schedule daily at 2:00 AM
echo 3. Schedule daily at custom time
echo 4. Create Windows Task Scheduler entry
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo.
    echo Running scraper immediately...
    python automated_daily_scraper.py --now
    pause
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo Scheduling daily scraper at 2:00 AM...
    python automated_daily_scraper.py --time 02:00
    goto :end
)

if "%choice%"=="3" (
    set /p custom_time="Enter time (HH:MM format, e.g., 03:30): "
    echo.
    echo Scheduling daily scraper at %custom_time%...
    python automated_daily_scraper.py --time %custom_time%
    goto :end
)

if "%choice%"=="4" (
    echo.
    echo Creating Windows Task Scheduler entry...
    echo.
    
    set /p task_time="Enter time (HH:MM format, e.g., 02:00): "
    
    REM Get current directory
    set "SCRIPT_DIR=%cd%"
    set "PYTHON_PATH=%~dp0..\..\..\python.exe"
    
    REM Create scheduled task
    schtasks /create /tn "VietnameseWarrantScraper" /tr "python \"%SCRIPT_DIR%\automated_daily_scraper.py\" --once" /sc daily /st %task_time% /f
    
    if %errorlevel%==0 (
        echo.
        echo ✅ Scheduled task created successfully!
        echo Task name: VietnameseWarrantScraper
        echo Schedule: Daily at %task_time%
        echo.
        echo To manage the task:
        echo - View: taskschd.msc
        echo - Delete: schtasks /delete /tn "VietnameseWarrantScraper" /f
    ) else (
        echo.
        echo ❌ Failed to create scheduled task
        echo You may need to run this script as Administrator
    )
    
    pause
    goto :end
)

:end
echo.
echo Script completed!

