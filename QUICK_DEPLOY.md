# 🚀 **QUICK VERCEL DEPLOYMENT**

## **IMMEDIATE DEPLOYMENT STEPS:**

### **1. Install Vercel CLI**
```bash
npm install -g vercel
```

### **2. Login to Vercel**
```bash
vercel login
```

### **3. Deploy Backend**
```bash
cd backend
vercel --prod
```
**Configure when prompted:**
- Project name: `vietnamese-options-backend`
- Framework: `Other`
- Build command: Leave empty (press Enter)
- Output directory: Leave empty (press Enter)

### **4. Deploy Frontend**
```bash
cd ../frontend
vercel --prod
```
**Configure when prompted:**
- Project name: `vietnamese-options-frontend`
- Framework: `Create React App`
- Build command: `npm run build`
- Output directory: `build`

### **5. Get Your URLs**
```bash
vercel ls
```

### **6. Update Environment Variables**

**In Vercel Dashboard:**

**Frontend Project → Settings → Environment Variables:**
```
REACT_APP_API_BASE_URL = https://your-backend-url.vercel.app
REACT_APP_ENVIRONMENT = production
GENERATE_SOURCEMAP = false
```

**Backend Project → Settings → Environment Variables:**
```
PYTHONPATH = .
DATABASE_URL = sqlite:///./warrants.db
```

### **7. Redeploy Frontend**
```bash
cd frontend
vercel --prod
```

## **🎉 DONE!**

Your website is now live:
- **Frontend:** https://vietnamese-options-frontend-xxx.vercel.app
- **Backend:** https://vietnamese-options-backend-xxx.vercel.app/docs

## **📱 TEST YOUR DEPLOYMENT:**

1. Visit your frontend URL
2. Go to `/risk/greeks` page
3. Toggle "Backend API" to test connection
4. Select multiple warrants
5. Check if Greeks data loads

## **🔧 TROUBLESHOOTING:**

**CORS Error?**
Update `backend/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-url.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Build Failed?**
Check logs:
```bash
vercel logs <deployment-url>
```

**Need Database?**
Use Vercel Postgres:
```bash
vercel postgres create
``` 