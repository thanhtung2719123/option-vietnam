# 🚀 Deployment Guide - Vietnamese Options Risk Management

## 🎯 **Quick Deploy to GitHub**

### **Windows:**
```bash
# Run the automated deployment script
deploy_to_github.bat
```

### **Linux/Mac:**
```bash
# Make script executable and run
chmod +x deploy_to_github.sh
./deploy_to_github.sh
```

### **Manual Git Commands:**
```bash
# Initialize repository
git init

# Add remote origin
git remote add origin https://github.com/thanhtung2719123/vietnamese-option.git

# Add all files
git add .

# Commit with comprehensive message
git commit -m "🚀 Vietnamese Options Risk Management Platform"

# Push to GitHub
git branch -M main
git push -u origin main
```

## 🌐 **Production Deployment Options**

### **🔥 Option 1: Vercel (Recommended)**

#### **Frontend Deployment:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard:
# REACT_APP_API_BASE_URL=https://your-backend-url.vercel.app
```

#### **Backend Deployment:**
```bash
# Deploy backend
cd backend
vercel --prod

# Set environment variables:
# DATABASE_URL=your_database_url
# VNSTOCK_API_KEY=your_vnstock_key
```

### **🐙 Option 2: GitHub Pages + Railway**

#### **Frontend (GitHub Pages):**
```bash
# Enable GitHub Pages in repository settings
# Source: Deploy from a branch
# Branch: main
# Folder: /frontend/build
```

#### **Backend (Railway):**
```bash
# Connect GitHub repository to Railway
# Set environment variables in Railway dashboard
# Deploy automatically on push
```

### **☁️ Option 3: Netlify + Render**

#### **Frontend (Netlify):**
```bash
# Connect GitHub repository to Netlify
# Build command: cd frontend && npm run build
# Publish directory: frontend/build
```

#### **Backend (Render):**
```bash
# Connect GitHub repository to Render
# Build command: cd backend && pip install -r requirements.txt
# Start command: cd backend && python main.py
```

## 🔧 **Environment Variables Setup**

### **Frontend (.env):**
```bash
# API Configuration
REACT_APP_API_BASE_URL=https://your-backend-url.vercel.app

# AI Chatbot (Optional)
REACT_APP_GEMINI_API_KEY=your_gemini_api_key

# WebSocket (Optional)
REACT_APP_WS_URL=wss://your-backend-url.vercel.app/ws
```

### **Backend (.env):**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Market Data APIs
VNSTOCK_API_KEY=your_vnstock_api_key
VIETSTOCK_SCRAPER_ENABLED=true

# AI Services (Optional)
GEMINI_API_KEY=your_gemini_api_key

# Security
SECRET_KEY=your_secret_key
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

## 📊 **Database Setup**

### **SQLite (Development):**
```python
# Already configured in backend/models/database_models.py
# Database file: vn_options_risk_engine.db
```

### **PostgreSQL (Production):**
```bash
# Install PostgreSQL
# Create database
createdb vietnamese_options_risk

# Update DATABASE_URL in environment variables
DATABASE_URL=postgresql://user:pass@host:port/vietnamese_options_risk
```

## 🤖 **AI Chatbot Setup**

### **Get Gemini API Key:**
1. Visit: https://makersuite.google.com/app/apikey
2. Create new API key
3. Add to environment variables: `REACT_APP_GEMINI_API_KEY`

### **Features:**
- ✅ Automatic data analysis
- ✅ Formula explanations
- ✅ Risk recommendations
- ✅ Vietnamese market insights

## 📈 **Automated Data Scraping**

### **Setup Daily Scraping:**
```bash
# Windows
setup_automated_scraper.bat

# Linux/Mac
chmod +x setup_automated_scraper.sh
./setup_automated_scraper.sh
```

### **Manual Scraping:**
```bash
# Run scraper manually
python scrape_warrants_playwright.py

# Import data to database
python import_csv_warrants.py
```

## 🔍 **Monitoring & Analytics**

### **Vercel Analytics:**
- Automatic performance monitoring
- User behavior tracking
- Error reporting

### **Custom Monitoring:**
```python
# Add to backend/main.py
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}
```

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **Frontend Build Fails:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### **Backend Import Errors:**
```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Check Python path
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

#### **Database Connection Issues:**
```bash
# Check database URL format
# SQLite: sqlite:///./vn_options_risk_engine.db
# PostgreSQL: postgresql://user:pass@host:port/dbname
```

### **Performance Optimization:**

#### **Frontend:**
```javascript
// Enable code splitting
const LazyComponent = React.lazy(() => import('./Component'));

// Optimize bundle size
npm run build -- --analyze
```

#### **Backend:**
```python
# Add caching
from functools import lru_cache

@lru_cache(maxsize=128)
def get_warrant_data(symbol):
    # Cached warrant data
    pass
```

## 🎯 **Success Metrics**

### **Performance Targets:**
- ✅ Frontend load time < 3 seconds
- ✅ API response time < 500ms
- ✅ 99.9% uptime
- ✅ Mobile responsive design

### **Feature Completeness:**
- ✅ Real-time Greeks calculation
- ✅ Monte Carlo stress testing
- ✅ Vietnamese market integration
- ✅ AI-powered analysis
- ✅ Production deployment

## 📞 **Support & Maintenance**

### **Regular Tasks:**
1. **Daily:** Automated warrant data scraping
2. **Weekly:** Database optimization
3. **Monthly:** Security updates
4. **Quarterly:** Feature enhancements

### **Monitoring:**
- Vercel dashboard for performance
- GitHub Actions for CI/CD
- Database backups
- Error tracking

---

## 🎉 **Deployment Complete!**

Your Vietnamese Options Risk Management Platform is now live at:
- **Repository:** https://github.com/thanhtung2719123/vietnamese-option
- **Frontend:** [Your Vercel URL]
- **Backend:** [Your Backend URL]
- **API Docs:** [Your Backend URL]/docs

**🚀 Ready for production use!**
