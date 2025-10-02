"""
Vietstock Warrant Scraper using Playwright
Scrapes all covered warrants from https://finance.vietstock.vn/chung-khoan-phai-sinh/chung-quyen.htm
"""

import asyncio
import pandas as pd
from playwright.async_api import async_playwright
import time
from datetime import datetime
import re
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VietstockWarrantScraper:
    def __init__(self):
        self.base_url = "https://finance.vietstock.vn/chung-khoan-phai-sinh/chung-quyen.htm"
        self.all_warrants = []
        
    async def scrape_all_warrants(self):
        """Scrape all warrants with pagination"""
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=False)  # Set to True for headless
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            page = await context.new_page()
            
            try:
                logger.info(f"🚀 Navigating to {self.base_url}")
                
                # Try multiple times with different strategies
                for attempt in range(3):
                    try:
                        if attempt == 0:
                            await page.goto(self.base_url, wait_until="domcontentloaded", timeout=60000)
                        elif attempt == 1:
                            await page.goto(self.base_url, wait_until="load", timeout=60000)
                        else:
                            await page.goto(self.base_url, timeout=60000)
                        
                        # Wait for table to load with longer timeout
                        await page.wait_for_selector("table, .table, [class*='table']", state="attached", timeout=15000)
                        logger.info("✅ Page loaded successfully")
                        break
                        
                    except Exception as e:
                        logger.warning(f"⚠️ Attempt {attempt + 1} failed: {e}")
                        if attempt == 2:
                            raise
                        await asyncio.sleep(5)
                
                # Get total pages
                total_pages = await self.get_total_pages(page)
                logger.info(f"📄 Total pages found: {total_pages}")
                
                # Scrape each page
                current_page = 1
                max_pages = min(total_pages, 50) if total_pages != 999 else 50  # Limit to 50 pages max
                
                while current_page <= max_pages:
                    logger.info(f"📊 Scraping page {current_page}/{max_pages}")
                    
                    # Scrape current page
                    page_warrants = await self.scrape_current_page(page)
                    
                    # Check if we got any new warrants (to detect end of data)
                    if len(page_warrants) == 0:
                        logger.info("📄 No more warrants found, stopping pagination")
                        break
                    
                    # Check for duplicates (if pagination isn't working)
                    if current_page > 1 and len(self.all_warrants) > 0:
                        last_warrant = self.all_warrants[-1]['cw_code'] if self.all_warrants else ""
                        first_new_warrant = page_warrants[0]['cw_code'] if page_warrants else ""
                        if last_warrant == first_new_warrant:
                            logger.warning(f"⚠️ Detected duplicate data on page {current_page}, pagination may not be working")
                            break
                    
                    self.all_warrants.extend(page_warrants)
                    logger.info(f"✅ Page {current_page}: Found {len(page_warrants)} warrants (Total: {len(self.all_warrants)})")
                    
                    # Try to navigate to next page
                    if current_page < max_pages:
                        success = await self.navigate_to_next_page(page)
                        if not success:
                            logger.info("📄 Cannot navigate to next page, stopping")
                            break
                    
                    current_page += 1
                    # Small delay between pages
                    await asyncio.sleep(2)
                
                logger.info(f"🎯 Total warrants scraped: {len(self.all_warrants)}")
                
            except Exception as e:
                logger.error(f"❌ Error during scraping: {e}")
                raise
            finally:
                await browser.close()
                
        return self.all_warrants
    
    async def get_total_pages(self, page):
        """Get total number of pages from AJAX pagination"""
        try:
            # Wait for pagination to load
            await asyncio.sleep(2)
            
            # Vietstock specific pagination selectors
            pagination_selectors = [
                ".pagination li:not(.disabled):last-child a",
                ".pagination .page-item:not(.disabled):last-child a",
                "[class*='paging'] [class*='page']:last-child",
                ".pager li:last-child a",
                "ul.pagination li:last-child a"
            ]
            
            for selector in pagination_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    if elements:
                        for element in elements:
                            text = await element.inner_text()
                            text = text.strip()
                            if text.isdigit():
                                logger.info(f"📄 Found max page: {text}")
                                return int(text)
                except Exception as e:
                    logger.debug(f"Selector {selector} failed: {e}")
                    continue
            
            # Look for page numbers in pagination
            page_links = await page.query_selector_all(".pagination a, .paging a, .pager a")
            page_numbers = []
            
            for link in page_links:
                try:
                    text = await link.inner_text()
                    text = text.strip()
                    if text.isdigit():
                        page_numbers.append(int(text))
                except:
                    continue
            
            if page_numbers:
                max_page = max(page_numbers)
                logger.info(f"📄 Found max page from numbers: {max_page}")
                return max_page
            
            # Check for "Next" button existence to determine if there are more pages
            next_buttons = await page.query_selector_all("a:has-text('Next'), a:has-text('›'), a:has-text('»'), .pagination .next")
            if next_buttons:
                logger.info("📄 Found Next button, will discover pages dynamically")
                return 999  # Will discover dynamically
                
            logger.warning("⚠️ Could not determine total pages, assuming 1")
            return 1
            
        except Exception as e:
            logger.error(f"❌ Error getting total pages: {e}")
            return 1
    
    async def navigate_to_next_page(self, page):
        """Navigate to next page using AJAX pagination"""
        try:
            # Try Next button first
            next_selectors = [
                ".pagination .next:not(.disabled) a",
                ".pagination a:has-text('Next'):not(.disabled)",
                ".pagination a:has-text('›'):not(.disabled)",
                ".pagination a:has-text('»'):not(.disabled)",
                ".paging .next:not(.disabled) a",
                "a[title*='Next']:not(.disabled)",
                "a[aria-label*='Next']:not(.disabled)"
            ]
            
            for selector in next_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        # Check if element is actually clickable
                        is_disabled = await element.get_attribute("disabled")
                        class_name = await element.get_attribute("class") or ""
                        
                        if not is_disabled and "disabled" not in class_name.lower():
                            logger.info(f"🔄 Clicking Next button: {selector}")
                            await element.click()
                            await self.wait_for_ajax_load(page)
                            return True
                except Exception as e:
                    logger.debug(f"Next selector {selector} failed: {e}")
                    continue
            
            logger.warning("⚠️ No active Next button found")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error navigating to next page: {e}")
            return False
    
    async def navigate_to_page(self, page, page_num):
        """Navigate to specific page using AJAX pagination"""
        try:
            # For page 2+, try to click Next or specific page number
            if page_num == 2:
                # Try Next button first
                next_selectors = [
                    ".pagination .next a",
                    ".pagination a:has-text('Next')",
                    ".pagination a:has-text('›')",
                    ".pagination a:has-text('»')",
                    ".paging .next a"
                ]
                
                for selector in next_selectors:
                    try:
                        element = await page.query_selector(selector)
                        if element:
                            logger.info(f"🔄 Clicking Next button: {selector}")
                            await element.click()
                            await self.wait_for_ajax_load(page)
                            return True
                    except Exception as e:
                        logger.debug(f"Next selector {selector} failed: {e}")
                        continue
            
            # Try clicking specific page number
            page_selectors = [
                f".pagination a:has-text('{page_num}')",
                f".paging a:has-text('{page_num}')",
                f"[class*='pagination'] a:has-text('{page_num}')",
                f".pager a:has-text('{page_num}')"
            ]
            
            for selector in page_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    for element in elements:
                        text = await element.inner_text()
                        if text.strip() == str(page_num):
                            logger.info(f"🔄 Clicking page {page_num}: {selector}")
                            await element.click()
                            await self.wait_for_ajax_load(page)
                            return True
                except Exception as e:
                    logger.debug(f"Page selector {selector} failed: {e}")
                    continue
            
            logger.warning(f"⚠️ Could not navigate to page {page_num}")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error navigating to page {page_num}: {e}")
            return False
    
    async def wait_for_ajax_load(self, page):
        """Wait for AJAX content to load"""
        try:
            # Wait for any loading indicators to disappear
            loading_selectors = [
                ".loading", ".spinner", "[class*='loading']", "[class*='spinner']"
            ]
            
            for selector in loading_selectors:
                try:
                    await page.wait_for_selector(selector, state="hidden", timeout=2000)
                except:
                    pass
            
            # Wait a bit for content to stabilize
            await asyncio.sleep(3)
            
            # Wait for table rows to be present
            await page.wait_for_function(
                "() => document.querySelectorAll('table tr, .table tr').length > 1",
                timeout=10000
            )
            
        except Exception as e:
            logger.debug(f"AJAX wait completed with: {e}")
            await asyncio.sleep(2)  # Fallback wait
    
    async def scrape_current_page(self, page):
        """Scrape warrant data from current page"""
        warrants = []
        
        try:
            # Wait a bit for content to load
            await asyncio.sleep(3)
            
            # Vietstock specific table selectors based on the screenshot
            table_selectors = [
                "table tbody tr:not(:first-child)",  # Skip header row
                ".table tbody tr:not(:first-child)",
                "[class*='table'] tbody tr:not(:first-child)",
                "table tr:not(:first-child)",  # Skip header
                ".table tr:not(:first-child)",
                "tbody tr",
                "tr:not(:first-child)"  # Last resort, skip first row (header)
            ]
            
            rows = []
            for selector in table_selectors:
                rows = await page.query_selector_all(selector)
                # Filter out header rows and empty rows
                valid_rows = []
                for row in rows:
                    try:
                        cells = await row.query_selector_all("td")
                        if len(cells) >= 5:  # Must have at least 5 columns
                            first_cell_text = await self.get_cell_text(cells[0]) if cells else ""
                            # Skip if first cell is "STT" (header) or empty
                            if first_cell_text and first_cell_text != "STT" and first_cell_text.strip():
                                valid_rows.append(row)
                    except:
                        continue
                
                if len(valid_rows) > 0:
                    logger.info(f"📋 Found {len(valid_rows)} valid rows using selector: {selector}")
                    rows = valid_rows
                    break
            
            if len(rows) == 0:
                logger.warning("⚠️ No table rows found with any selector")
                return warrants
            
            for i, row in enumerate(rows):
                try:
                    warrant_data = await self.extract_warrant_from_row(row, i + 1)
                    if warrant_data:
                        warrants.append(warrant_data)
                except Exception as e:
                    logger.warning(f"⚠️ Error extracting row {i + 1}: {e}")
                    continue
            
        except Exception as e:
            logger.error(f"❌ Error scraping current page: {e}")
        
        return warrants
    
    async def extract_warrant_from_row(self, row, row_num):
        """Extract warrant data from a table row"""
        try:
            cells = await row.query_selector_all("td")
            
            if len(cells) < 11:  # Minimum expected columns (STT to Trạng thái)
                logger.warning(f"⚠️ Row {row_num}: Not enough columns ({len(cells)}) - expected 11")
                return None
            
            # Extract data based on EXACT column positions from the screenshot
            warrant_data = {}
            
            # Column 0: STT (skip)
            # Column 1: Mã CW 
            warrant_data['cw_code'] = await self.get_cell_text(cells[1])
            
            # Column 2: Giá đóng cửa
            warrant_data['close_price'] = await self.parse_number(await self.get_cell_text(cells[2]))
            
            # Column 3: Thay đổi
            warrant_data['change'] = await self.get_cell_text(cells[3])
            
            # Column 4: Tỷ lệ chuyển đổi
            warrant_data['conversion_ratio'] = await self.get_cell_text(cells[4])
            
            # Column 5: Giá thực hiện
            warrant_data['exercise_price'] = await self.parse_number(await self.get_cell_text(cells[5]))
            
            # Column 6: Chứng khoán cơ sở
            warrant_data['underlying_code'] = await self.get_cell_text(cells[6])
            
            # Column 7: Tổ chức phát hành
            warrant_data['issuer'] = await self.get_cell_text(cells[7])
            
            # Column 8: Loại CW
            warrant_data['warrant_type'] = await self.get_cell_text(cells[8])
            
            # Column 9: Kiểu thực hiện
            warrant_data['exercise_style'] = await self.get_cell_text(cells[9])
            
            # Column 10: Ngày GDĐT (First trading date)
            warrant_data['first_trading_date'] = await self.get_cell_text(cells[10])
            
            # Column 11: Ngày GDCC (Last trading date)  
            warrant_data['last_trading_date'] = await self.get_cell_text(cells[11])
            
            # Column 12: Trạng thái
            warrant_data['status'] = await self.get_cell_text(cells[12]) if len(cells) > 12 else ""
            
            # Add metadata
            warrant_data['scraped_at'] = datetime.now().isoformat()
            warrant_data['row_number'] = row_num
            
            # Validate required fields
            if not warrant_data['cw_code'] or warrant_data['cw_code'].strip() == "":
                logger.warning(f"⚠️ Row {row_num}: Missing CW code, skipping")
                return None
            
            logger.debug(f"✅ Row {row_num}: {warrant_data['cw_code']} - {warrant_data['warrant_type']} - Ratio: {warrant_data['conversion_ratio']}")
            return warrant_data
            
        except Exception as e:
            logger.error(f"❌ Error extracting warrant from row {row_num}: {e}")
            return None
    
    async def get_cell_text(self, cell):
        """Get text content from a cell"""
        if not cell:
            return ""
        try:
            text = await cell.inner_text()
            return text.strip()
        except:
            return ""
    
    async def parse_number(self, text):
        """Parse number from text, handling Vietnamese formatting"""
        if not text:
            return 0
        try:
            # Remove commas and spaces
            cleaned = re.sub(r'[,\s]', '', text)
            # Extract number (including decimals)
            match = re.search(r'[\d.]+', cleaned)
            if match:
                return float(match.group())
            return 0
        except:
            return 0
    
    def save_to_csv(self, filename=None):
        """Save scraped data to CSV"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"vietstock_warrants_{timestamp}.csv"
        
        if not self.all_warrants:
            logger.error("❌ No warrant data to save")
            return None
        
        try:
            df = pd.DataFrame(self.all_warrants)
            df.to_csv(filename, index=False, encoding='utf-8-sig')
            logger.info(f"💾 Saved {len(self.all_warrants)} warrants to {filename}")
            return filename
        except Exception as e:
            logger.error(f"❌ Error saving to CSV: {e}")
            return None
    
    def print_summary(self):
        """Print summary of scraped data"""
        if not self.all_warrants:
            logger.info("📊 No warrants scraped")
            return
        
        df = pd.DataFrame(self.all_warrants)
        
        print("\n" + "="*60)
        print("📊 VIETSTOCK WARRANT SCRAPING SUMMARY")
        print("="*60)
        print(f"🎯 Total warrants scraped: {len(self.all_warrants)}")
        print(f"📅 Scraping completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if 'cw_type' in df.columns:
            print(f"\n📈 Warrant Types:")
            type_counts = df['cw_type'].value_counts()
            for wtype, count in type_counts.items():
                print(f"   {wtype}: {count}")
        
        if 'cw_issuer' in df.columns:
            print(f"\n🏢 Top Issuers:")
            issuer_counts = df['cw_issuer'].value_counts().head(5)
            for issuer, count in issuer_counts.items():
                print(f"   {issuer}: {count}")
        
        if 'underlying_code' in df.columns:
            print(f"\n📊 Top Underlying Assets:")
            underlying_counts = df['underlying_code'].value_counts().head(5)
            for underlying, count in underlying_counts.items():
                print(f"   {underlying}: {count}")
        
        print("\n✅ Scraping completed successfully!")
        print("="*60)

async def main():
    """Main function to run the scraper"""
    scraper = VietstockWarrantScraper()
    
    try:
        logger.info("🚀 Starting Vietstock warrant scraping...")
        
        # Scrape all warrants
        warrants = await scraper.scrape_all_warrants()
        
        if warrants:
            # Save to CSV
            filename = scraper.save_to_csv()
            
            # Print summary
            scraper.print_summary()
            
            # Show first few records
            if len(warrants) > 0:
                print(f"\n📋 First 3 warrants:")
                df = pd.DataFrame(warrants)
                print(df.head(3).to_string(index=False))
            
            return filename
        else:
            logger.error("❌ No warrants were scraped")
            return None
            
    except Exception as e:
        logger.error(f"❌ Scraping failed: {e}")
        return None

if __name__ == "__main__":
    # Install required packages if not already installed
    try:
        import pandas as pd
        from playwright.async_api import async_playwright
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("📦 Please install required packages:")
        print("   pip install playwright pandas")
        print("   playwright install chromium")
        exit(1)
    
    # Run the scraper
    result = asyncio.run(main())
    
    if result:
        print(f"\n🎉 Scraping completed! Data saved to: {result}")
    else:
        print("\n❌ Scraping failed!") 