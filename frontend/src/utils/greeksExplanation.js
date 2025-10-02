// Greeks Explanation and Correct Calculation Methods
// This file provides detailed explanations for the AI chatbot

export const GREEKS_DETAILED_EXPLANATION = {
  delta: {
    definition: "Delta (Δ) đo lường độ thay đổi giá warrant khi giá underlying thay đổi 1 đơn vị.",
    formula: "Δ_warrant = Δ_option / Conversion Ratio",
    calculation: `
Call Delta Option: Δ_call = N(d₁)
Put Delta Option: Δ_put = N(d₁) - 1 = -N(-d₁)

QUAN TRỌNG - Conversion Ratio:
Δ_warrant = Δ_option / Tỷ lệ chuyển đổi

Ví dụ: Nếu conversion ratio = 8.7:
- Delta option = 0.6122
- Delta warrant = 0.6122 / 8.7 = 0.0704

Trong đó d₁ = [ln(S/K) + (r + σ²/2)T] / (σ√T)
`,
    units: "Không có đơn vị, giá trị thường nhỏ hơn option do chia cho conversion ratio",
    interpretation: `
- Delta warrant = 0.0704 → Khi underlying tăng 1,000 VND, warrant tăng ~70 VND
- Delta cho biết độ nhạy THỰC TẾ của 1 warrant bạn đang nắm giữ
- ĐÃ tính conversion ratio vào
`,
    example: "Với Delta = 0.0704, nếu cổ phiếu tăng từ 100,000 lên 101,000 VND (+1,000), warrant tăng ~70 VND"
  },

  gamma: {
    definition: "Gamma (Γ) đo lường tốc độ thay đổi của Delta khi giá underlying thay đổi.",
    formula: "Γ_warrant = Γ_option / Conversion Ratio",
    calculation: `
Gamma Option: Γ = φ(d₁) / (S × σ × √T)

QUAN TRỌNG - Conversion Ratio:
Γ_warrant = Γ_option / Tỷ lệ chuyển đổi

Ví dụ: Nếu conversion ratio = 8.7:
- Gamma option = 0.000024
- Gamma warrant = 0.000024 / 8.7 = 0.0000028

Trong đó:
- φ(d₁) = (1/√2π) × e^(-d₁²/2) là PDF chuẩn normal
`,
    units: "Thay đổi Delta per 1 đơn vị giá (đã chia conversion ratio)",
    interpretation: `
- Gamma warrant RẤT NHỎ vì đã chia cho conversion ratio
- Gamma cao → Delta thay đổi nhanh → rủi ro hedging cao
- Gamma cao nhất ở ATM, thấp ở ITM/OTM
- Gamma warrant phản ánh độ nhạy THỰC TẾ của 1 warrant
`,
    commonIssues: `
⚠️ LƯU Ý: 
- Gamma warrant nhỏ hơn Gamma option rất nhiều (do chia conversion ratio)
- Đây là giá trị ĐÚNG cho 1 warrant bạn đang nắm giữ
`
  },

  vega: {
    definition: "Vega (ν) đo lường độ nhạy của giá option với thay đổi implied volatility.",
    formula: "ν = ∂V/∂σ",
    calculation: `
ν = S × φ(d₁) × √T

Trong đó φ(d₁) = (1/√2π) × e^(-d₁²/2)
`,
    units: "Thay đổi giá per 1% change in volatility",
    interpretation: `
🔴 QUAN TRỌNG - ĐƠN VỊ CHUẨN:
- Vega thường được quote theo "change per 1% vol"
- Nếu Vega = 2.36 → khi IV tăng từ 20% lên 21% (+1%), giá option tăng 2.36 VND
`,
    commonIssues: `
⚠️ QUY ƯỚC TÍNH TOÁN:

🔴 CONVERSION RATIO:
Vega_warrant = (Vega_option / 100) / Conversion Ratio

Ví dụ với conversion ratio = 8.7:
- Vega option raw = 187.11 (cho 1 option)
- Vega option normalized = 187.11 / 100 = 1.87 (per 1% vol)
- Vega warrant = 1.87 / 8.7 = 0.215 VND per 1% vol

VÍ DỤ THỰC TẾ:
- IV hiện tại = 30%
- IV mới = 31% → tăng 1%
- Giá warrant tăng = 0.215 VND (cho 1 warrant bạn nắm giữ)

✅ Đây là giá trị warrant THẬT, đã tính conversion ratio!
`,
    code_fix: `
// Code CŨ - SAI:
vega = (BS_price(S, K, r, sigma + 0.01, T) - base_price) / 0.01
// → Ra 236.27

// Code ĐÚNG:
vega = (BS_price(S, K, r, sigma + 0.01, T) - base_price) / 0.01 / 100
// hoặc
vega = (BS_price(S, K, r, sigma + 0.0001, T) - base_price) / 0.0001
// → Ra 2.36
`
  },

  theta: {
    definition: "Theta (Θ) đo lường time decay - mất giá theo thời gian.",
    formula: "Θ = ∂V/∂t (thường tính theo ngày: Θ/365)",
    calculation: `
Θ_call = -[S×φ(d₁)×σ / (2√T)] - r×K×e^(-rT)×N(d₂)

Θ_put = -[S×φ(d₁)×σ / (2√T)] + r×K×e^(-rT)×N(-d₂)
`,
    units: "Thay đổi giá per ngày (negative cho long position)",
    interpretation: `
- Theta = -22.96 → Mỗi ngày trôi qua, warrant mất ~23 VND giá trị
- Theta luôn âm cho long options (time decay)
- Theta tăng nhanh khi gần maturity
- ATM options có Theta cao nhất
`,
    example: `
Theta = -22.96:
- Hôm nay: Warrant = 1000 VND
- Ngày mai: Warrant = 1000 - 22.96 = 977.04 VND (nếu mọi thứ khác không đổi)
- 1 tuần sau: Mất ~160 VND (7 × 22.96)
`,
    note: "Theta là kẻ thù của người MUA warrant, bạn của người BÁN warrant"
  },

  rho: {
    definition: "Rho (ρ) đo lường độ nhạy của giá option với thay đổi lãi suất.",
    formula: "ρ = ∂V/∂r",
    calculation: `
ρ_call = K × T × e^(-rT) × N(d₂)

ρ_put = -K × T × e^(-rT) × N(-d₂)
`,
    units: "Thay đổi giá per 1% change in interest rate",
    interpretation: `
🔴 QUAN TRỌNG - ĐƠN VỊ CHUẨN:
- Rho thường được quote theo "change per 1% rate"
- Nếu Rho = 2.33 → khi r tăng từ 5% lên 6% (+1%), giá call tăng 2.33 VND
`,
    commonIssues: `
⚠️ SAI LẦM TƯƠNG TỰ VEGA:

❌ SAI: Rho = 233.01
Đây là raw value khi tính với Δr = 0.01 (absolute)

✅ ĐÚNG: Rho = 233.01 / 100 = 2.33
Chia cho 100 để chuyển sang "per 1% interest rate"

VÍ DỤ:
- Lãi suất hiện tại = 5% (0.05)
- Lãi suất mới = 6% (0.06) → thay đổi +1%
- Giá call tăng = Rho × 1% = 2.33 VND
`,
    note: "Rho ít quan trọng hơn các Greeks khác vì lãi suất ít thay đổi đột ngột"
  }
};

