#!/bin/bash

# Linux/Mac Cron Setup Script for Automated Warrant Scraper
# This script helps setup daily automated scraping on Linux/Mac

echo "========================================"
echo "Vietnamese Warrant Automated Scraper"
echo "Setup Script for Linux/Mac Cron"
echo "========================================"
echo ""

# Install dependencies
echo "Installing required Python packages..."
pip install schedule playwright pandas
python -m playwright install chromium

echo ""
echo "========================================"
echo "Setup Options:"
echo "========================================"
echo "1. Run scraper NOW (test)"
echo "2. Schedule daily at 2:00 AM (cron)"
echo "3. Schedule daily at custom time (cron)"
echo "4. Run as background service"
echo "5. Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "Running scraper immediately..."
        python automated_daily_scraper.py --now
        ;;
    2)
        echo ""
        echo "Adding cron job for 2:00 AM daily..."
        SCRIPT_PATH="$(pwd)/automated_daily_scraper.py"
        PYTHON_PATH="$(which python)"
        
        # Add cron job
        (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && $PYTHON_PATH $SCRIPT_PATH --once >> scraper_logs/cron.log 2>&1") | crontab -
        
        echo "✅ Cron job added successfully!"
        echo "Schedule: Daily at 2:00 AM"
        echo ""
        echo "To view cron jobs: crontab -l"
        echo "To remove: crontab -e (then delete the line)"
        ;;
    3)
        echo ""
        read -p "Enter hour (0-23): " hour
        read -p "Enter minute (0-59): " minute
        
        echo "Adding cron job for $hour:$minute daily..."
        SCRIPT_PATH="$(pwd)/automated_daily_scraper.py"
        PYTHON_PATH="$(which python)"
        
        # Add cron job
        (crontab -l 2>/dev/null; echo "$minute $hour * * * cd $(pwd) && $PYTHON_PATH $SCRIPT_PATH --once >> scraper_logs/cron.log 2>&1") | crontab -
        
        echo "✅ Cron job added successfully!"
        echo "Schedule: Daily at $hour:$minute"
        ;;
    4)
        echo ""
        echo "Running as background service..."
        nohup python automated_daily_scraper.py --time 02:00 > scraper_logs/service.log 2>&1 &
        echo "✅ Background service started!"
        echo "Process ID: $!"
        echo "Log file: scraper_logs/service.log"
        echo ""
        echo "To stop: kill $!"
        ;;
    5)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Script completed!"

