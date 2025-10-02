# 🔌 FRONTEND INTEGRATION GUIDE

## Mục tiêu: Connect Frontend Components → Backend APIs

---

## ✅ WHAT'S BEEN DONE

### 1. **Created useRiskAPI Hook** ✅
**File:** `frontend/src/hooks/useRiskAPI.js`

This hook provides:
```javascript
const { calculateVaR, runStressTest, analyzeTaylorSeries, getWarrantGreeks } = useRiskAPI();
```

### 2. **Fixed WarrantComparison** ✅
**File:** `frontend/src/components/WarrantAnalysis/WarrantComparison.jsx`
- ✅ Already calls backend API: `apiService.warrants.getGreeks()`
- ✅ Fixed formatGreek() calls
- ✅ Displays real Greeks from backend

### 3. **Enhanced StressTesting** ✅  
**File:** `frontend/src/components/RiskManagement/StressTesting.jsx`
- ✅ Fixed theta decay formula
- ⏳ Can be connected to backend API

---

## 🔄 COMPONENTS TO UPDATE

### Component 1: VaRAnalysis.jsx

**Current:** Uses hardcoded simulation
**Target:** Call `apiService.risk.calculateVar()`

#### ✅ Implementation:
```javascript
import { useRiskAPI } from '../../hooks/useRiskAPI';

const VaRAnalysis = () => {
  const { calculateVaR, loading, error } = useRiskAPI();
  const { warrants } = useMarketData();
  
  const [selectedWarrants, setSelectedWarrants] = useState([]);
  const [params, setParams] = useState({
    confidenceLevel: 0.95,
    timeHorizon: 1,
    method: 'historical'
  });

  const handleCalculate = async () => {
    try {
      const result = await calculateVaR(selectedWarrants, params);
      
      // result contains:
      // - var_value
      // - expected_shortfall  
      // - risk_metrics { mean_return, volatility, skewness, kurtosis }
      
      setResults({
        var: result.var_value * portfolioValue,
        expectedShortfall: result.expected_shortfall * portfolioValue,
        varPercent: result.var_value,
        esPercent: result.expected_shortfall,
        riskMetrics: result.risk_metrics
      });
    } catch (err) {
      console.error('VaR calculation failed:', err);
    }
  };
};
```

---

### Component 2: StressTesting.jsx

**Current:** Uses hardcoded positions
**Target:** Call `apiService.risk.stressTest()`

#### ✅ Implementation:
```javascript
import { useRiskAPI } from '../../hooks/useRiskAPI';

const StressTesting = () => {
  const { runStressTest, loading } = useRiskAPI();
  
  const handleStressTest = async () => {
    const scenarios = [
      { name: 'Market Crash', price_shock: -0.30, vol_shock: 1.5 },
      { name: 'Flash Crash', price_shock: -0.15, vol_shock: 2.0 }
    ];
    
    try {
      const result = await runStressTest(
        selectedWarrants,
        scenarios,
        portfolioValue
      );
      
      // result contains:
      // - stress_results: Array of scenario results
      // - worst_case_scenario: Worst scenario details
      // - recommendations: Risk recommendations
      
      setResults(result);
    } catch (err) {
      console.error('Stress test failed:', err);
    }
  };
};
```

---

### Component 3: GreeksRisk.jsx

**Current:** Hardcoded Greeks
**Target:** Use real Greeks + Second-order Greeks

#### ✅ Implementation:
```javascript
import { useRiskAPI } from '../../hooks/useRiskAPI';

const GreeksRisk = () => {
  const { getWarrantGreeks, analyzeTaylorSeries } = useRiskAPI();
  
  const analyzeGreeksRisk = async (symbol) => {
    try {
      // Get Greeks from backend (includes Delta, Gamma, Vega, Theta, Rho)
      const greeks = await getWarrantGreeks(symbol);
      
      // greeks contains:
      // - theoretical_price
      // - greeks: { delta, gamma, vega, theta, rho }
      // - spot_price
      // - volatility
      
      // For second-order Greeks (Vanna, Volga), use Taylor series endpoint
      const taylor = await analyzeTaylorSeries(symbol, {
        spotPrice: greeks.spot_price,
        priceShock: shockSize / 100,
        volatilityShock: 0.05
      });
      
      // taylor contains:
      // - gamma_contribution
      // - vega_contribution  
      // - theta_contribution
      // - error_breakdown (includes Vanna effects)
      
      setRiskAnalysis({ greeks, taylor });
    } catch (err) {
      console.error('Greeks risk analysis failed:', err);
    }
  };
};
```

