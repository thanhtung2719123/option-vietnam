# 🇻🇳 HỆ THỐNG GIAO DỊCH CHỨNG QUYỀN VIỆT NAM

## 📋 Tổng quan
Hệ thống tính toán định giá và quản lý rủi ro cho chứng quyền có bảo đảm tại thị trường Việt Nam.

### ✨ Tính năng chính
- 🧮 **Định giá Options**: Black-Scholes, Heston Model, Monte Carlo
- 📊 **Greeks Calculator**: Delta, Gamma, Vega, Theta, Rho, Lambda
- 🛡️ **Quản lý rủi ro**: VaR, CVaR, Stress Testing
- 🤖 **AI Chatbot**: Gemini 2.5 Pro giải thích các chỉ số
- 📈 **450+ Warrants**: Dữ liệu thực từ Vietstock
- ⚡ **Real-time**: Cập nhật giá và Greeks theo thời gian thực

## 🚀 Cách sử dụng nhanh

### Bước 1: Cài đặt (chỉ chạy 1 lần)
```bash
# Double-click file này để cài đặt tất cả
install_dependencies.bat
```

### Bước 2: Khởi động hệ thống
```bash
# Double-click file này để chạy
start_system.bat
```

### Bước 3: Sử dụng
- Mở trình duyệt: `http://localhost:3000`
- Chờ 30-60 giây để hệ thống khởi động hoàn toàn
- Sử dụng AI chatbot để hỏi về Greeks và định giá

### Bước 4: Dừng hệ thống
```bash
# Double-click file này để dừng
stop_system.bat
```

## 📊 Cấu trúc hệ thống

```
stock-web-main/
├── 🎯 start_system.bat          # Khởi động hệ thống
├── 🛑 stop_system.bat           # Dừng hệ thống  
├── 📦 install_dependencies.bat  # Cài đặt dependencies
├── backend/                     # FastAPI Backend
│   ├── main.py                 # Server chính
│   ├── api/                    # REST API endpoints
│   ├── models/                 # Database models
│   └── services/               # Business logic
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/         # UI components
│   │   └── services/           # API services
│   └── public/
└── vn_options_risk_engine.db   # SQLite Database (450 warrants)
```

## 🔧 Yêu cầu hệ thống

### Phần mềm cần thiết:
- **Python 3.8+** (https://python.org)
- **Node.js 16+** (https://nodejs.org)
- **Git** (https://git-scm.com)

### Hệ điều hành:
- ✅ Windows 10/11
- ✅ macOS (cần chỉnh sửa .bat thành .sh)
- ✅ Linux (cần chỉnh sửa .bat thành .sh)

## 📈 Dữ liệu

### 450+ Warrants từ Vietstock:
- **Top underlying**: HPG (94), FPT (89), MWG (16)
- **Conversion ratios**: 1.67:1, 2.0:1, 3.0:1, 12.8507:1, etc.
- **Tất cả thông tin**: Giá, Strike, Maturity, Issuer, Type

### Cập nhật dữ liệu:
```bash
# Chạy scraper để cập nhật
python scrape_warrants_playwright.py
python import_csv_warrants.py
```

## 🤖 AI Chatbot (Gemini 2.5 Pro)

### Các câu hỏi mẫu:
- "Delta là gì và ý nghĩa của nó?"
- "Giải thích Gamma và tại sao nó quan trọng?"
- "Vega ảnh hưởng thế nào đến giá warrant?"
- "Theta decay hoạt động như thế nào?"
- "Cách tính Black-Scholes cho warrant Việt Nam?"

## 🧮 Tính toán Greeks

### Công thức đã điều chỉnh cho thị trường VN:
- **Vega**: Chia 100 (per 1% volatility change)
- **Rho**: Chia 100 (per 1% interest rate change)  
- **Conversion Ratio**: Tất cả Greeks chia cho exercise_ratio
- **VND Prices**: Xử lý giá lớn (20,000-150,000 VND)

## 🛡️ Quản lý rủi ro

### Các phương pháp:
- **Value at Risk (VaR)**: Historical, Parametric, Monte Carlo
- **Conditional VaR (CVaR)**: Expected Shortfall
- **Stress Testing**: Scenario analysis
- **Delta Hedging**: Dynamic hedging strategies

## 🔗 API Endpoints

### Backend (http://localhost:8001):
- `GET /warrants` - Danh sách warrants
- `POST /price` - Định giá warrant
- `GET /{symbol}/greeks` - Tính Greeks
- `POST /risk/var` - Tính VaR
- `POST /hedging/delta` - Delta hedging

### Frontend (http://localhost:3000):
- `/dashboard` - Tổng quan thị trường
- `/greeks` - Greeks calculator  
- `/risk` - Risk management
- `/hedging` - Delta hedging
- `/volatility` - Volatility analysis

## 🐛 Troubleshooting

### Lỗi thường gặp:

**1. Port đã được sử dụng:**
```bash
# Chạy stop_system.bat trước
stop_system.bat
# Sau đó chạy lại
start_system.bat
```

**2. Python/Node.js không tìm thấy:**
- Cài đặt Python từ python.org
- Cài đặt Node.js từ nodejs.org
- Restart Command Prompt

**3. Database lỗi:**
```bash
# Xóa database cũ và tạo lại
del vn_options_risk_engine.db
python import_csv_warrants.py
```

**4. Frontend không load:**
- Kiểm tra backend đã chạy chưa (http://localhost:8001)
- Clear browser cache
- Chờ thêm 1-2 phút để npm start hoàn tất

## 📞 Hỗ trợ

### Log files:
- Backend logs: Terminal "Vietnam Warrant Backend"
- Frontend logs: Terminal "Vietnam Warrant Frontend"
- Browser console: F12 → Console tab

### Kiểm tra hệ thống:
```bash
# Kiểm tra database
python check_database.py

# Test API
curl http://localhost:8001/warrants

# Test frontend
# Mở http://localhost:3000
```

## 🎯 Roadmap

### Tính năng sắp tới:
- [ ] Real-time WebSocket data
- [ ] Advanced volatility models
- [ ] Portfolio optimization
- [ ] Risk reporting dashboard
- [ ] Mobile app support

---

## 🏆 Thành tựu

✅ **450+ warrants** từ thị trường VN  
✅ **AI-powered** explanations  
✅ **Production-ready** architecture  
✅ **Vietnamese market** optimized  
✅ **One-click deployment**  

---

**© 2024 Vietnam Warrant Trading System**  
*Powered by FastAPI, React, và Gemini 2.5 Pro* 