# 🇻🇳 Vietnamese Options Risk Management Platform

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thanhtung2719123/option-vietnam)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org/)

> **A comprehensive fintech platform for Vietnamese warrant risk analysis, featuring real-time Greeks calculation, Monte Carlo stress testing, and advanced portfolio risk management.**

## 🌟 **Live Demo**

- **Frontend:** [https://vietnamese-options-frontend.vercel.app](https://vietnamese-options-frontend.vercel.app)
- **Backend API:** [https://vietnamese-options-backend.vercel.app/docs](https://vietnamese-options-backend.vercel.app/docs)
- **Greeks Analysis:** [Try it now!](https://vietnamese-options-frontend.vercel.app/risk/greeks)

## 📊 **Key Features**

### 🧮 **Advanced Greeks Analysis**
- **Multi-warrant selection** with real-time calculation
- **Portfolio Greeks aggregation** (Delta, Gamma, Vega, Theta, Rho)
- **Second-order Greeks** (Vanna, Volga) for advanced risk assessment
- **Risk limit monitoring** with breach alerts
- **Interactive breakdown tables** showing individual warrant Greeks

### 📈 **Sophisticated Stress Testing**
- **6 realistic market scenarios** (Market Crash, Flash Crash, Volatility Spike, etc.)
- **Greeks P&L attribution** - see how each Greek contributes to portfolio changes
- **Monte Carlo simulation engine** with 10,000+ iterations
- **Scenario comparison charts** with severity-based visualization
- **Portfolio impact analysis** with detailed risk factor breakdown

### 🇻🇳 **Vietnamese Market Integration**
- **Real-time data** via vnstock API
- **Vietnamese warrant symbols** (CVNM2501, CHPG2502, PVIC2501, etc.)
- **VND currency formatting** and local market parameters
- **Vietnamese market volatility patterns** and risk-free rates

### 📚 **Professional Documentation**
- **Complete mathematical formulas** with derivations
- **Taylor Series expansion** explanations
- **Risk management best practices**
- **Vietnamese market examples** and case studies

## 🏗️ **Architecture**

### **Frontend (React.js)**
```
├── 📱 Modern React 18.2 with Hooks
├── 📊 Interactive charts (Recharts)
├── 🎨 Responsive Material-UI design
├── 🔄 Real-time API integration
└── 📱 Mobile-optimized interface
```

### **Backend (FastAPI + Python)**
```
├── 🚀 FastAPI with automatic OpenAPI docs
├── 🧮 Advanced mathematical models (Black-Scholes, Monte Carlo)
├── 📊 Real market data integration (vnstock)
├── 🗄️ SQLAlchemy ORM with PostgreSQL/SQLite
└── 🔒 Production-ready security and CORS
```

## 🚀 **Quick Start**

### **Option 1: One-Click Deploy to Vercel**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/thanhtung2719123/option-vietnam)

### **Option 2: Local Development**

#### **Prerequisites**
- Node.js 18+ and npm
- Python 3.11+
- Git

#### **1. Clone Repository**
```bash
git clone https://github.com/thanhtung2719123/option-vietnam.git
cd option-vietnam
```

#### **2. Setup Backend**
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Backend will run on `http://localhost:8001`

#### **3. Setup Frontend**
```bash
cd ../frontend
npm install
npm start
```
Frontend will run on `http://localhost:3000`

#### **4. Access the Platform**
- **Main App:** http://localhost:3000
- **Greeks Risk:** http://localhost:3000/risk/greeks
- **Stress Testing:** http://localhost:3000/risk/stress-test
- **API Docs:** http://localhost:8001/docs

## 🌐 **Free Deployment Options**

### **🔥 Recommended: Vercel (Easiest)**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy backend
cd backend && vercel --prod

# Deploy frontend
cd ../frontend && vercel --prod
```

### **🐙 Alternative: GitHub Pages + Railway**
- **Frontend:** GitHub Pages (free static hosting)
- **Backend:** Railway.app (free tier with 500 hours/month)

### **☁️ Other Free Options**
- **Netlify** (frontend) + **Render** (backend)
- **Surge.sh** (frontend) + **Heroku** (backend - limited free tier)

## 📊 **Technical Highlights**

### **Advanced Financial Mathematics**
```python
# Greeks calculation with real market data
def calculate_portfolio_greeks(warrants, quantities):
    portfolio_delta = sum(w.delta * q for w, q in zip(warrants, quantities))
    portfolio_gamma = sum(w.gamma * q for w, q in zip(warrants, quantities))
    # Taylor series: ΔV ≈ Δ×ΔS + 0.5×Γ×(ΔS)² + ν×Δσ + Θ×Δt
    return PortfolioGreeks(delta=portfolio_delta, gamma=portfolio_gamma, ...)
```

### **Real-time Market Integration**
```javascript
// Frontend: Multi-warrant analysis
const analyzePortfolioRisk = async (selectedWarrants) => {
    const greeksData = await Promise.all(
        selectedWarrants.map(symbol => getWarrantGreeks(symbol))
    );
    return aggregatePortfolioGreeks(greeksData);
};
```

## 📈 **Use Cases**

### **For Risk Analysts**
- **Portfolio risk assessment** across multiple Vietnamese warrants
- **Stress testing** under adverse market conditions
- **Greeks sensitivity analysis** for hedging strategies
- **Regulatory reporting** with Vietnamese market compliance

### **For Traders**
- **Real-time Greeks monitoring** for active positions
- **Scenario analysis** before entering trades
- **Risk limit management** with automated alerts
- **P&L attribution** by risk factors

### **For Students & Researchers**
- **Educational tool** for understanding options Greeks
- **Vietnamese market data** for academic research
- **Mathematical model implementation** examples
- **Professional documentation** with formulas and examples

## 🛠️ **Tech Stack**

| Component | Technology | Version |
|-----------|------------|---------|
| **Frontend** | React.js | 18.2.0 |
| **Backend** | FastAPI | 0.104.1 |
| **Database** | SQLAlchemy + PostgreSQL/SQLite | 2.0.23 |
| **Charts** | Recharts | 2.10.3 |
| **Market Data** | vnstock API | 0.2.8 |
| **Math Engine** | NumPy + SciPy + py-vollib | Latest |
| **Deployment** | Vercel | - |

## 📊 **Screenshots**

### Greeks Risk Analysis
![Greeks Analysis](https://via.placeholder.com/800x400/1f2937/ffffff?text=Greeks+Risk+Analysis+Dashboard)

### Stress Testing Dashboard  
![Stress Testing](https://via.placeholder.com/800x400/059669/ffffff?text=Stress+Testing+with+Scenarios)

### Portfolio Breakdown
![Portfolio](https://via.placeholder.com/800x400/7c3aed/ffffff?text=Multi-Warrant+Portfolio+Analysis)

## 🤝 **Contributing**

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **vnstock** for Vietnamese market data API
- **py-vollib** for Black-Scholes Greeks calculation
- **FastAPI** for the amazing Python web framework
- **React** and **Recharts** for the beautiful frontend
- **Vercel** for seamless deployment platform

## 📞 **Contact & Support**

- **GitHub Issues:** [Report bugs or request features](https://github.com/thanhtung2719123/option-vietnam/issues)
- **Email:** [Your email for professional inquiries]
- **LinkedIn:** [Your LinkedIn profile]

---

## 🎯 **Perfect for Portfolio Showcase**

This project demonstrates:
- ✅ **Full-stack development** skills
- ✅ **Financial mathematics** implementation
- ✅ **Real-world problem solving** for Vietnamese markets
- ✅ **Production deployment** experience
- ✅ **Professional documentation** and code quality

**⭐ Star this repository if you find it useful!**

---

*Built with ❤️ for the Vietnamese financial technology community* 