---

### Component 4: PortfolioRisk.jsx

**Current:** Simulated portfolio
**Target:** Use real portfolio with covariance VaR

#### ✅ Implementation:
```javascript
const PortfolioRisk = () => {
  const { getWarrantGreeks } = useRiskAPI();
  
  const analyzePortfolio = async (selectedWarrants) => {
    try {
      // Get Greeks for each warrant
      const greeksPromises = selectedWarrants.map(symbol => 
        getWarrantGreeks(symbol)
      );
      const allGreeks = await Promise.all(greeksPromises);
      
      // Calculate portfolio Greeks
      const portfolioGreeks = {
        netDelta: allGreeks.reduce((sum, g) => sum + g.greeks.delta * quantities[g.symbol], 0),
        netGamma: allGreeks.reduce((sum, g) => sum + g.greeks.gamma * quantities[g.symbol], 0),
        netVega: allGreeks.reduce((sum, g) => sum + g.greeks.vega * quantities[g.symbol], 0),
        netTheta: allGreeks.reduce((sum, g) => sum + g.greeks.theta * quantities[g.symbol], 0)
      };
      
      // Note: Covariance VaR calculation should be added to backend API
      // For now, use portfolio Greeks for risk analysis
      
      setPortfolioData({ positions: allGreeks, portfolioGreeks });
    } catch (err) {
      console.error('Portfolio analysis failed:', err);
    }
  };
};
```

---

### Component 5: MonteCarloViz.jsx

**Current:** Client-side simulation
**Target:** Can keep client-side for visualization OR connect to backend

#### Option A: Keep Client-Side (Good for UI responsiveness)
```javascript
// Current implementation is fine for visualization
// Monte Carlo simulation is fast enough to run client-side
```

#### Option B: Connect to Backend (For production accuracy)
```javascript
const MonteCarloViz = () => {
  const { calculateVaR } = useRiskAPI();
  
  const runSimulation = async () => {
    const result = await calculateVaR(
      [selectedWarrant],
      { method: 'monte_carlo', numSimulations: params.numSimulations }
    );
    
    // Use backend simulation results
    setSimulationResults(result);
  };
};
```

---

## 🔧 STEP-BY-STEP INTEGRATION

### Step 1: Add Backend API Switch (All Components)

Add toggle để switch giữa backend API và local simulation:

```javascript
const [useBackendAPI, setUseBackendAPI] = useState(true);

// In render:
<div className="form-check form-switch">
  <input
    type="checkbox"
    checked={useBackendAPI}
    onChange={(e) => setUseBackendAPI(e.target.checked)}
  />
  <label>Use Backend API (Real Data)</label>
</div>
```

### Step 2: Conditional Calculation

```javascript
const calculate = async () => {
  if (useBackendAPI) {
    // Call backend API
    const result = await calculateVaR(symbols, params);
    setResults(convertAPItoFrontendFormat(result));
  } else {
    // Use local simulation (for demo)
    const result = calculateLocal();
    setResults(result);
  }
};
```

### Step 3: Error Handling

```javascript
try {
  const result = await calculateVaR(symbols, params);
  setResults(result);
} catch (err) {
  console.error('API error:', err);
  // Fallback to local calculation
  const fallbackResult = calculateLocal();
  setResults(fallbackResult);
  setError('API failed, using local calculation');
}
```

---

## 📝 EXAMPLE: Complete VaRAnalysis Integration