// Common calculation mistakes and how to fix them
export const CALCULATION_FIXES = {
  numerical_differentiation: {
    problem: "Numerical differentiation với h quá lớn gây sai số",
    solution: `
// Thay vì h = 0.01:
const h = 0.0001; // Nhỏ hơn để chính xác

// Central difference (chính xác hơn forward difference):
delta = (price(S + h) - price(S - h)) / (2 * h);
`,
    recommendation: "Nên dùng analytical formulas thay vì numerical"
  },

  unit_conversion: {
    problem: "Vega và Rho sai đơn vị",
    solution: `
// ĐÚNG - Tính Vega per 1% volatility:
const raw_vega = (price(sigma + 0.01) - price(sigma)) / 0.01;
const vega = raw_vega / 100; // Chia cho 100

// HOẶC dùng h nhỏ hơn:
const vega = (price(sigma + 0.0001) - price(sigma)) / 0.0001;

// Tương tự cho Rho:
const raw_rho = (price(r + 0.01) - price(r)) / 0.01;
const rho = raw_rho / 100; // Chia cho 100
`
  },

  analytical_formulas: {
    reason: "Chính xác và nhanh hơn numerical differentiation",
    code: `
// Black-Scholes Analytical Greeks
function calculateAnalyticalGreeks(S, K, r, sigma, T, isCall) {
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  
  const N = (x) => 0.5 * (1 + erf(x / Math.sqrt(2))); // CDF
  const phi = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); // PDF
  
  // Delta
  const delta = isCall ? N(d1) : N(d1) - 1;
  
  // Gamma (same for call/put)
  const gamma = phi(d1) / (S * sigma * Math.sqrt(T));
  
  // Vega (same for call/put) - per 1% vol
  const vega = S * phi(d1) * Math.sqrt(T) / 100;
  
  // Theta (per day)
  const theta_call = (
    -S * phi(d1) * sigma / (2 * Math.sqrt(T)) - 
    r * K * Math.exp(-r * T) * N(d2)
  ) / 365;
  
  const theta_put = (
    -S * phi(d1) * sigma / (2 * Math.sqrt(T)) + 
    r * K * Math.exp(-r * T) * N(-d2)
  ) / 365;
  
  const theta = isCall ? theta_call : theta_put;
  
  // Rho (per 1% rate)
  const rho = isCall 
    ? K * T * Math.exp(-r * T) * N(d2) / 100
    : -K * T * Math.exp(-r * T) * N(-d2) / 100;
  
  return { delta, gamma, vega, theta, rho };
}
`
  }
};

export default GREEKS_DETAILED_EXPLANATION; 