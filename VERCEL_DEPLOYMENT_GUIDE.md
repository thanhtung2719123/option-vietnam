# 🚀 **COMPLETE VERCEL DEPLOYMENT GUIDE**
## Vietnamese Options Risk Management Platform

### 📋 **OVERVIEW**
This guide will help you deploy both the **Frontend (React)** and **Backend (FastAPI)** to Vercel with production configurations.

---

## 🎯 **DEPLOYMENT STRATEGY**

### **Two Separate Deployments:**
1. **Frontend:** React app → Vercel Static Site
2. **Backend:** FastAPI → Vercel Serverless Functions

---

## 📁 **STEP 1: PREPARE PROJECT STRUCTURE**

### **1.1 Create Frontend Environment Files**

Create `frontend/.env.production`:
```env
REACT_APP_API_BASE_URL=https://your-backend-domain.vercel.app
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
```

### **1.2 Update Frontend API Configuration**

Update `frontend/src/services/apiService.js`:
```javascript
// Base URL for FastAPI backend
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';
const API_V1 = `${API_BASE_URL}/api/v1`;
```

### **1.3 Create Vercel Configuration Files**

Create `frontend/vercel.json`:
```json
{
  "version": 2,
  "name": "vietnamese-options-frontend",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": {
        "cache-control": "s-maxage=31536000,immutable"
      }
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "REACT_APP_API_BASE_URL": "@api_base_url"
  }
}
```

Create `backend/vercel.json`:
```json
{
  "version": 2,
  "name": "vietnamese-options-backend",
  "builds": [
    {
      "src": "main.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "main.py"
    }
  ],
  "env": {
    "PYTHONPATH": ".",
    "DATABASE_URL": "@database_url"
  }
}
```

---

## 🔧 **STEP 2: PREPARE BACKEND FOR VERCEL**

### **2.1 Create Requirements File**

Create `backend/requirements.txt`:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pydantic==2.5.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pandas==2.1.3
numpy==1.25.2
scipy==1.11.4
py-vollib==1.0.1
vnstock==0.2.8
requests==2.31.0
python-dotenv==1.0.0
```

### **2.2 Create Vercel-Compatible Main File**

Create `backend/api/index.py` (Vercel entry point):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import your existing app
from main import app

# This is required for Vercel
handler = app
```

### **2.3 Update Database Configuration**

Update `backend/models/database_models.py` for production:
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Production database URL (PostgreSQL on Vercel)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./warrants.db")

# Handle PostgreSQL URL format for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
```

---

## 🌐 **STEP 3: DEPLOY TO VERCEL**

### **3.1 Install Vercel CLI**
```bash
npm install -g vercel
```

### **3.2 Login to Vercel**
```bash
vercel login
```

### **3.3 Deploy Backend First**

```bash
cd backend
vercel --prod
```

**During deployment, configure:**
- Project name: `vietnamese-options-backend`
- Framework: `Other`
- Root directory: `./`
- Build command: `pip install -r requirements.txt`
- Output directory: `./`

### **3.4 Set Backend Environment Variables**

In Vercel Dashboard → Project Settings → Environment Variables:
```
DATABASE_URL = postgresql://username:password@host:port/database
PYTHONPATH = .
```

### **3.5 Deploy Frontend**

```bash
cd ../frontend
vercel --prod
```

**Configure:**
- Project name: `vietnamese-options-frontend`
- Framework: `Create React App`
- Root directory: `./`
- Build command: `npm run build`
- Output directory: `build`

### **3.6 Set Frontend Environment Variables**

In Vercel Dashboard → Frontend Project → Environment Variables:
```
REACT_APP_API_BASE_URL = https://your-backend-domain.vercel.app
REACT_APP_ENVIRONMENT = production
REACT_APP_VERSION = 1.0.0
GENERATE_SOURCEMAP = false
```

---

## 🗄️ **STEP 4: DATABASE SETUP**

### **4.1 Create PostgreSQL Database**

**Option A: Vercel Postgres (Recommended)**
```bash
vercel postgres create
```

**Option B: External Provider (Supabase, PlanetScale, etc.)**
- Create account on Supabase
- Create new project
- Get connection string

### **4.2 Update Database URL**

Update backend environment variable:
```
DATABASE_URL = postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

### **4.3 Initialize Database**

Create `backend/init_db.py`:
```python
from models.database_models import engine, Base
from models.warrant_models import Warrant
from models.pricing_models import PricingResult, GreeksResult
from models.risk_models import RiskMetrics

def init_database():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

if __name__ == "__main__":
    init_database()
```

Run once after deployment:
```bash
python init_db.py
```

---

## 🔐 **STEP 5: SECURITY & PERFORMANCE**

### **5.1 Update CORS Settings**