```javascript
import React, { useState } from 'react';
import { useRiskAPI } from '../../hooks/useRiskAPI';
import { useMarketData } from '../../context/MarketDataContext';

const VaRAnalysis = () => {
  const { calculateVaR, loading } = useRiskAPI();
  const { warrants } = useMarketData();
  
  const [selectedWarrants, setSelectedWarrants] = useState([]);
  const [params, setParams] = useState({
    portfolioValue: 1000000000,
    confidenceLevel: 0.95,
    timeHorizon: 1,
    method: 'historical'
  });
  const [results, setResults] = useState(null);

  const handleCalculate = async () => {
    if (selectedWarrants.length === 0) {
      alert('Please select at least one warrant');
      return;
    }
    
    try {
      const apiResult = await calculateVaR(selectedWarrants, params);
      
      // Convert API response to component format
      setResults({
        var: apiResult.var_value * params.portfolioValue,
        expectedShortfall: apiResult.expected_shortfall * params.portfolioValue,
        varPercent: apiResult.var_value,
        esPercent: apiResult.expected_shortfall,
        method: apiResult.method,
        riskMetrics: apiResult.risk_metrics
      });
    } catch (error) {
      console.error('Failed to calculate VaR:', error);
    }
  };

  return (
    <div className="var-analysis">
      {/* Warrant Selection */}
      <div className="card mb-3">
        <div className="card-header">
          <h3>Select Warrants</h3>
        </div>
        <div className="card-body">
          {warrants.slice(0, 10).map(w => (
            <button
              key={w.symbol}
              onClick={() => toggleSelection(w.symbol)}
              className={selectedWarrants.includes(w.symbol) ? 'selected' : ''}
            >
              {w.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Calculate Button */}
      <button onClick={handleCalculate} disabled={loading}>
        {loading ? 'Calculating...' : 'Calculate VaR'}
      </button>

      {/* Results Display */}
      {results && (
        <div className="results">
          <h3>VaR: {formatVND(results.var)}</h3>
          <h3>CVaR: {formatVND(results.expectedShortfall)}</h3>
          <p>Method: {results.method}</p>
          <p>Skewness: {results.riskMetrics.skewness.toFixed(4)}</p>
          <p>Kurtosis: {results.riskMetrics.kurtosis.toFixed(4)}</p>
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 INTEGRATION PRIORITY

### High Priority (Connect now):
1. ✅ **VaRAnalysis** - Call `/api/v1/risk/var`
2. ✅ **StressTesting** - Call `/api/v1/risk/stress-test`
3. ✅ **GreeksRisk** - Call `/api/v1/risk/taylor-series`

### Medium Priority:
4. **PortfolioRisk** - Aggregate Greeks from multiple warrants
5. **MonteCarloViz** - Optional (client-side OK)

### Already Working:
✅ **WarrantComparison** - Already uses `apiService.warrants.getGreeks()`

---

## 🚀 QUICK INTEGRATION (Copy-Paste Ready)

### For VaRAnalysis.jsx:

Add at top:
```javascript
import { useRiskAPI } from '../../hooks/useRiskAPI';
const { calculateVaR, loading, error } = useRiskAPI();
```

Replace `calculateVaR()` function:
```javascript
const calculateVaR = async () => {
  if (selectedWarrants.length === 0) return;
  
  try {
    const result = await calculateVaR(selectedWarrants, {
      confidenceLevel: params.confidenceLevel,
      timeHorizon: params.timeHorizon,
      method: params.method,
      numSimulations: params.numSimulations
    });
    
    setResults({
      var: result.var_value * params.portfolioValue,
      expectedShortfall: result.expected_shortfall * params.portfolioValue,
      varPercent: result.var_value,
      esPercent: result.expected_shortfall,
      riskMetrics: result.risk_metrics
    });
  } catch (err) {
    console.error('VaR failed:', err);
  }
};
```

---

## 📊 API ENDPOINTS AVAILABLE

### 1. VaR Calculation
```
POST /api/v1/risk/var

Request:
{
  "portfolio_symbols": ["CVNM2501", "CHPG2502"],
  "confidence_level": 0.95,
  "time_horizon": 1,
  "method": "historical",
  "num_simulations": 10000
}

Response:
{
  "var_value": 0.0326,
  "expected_shortfall": 0.0410,
  "risk_metrics": {
    "mean_return": 0.0005,
    "volatility": 0.0200,
    "skewness": -0.1234,
    "kurtosis": 0.5678,
    "sharpe_ratio": 0.025
  },
  "method": "historical",
  "confidence_level": 0.95,
  "time_horizon": 1
}
```

### 2. Stress Testing
```
POST /api/v1/risk/stress-test

Request:
{
  "portfolio_symbols": ["CVNM2501"],
  "stress_scenarios": [
    {
      "name": "Market Crash",
      "price_shock": -0.30,
      "vol_shock": 1.5
    }
  ],
  "base_portfolio_value": 1000000000
}

Response:
{
  "stress_results": [...],
  "worst_case_scenario": {...},
  "recommendations": {
    "risk_level": "HIGH",
    "recommended_action": "..."
  }
}
```

### 3. Taylor Series (Greeks Risk)
```
POST /api/v1/risk/taylor-series

