"""
Automated Daily Warrant Data Scraper
Runs daily to update warrant database with latest market data from Vietstock

Features:
- Automated daily scraping at configured time
- Imports new data directly to database
- Logs all activities
- Error handling and recovery
- Can be scheduled with cron/Task Scheduler
"""

import asyncio
import schedule
import time
import logging
from datetime import datetime
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(__file__))

from scrape_warrants_playwright import VietstockWarrantScraper
from import_csv_warrants import import_warrants_from_csv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'scraper_logs/warrant_scraper_{datetime.now().strftime("%Y%m")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class AutomatedWarrantScraper:
    """Automated warrant scraper that runs daily"""
    
    def __init__(self, scheduled_time="02:00"):
        """
        Initialize automated scraper
        
        Args:
            scheduled_time: Time to run scraper daily (24h format, e.g., "02:00")
        """
        self.scheduled_time = scheduled_time
        self.last_run = None
        self.run_count = 0
        
        # Create logs directory
        os.makedirs('scraper_logs', exist_ok=True)
        
        logger.info(f"🤖 Automated Warrant Scraper initialized")
        logger.info(f"⏰ Scheduled to run daily at {scheduled_time}")
    
    async def run_scraping_job(self):
        """Execute the full scraping and import job"""
        try:
            logger.info("=" * 60)
            logger.info(f"🚀 Starting automated warrant scraping job #{self.run_count + 1}")
            logger.info(f"📅 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            logger.info("=" * 60)
            
            # Step 1: Scrape warrants from Vietstock
            logger.info("📊 Step 1: Scraping warrants from Vietstock...")
            scraper = VietstockWarrantScraper()
            warrants = await scraper.scrape_all_warrants()
            
            if not warrants:
                logger.error("❌ No warrants scraped! Aborting job.")
                return False
            
            logger.info(f"✅ Successfully scraped {len(warrants)} warrants")
            
            # Step 2: Save to CSV
            logger.info("💾 Step 2: Saving to CSV...")
            csv_filename = scraper.save_to_csv()
            
            if not csv_filename:
                logger.error("❌ Failed to save CSV! Aborting job.")
                return False
            
            logger.info(f"✅ Saved to: {csv_filename}")
            
            # Step 3: Import to database
            logger.info("🗄️ Step 3: Importing to database...")
            imported_count = import_warrants_from_csv(csv_filename)
            
            if imported_count == 0:
                logger.error("❌ No warrants imported to database!")
                return False
            
            logger.info(f"✅ Imported {imported_count} warrants to database")
            
            # Step 4: Cleanup old CSV files (keep last 7 days)
            logger.info("🧹 Step 4: Cleaning up old files...")
            self._cleanup_old_files(days_to_keep=7)
            
            # Update tracking variables
            self.last_run = datetime.now()
            self.run_count += 1
            
            logger.info("=" * 60)
            logger.info(f"✅ Automated scraping job completed successfully!")
            logger.info(f"📊 Scraped: {len(warrants)} warrants")
            logger.info(f"💾 Imported: {imported_count} warrants")
            logger.info(f"⏱️ Duration: {(datetime.now() - self.last_run).seconds if self.last_run else 0}s")
            logger.info("=" * 60)
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error in scraping job: {e}", exc_info=True)
            return False
    
    def _cleanup_old_files(self, days_to_keep=7):
        """Clean up old CSV files to save disk space"""
        try:
            import os
            from datetime import timedelta
            
            cutoff_date = datetime.now() - timedelta(days=days_to_keep)
            cleaned_count = 0
            
            for filename in os.listdir('.'):
                if filename.startswith('vietstock_warrants_') and filename.endswith('.csv'):
                    try:
                        # Extract date from filename
                        date_str = filename.split('_')[2][:8]  # YYYYMMDD
                        file_date = datetime.strptime(date_str, '%Y%m%d')
                        
                        if file_date < cutoff_date:
                            os.remove(filename)
                            cleaned_count += 1
                            logger.info(f"🗑️ Deleted old file: {filename}")
                    except:
                        continue
            
            if cleaned_count > 0:
                logger.info(f"✅ Cleaned up {cleaned_count} old CSV files")
            else:
                logger.info("✅ No old files to clean up")
                
        except Exception as e:
            logger.warning(f"⚠️ Error during cleanup: {e}")
    
    def schedule_job(self):
        """Schedule the scraping job to run daily"""
        schedule.every().day.at(self.scheduled_time).do(
            lambda: asyncio.run(self.run_scraping_job())
        )
        logger.info(f"✅ Job scheduled to run daily at {self.scheduled_time}")
    
    def run_immediately(self):
        """Run the scraping job immediately (for testing)"""
        logger.info("🚀 Running scraping job immediately...")
        asyncio.run(self.run_scraping_job())
    
    def start_scheduler(self):
        """Start the scheduler (blocks indefinitely)"""
        logger.info("🤖 Starting automated scheduler...")
        logger.info("⏰ Waiting for scheduled time...")
        logger.info("💡 Press Ctrl+C to stop")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            logger.info("\n⏹️ Scheduler stopped by user")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Automated Vietnamese Warrant Data Scraper')
    parser.add_argument('--time', default='02:00', help='Scheduled time (24h format, e.g., 02:00)')
    parser.add_argument('--now', action='store_true', help='Run immediately instead of scheduling')
    parser.add_argument('--once', action='store_true', help='Run once and exit (for cron)')
    
    args = parser.parse_args()
    
    scraper = AutomatedWarrantScraper(scheduled_time=args.time)
    
    if args.now or args.once:
        # Run immediately
        scraper.run_immediately()
    else:
        # Schedule and run continuously
        scraper.schedule_job()
        scraper.start_scheduler()


if __name__ == "__main__":
    main()

