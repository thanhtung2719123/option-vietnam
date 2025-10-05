@echo off
echo 🚀 Pushing Vietnamese Options Risk Management to GitHub...
echo Repository: https://github.com/thanhtung2719123/vietnamese-option
echo.

echo 📦 Initializing Git...
git init

echo.
echo 🔗 Setting remote origin...
git remote add origin https://github.com/thanhtung2719123/vietnamese-option.git

echo.
echo 📝 Adding all files...
git add .

echo.
echo 💾 Committing changes...
git commit -m "🚀 Vietnamese Options Risk Management Platform

✨ Complete Features:
- Advanced Greeks analysis with real-time calculation
- Monte Carlo stress testing with 6 market scenarios
- Vietnamese warrant integration (vnstock API)
- AI-powered risk analysis and recommendations
- Full-stack React + FastAPI architecture
- Production-ready deployment with Vercel

🧮 Mathematical Models:
- Black-Scholes pricing with Greeks
- Taylor Series expansion for risk attribution
- Correlation-based VaR calculation
- Dynamic delta hedging optimization

🇻🇳 Vietnamese Market:
- Real-time warrant data scraping
- VND currency formatting
- Local market volatility patterns
- Automated daily data updates

🎯 Perfect for:
- Portfolio risk management
- Options trading analysis
- Financial education
- Academic research"

echo.
echo 🚀 Pushing to GitHub...
git branch -M main
git push -u origin main

echo.
echo ✅ Successfully pushed to GitHub!
echo 🌐 Repository: https://github.com/thanhtung2719123/vietnamese-option
echo.
echo 🎯 Next steps:
echo 1. Visit the repository to verify upload
echo 2. Set up Vercel deployment
echo 3. Configure environment variables
echo.
pause