Update `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-frontend-domain.vercel.app",
        "http://localhost:3000"  # For development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **5.2 Add Security Headers**

Create `frontend/public/_headers`:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### **5.3 Optimize Build**

Update `frontend/package.json`:
```json
{
  "scripts": {
    "build": "GENERATE_SOURCEMAP=false react-scripts build",
    "build:analyze": "npm run build && npx webpack-bundle-analyzer build/static/js/*.js"
  }
}
```

---

## 📊 **STEP 6: MONITORING & ANALYTICS**

### **6.1 Add Vercel Analytics**

Install in frontend:
```bash
npm install @vercel/analytics
```

Update `frontend/src/index.js`:
```javascript
import { Analytics } from '@vercel/analytics/react';

root.render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>
);
```

### **6.2 Add Error Tracking**

Install Sentry:
```bash
npm install @sentry/react @sentry/tracing
```

Configure in `frontend/src/index.js`:
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.REACT_APP_ENVIRONMENT,
});
```

---

## 🚀 **STEP 7: FINAL DEPLOYMENT COMMANDS**

### **7.1 Complete Deployment Script**

Create `deploy.sh`:
```bash
#!/bin/bash

echo "🚀 Deploying Vietnamese Options Risk Management Platform..."

# Deploy Backend
echo "📡 Deploying Backend..."
cd backend
vercel --prod --confirm

# Get backend URL
BACKEND_URL=$(vercel --scope your-team ls | grep backend | awk '{print $2}')

# Deploy Frontend with backend URL
echo "🌐 Deploying Frontend..."
cd ../frontend
vercel env add REACT_APP_API_BASE_URL production
echo "https://$BACKEND_URL" | vercel env add REACT_APP_API_BASE_URL production
vercel --prod --confirm

echo "✅ Deployment Complete!"
echo "🌐 Frontend: https://your-frontend-domain.vercel.app"
echo "📡 Backend: https://your-backend-domain.vercel.app"
```

### **7.2 Run Deployment**

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔍 **STEP 8: TESTING & VERIFICATION**

### **8.1 Test Endpoints**

```bash
# Test backend health
curl https://your-backend-domain.vercel.app/health

# Test API documentation
curl https://your-backend-domain.vercel.app/docs

# Test warrant pricing
curl -X POST https://your-backend-domain.vercel.app/api/v1/warrants/price \
  -H "Content-Type: application/json" \
  -d '{"symbol":"CVNM2501","spot_price":50000,"model_type":"black_scholes"}'
```

### **8.2 Frontend Testing Checklist**

- [ ] Homepage loads correctly
- [ ] Greeks Risk page displays real data
- [ ] Stress Testing works with backend API
- [ ] Charts render properly
- [ ] Warrant selection functions
- [ ] Mobile responsiveness

### **8.3 Performance Testing**

```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Test performance
lighthouse https://your-frontend-domain.vercel.app --output html --output-path ./lighthouse-report.html
```

---

## 🛠️ **STEP 9: CUSTOM DOMAIN (OPTIONAL)**

### **9.1 Add Custom Domain**

In Vercel Dashboard:
1. Go to Project Settings → Domains
2. Add your domain: `vietnamese-options.com`
3. Configure DNS records:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

### **9.2 SSL Certificate**

Vercel automatically provides SSL certificates for custom domains.

---

## 📝 **STEP 10: MAINTENANCE & UPDATES**

### **10.1 Automated Deployments**

Connect GitHub repository to Vercel for automatic deployments on push.

### **10.2 Environment Management**

```bash
# Preview deployments
vercel

# Production deployments
vercel --prod

# Check deployment status
vercel ls
```

### **10.3 Rollback Strategy**

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

---

## 🎉 **FINAL URLS**

After successful deployment:

- **Frontend:** https://vietnamese-options-frontend.vercel.app
- **Backend API:** https://vietnamese-options-backend.vercel.app
- **API Docs:** https://vietnamese-options-backend.vercel.app/docs
- **Greeks Risk:** https://vietnamese-options-frontend.vercel.app/risk/greeks
- **Stress Testing:** https://vietnamese-options-frontend.vercel.app/risk/stress-test

---

## 🆘 **TROUBLESHOOTING**

### **Common Issues:**

1. **CORS Errors:** Update allowed origins in backend
2. **Database Connection:** Check DATABASE_URL format
3. **Build Failures:** Verify requirements.txt and package.json
4. **API Timeouts:** Optimize database queries
5. **Memory Limits:** Use Vercel Pro for larger applications

### **Debug Commands:**

```bash
# Check logs
vercel logs <deployment-url>

# Local development
vercel dev

# Environment variables
vercel env ls
```

---

**🎊 YOUR VIETNAMESE OPTIONS RISK MANAGEMENT PLATFORM IS NOW LIVE ON VERCEL!** 