Request:
{
  "warrant_symbol": "CVNM2501",
  "spot_price": 50000,
  "price_shock": 0.10,
  "volatility_shock": 0.05,
  "time_decay": 1.0
}

Response:
{
  "hedging_error": 123.45,
  "gamma_contribution": 100.23,
  "vega_contribution": 20.15,
  "theta_contribution": 3.07,
  "error_breakdown": {...}
}
```

### 4. Get Warrant Greeks (Already Working)
```
GET /api/v1/warrants/{symbol}/greeks

Response:
{
  "theoretical_price": 2500,
  "market_option_price": 2450,
  "spot_price": 50000,
  "greeks": {
    "delta": 0.6234,
    "gamma": 0.000045,
    "vega": 0.1234,
    "theta": -0.0567,
    "rho": 0.0234
  },
  "volatility": 0.2850
}
```

---

## 💡 BENEFITS OF BACKEND INTEGRATION

### Before (Hardcoded):
❌ Fake simulated data
❌ No real warrant prices
❌ No real volatility
❌ No second-order Greeks

### After (Backend API):
✅ Real market data from vnstock
✅ Calculated from actual warrant prices
✅ Historical volatility from market
✅ Can add Vanna/Volga later

---

## 🔄 MIGRATION STRATEGY

### Strategy 1: Gradual Migration (RECOMMENDED)
```javascript
const [dataSource, setDataSource] = useState('backend'); // or 'local'

const calculate = async () => {
  if (dataSource === 'backend') {
    // Use backend API
    const result = await calculateVaR(symbols, params);
  } else {
    // Keep local calculation as fallback
    const result = calculateLocal();
  }
};
```

### Strategy 2: Backend with Fallback
```javascript
const calculate = async () => {
  try {
    // Try backend first
    const result = await calculateVaR(symbols, params);
    setResults(result);
  } catch (err) {
    console.warn('Backend failed, using local:', err);
    // Fallback to local
    const result = calculateLocal();
    setResults(result);
  }
};
```

---

## 📋 INTEGRATION CHECKLIST

### VaRAnalysis.jsx:
- [x] Import useRiskAPI hook
- [x] Add warrant selection UI
- [ ] Call calculateVaR() API
- [ ] Display API results
- [ ] Add backend/local toggle
- [ ] Test with real warrants

### StressTesting.jsx:
- [ ] Import useRiskAPI hook
- [ ] Call runStressTest() API
- [ ] Map API results to UI
- [ ] Add backend/local toggle
- [ ] Test stress scenarios

### GreeksRisk.jsx:
- [ ] Import useRiskAPI hook
- [ ] Call analyzeTaylorSeries() API
- [ ] Display Vanna/Volga effects
- [ ] Add backend/local toggle

### PortfolioRisk.jsx:
- [ ] Import useRiskAPI hook
- [ ] Aggregate Greeks from multiple warrants
- [ ] Display covariance metrics
- [ ] Add correlation matrix viz

---

## 🎯 RECOMMENDED ACTION

### Option 1: Full Integration (1-2 hours)
Update all 4 components to use backend APIs completely

### Option 2: Hybrid Approach (30 mins)
- Keep WarrantComparison (already working)
- Add toggle to VaRAnalysis for backend/local
- Keep others as demo for now

### Option 3: Priority Integration (Recommended - 45 mins)
1. ✅ VaRAnalysis - Call backend VaR API
2. ✅ WarrantComparison - Already working
3. ⏳ StressTesting - Add toggle
4. ⏳ GreeksRisk - Show second-order Greeks info
5. ⏳ PortfolioRisk - Keep as demo

---

## 🚀 NEXT STEPS

Tôi có thể:

1. **Full Update All Components** (tốn 1-2 hours)
   - Update tất cả 4 components
   - Full backend integration
   - Remove all hardcoded data

2. **Quick Priority Update** (30-45 mins)
   - Update VaRAnalysis với backend toggle
   - Add warrant selector  
   - Keep others as hybrid

3. **Create Enhanced Versions** (1 hour)
   - Tạo versions mới: VaRAnalysisEnhanced.jsx
   - Keep originals as fallback
   - Progressive migration

Bạn muốn approach nào? Tôi recommend **Option 2** - hybrid approach với toggle để user có thể test cả 2! 🚀 