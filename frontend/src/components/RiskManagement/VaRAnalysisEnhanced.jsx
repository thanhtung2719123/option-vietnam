import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRiskAPI } from '../../hooks/useRiskAPI';
import { useMarketData } from '../../context/MarketDataContext';

/**
 * Enhanced VaR Analysis Component
 * Connects to backend API for REAL VaR calculations using actual warrant data
 * 
 * Features:
 * - 3 VaR methods: Historical, Parametric, Monte Carlo
 * - Backend API integration (toggle ON/OFF)
 * - Real warrant selection
 * - Proper CVaR calculation
 */
const VaRAnalysisEnhanced = () => {
  const { warrants } = useMarketData();
  const { calculateVaR: apiCalculateVaR, loading: apiLoading, error: apiError } = useRiskAPI();
  
  const [selectedWarrants, setSelectedWarrants] = useState([]);
  const [params, setParams] = useState({
    portfolioValue: 1000000000,
    confidenceLevel: 0.95,
    timeHorizon: 1,
    method: 'historical',
    numSimulations: 10000
  });
  const [results, setResults] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [useBackendAPI, setUseBackendAPI] = useState(true);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const toggleWarrantSelection = (symbol) => {
    setSelectedWarrants(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const calculateVaR = async () => {
    if (selectedWarrants.length === 0 && useBackendAPI) {
      alert('Please select at least one warrant for portfolio VaR');
      return;
    }

    setCalculating(true);

    try {
      if (useBackendAPI) {
        // ✅ CALL BACKEND API WITH REAL DATA
        const apiResult = await apiCalculateVaR(selectedWarrants, {
          confidenceLevel: params.confidenceLevel,
          timeHorizon: params.timeHorizon,
          method: params.method,
          numSimulations: params.numSimulations
        });

        // Convert API response
        const varOverTime = [];
        for (let days = 1; days <= 30; days++) {
          varOverTime.push({
            days,
            var: apiResult.var_value * params.portfolioValue * Math.sqrt(days),
            es: apiResult.expected_shortfall * params.portfolioValue * Math.sqrt(days)
          });
        }

        setResults({
          var: apiResult.var_value * params.portfolioValue,
          expectedShortfall: apiResult.expected_shortfall * params.portfolioValue,
          varPercent: apiResult.var_value,
          esPercent: apiResult.expected_shortfall,
          confidence: params.confidenceLevel,
          method: `${apiResult.method.toUpperCase()} (Backend API)`,
          riskMetrics: apiResult.risk_metrics,
          varOverTime,
          distribution: generateNormalDistribution(
            apiResult.risk_metrics.mean_return,
            apiResult.risk_metrics.volatility
          )
        });
      } else {
        // Local calculation fallback (for testing)
        const localResult = calculateLocalVaR();
        setResults(localResult);
      }
    } catch (error) {
      console.error('VaR calculation error:', error);
      alert(`Backend API failed: ${error.message}. Using local calculation.`);
      const localResult = calculateLocalVaR();
      setResults(localResult);
    } finally {
      setCalculating(false);
    }
  };

  const calculateLocalVaR = () => {
    // Simple local implementation (fallback)
    const dailyVol = 0.02;
    const zScore = params.confidenceLevel === 0.95 ? 1.645 : params.confidenceLevel === 0.99 ? 2.326 : 1.282;
    const varValue = params.portfolioValue * dailyVol * zScore * Math.sqrt(params.timeHorizon);
    const esValue = varValue * 1.25; // Approximate CVaR

    const varOverTime = [];
    for (let days = 1; days <= 30; days++) {
      varOverTime.push({
        days,
        var: params.portfolioValue * dailyVol * zScore * Math.sqrt(days),
        es: params.portfolioValue * dailyVol * zScore * Math.sqrt(days) * 1.25
      });
    }

    return {
      var: varValue,
      expectedShortfall: esValue,
      varPercent: dailyVol * zScore * Math.sqrt(params.timeHorizon),
      esPercent: dailyVol * zScore * Math.sqrt(params.timeHorizon) * 1.25,
      confidence: params.confidenceLevel,
      method: `${params.method.toUpperCase()} (Local)`,
      varOverTime,
      distribution: generateNormalDistribution(0.0005, dailyVol)
    };
  };

  const generateNormalDistribution = (mean, std) => {
    const distribution = [];
    for (let i = -4; i <= 4; i += 0.2) {
      const x = mean + i * std;
      const density = Math.exp(-0.5 * i * i) / Math.sqrt(2 * Math.PI) / std;
      distribution.push({
        return: x,
        count: density * 50,
        density: density
      });
    }
    return distribution;
  };

  useEffect(() => {
    if (results) {
      calculateVaR();
    }
  }, [params.method, params.confidenceLevel, params.timeHorizon]);

  return (
    <div className="var-analysis">
      <div className="page-header">
        <h1>⚠️ Value at Risk (VaR) Analysis {useBackendAPI ? '(Backend API ✅)' : '(Local Demo)'}</h1>
        <p>Đo lường rủi ro tối đa với mức độ tin cậy nhất định</p>
      </div>

      {/* API Toggle & Warrant Selection */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Configuration</h3>
          <div className="form-check form-switch" style={{ display: 'inline-block', marginLeft: '20px' }}>
            <input
              className="form-check-input"
              type="checkbox"
              checked={useBackendAPI}
              onChange={(e) => setUseBackendAPI(e.target.checked)}
              id="apiToggle"
            />
            <label className="form-check-label" htmlFor="apiToggle">
              {useBackendAPI ? '✅ Backend API (Real Data)' : '📊 Local Demo'}
            </label>
          </div>
        </div>
        <div className="card-body">
          {useBackendAPI && (
            <>
              <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>Select Warrants for Portfolio:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {(warrants || []).slice(0, 20).map(warrant => (
                  <div
                    key={warrant.symbol}
                    onClick={() => toggleWarrantSelection(warrant.symbol)}
                    style={{
                      padding: '8px',
                      border: selectedWarrants.includes(warrant.symbol) ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedWarrants.includes(warrant.symbol) ? 'rgba(59, 130, 246, 0.1)' : 'white',
                      fontSize: '12px',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    {warrant.symbol}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Selected: {selectedWarrants.length} warrants
                {selectedWarrants.length > 0 && ` (${selectedWarrants.join(', ')})`}
              </p>
            </>
          )}
          {!useBackendAPI && (
            <p style={{ fontSize: '14px', color: '#f59e0b', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
              🔄 Using local simulation for demo purposes. Toggle "Backend API" for real calculations.
            </p>
          )}
        </div>
      </div>

      {/* Calculate Button */}
      <div className="card mb-3">
        <div className="card-body text-center">
          <button
            className="btn btn-primary btn-lg"
            onClick={calculateVaR}
            disabled={calculating || apiLoading}
            style={{ minWidth: '200px' }}
          >
            {calculating || apiLoading ? '⏳ Calculating...' : '📊 Calculate VaR'}
          </button>
          {apiError && (
            <p style={{ color: '#ef4444', marginTop: '12px' }}>
              API Error: {apiError}
            </p>
          )}
        </div>
      </div>

      {/* VaR Parameters */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">VaR Parameters</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Portfolio Value (VND)</label>
              <input
                type="number"
                className="form-control"
                value={params.portfolioValue}
                onChange={(e) => handleParamChange('portfolioValue', parseFloat(e.target.value))}
                step="100000000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confidence Level</label>
              <select
                className="form-control"
                value={params.confidenceLevel}
                onChange={(e) => handleParamChange('confidenceLevel', parseFloat(e.target.value))}
              >
                <option value="0.90">90%</option>
                <option value="0.95">95%</option>
                <option value="0.99">99%</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Time Horizon (days)</label>
              <input
                type="number"
                className="form-control"
                value={params.timeHorizon}
                onChange={(e) => handleParamChange('timeHorizon', parseInt(e.target.value))}
                min="1"
                max="30"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Method</label>
              <select
                className="form-control"
                value={params.method}
                onChange={(e) => handleParamChange('method', e.target.value)}
              >
                <option value="historical">Historical Simulation</option>
                <option value="parametric">Parametric (Normal)</option>
                <option value="monte_carlo">Monte Carlo</option>
              </select>
            </div>

            {params.method === 'monte_carlo' && (
              <div className="form-group">
                <label className="form-label">Simulations</label>
                <input
                  type="number"
                  className="form-control"
                  value={params.numSimulations}
                  onChange={(e) => handleParamChange('numSimulations', parseInt(e.target.value))}
                  step="1000"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Display */}
      {results && !calculating && (
        <>
          {/* VaR Summary */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Value at Risk (VaR)</div>
                  <div className="stat-card-value">{formatVND(results.var)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  ⚠️
                </div>
              </div>
              <div className="badge badge-danger">
                {formatPercent(results.varPercent)} of portfolio
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {formatPercent(results.confidence)} confidence, {params.timeHorizon} day(s)
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Expected Shortfall (CVaR)</div>
                  <div className="stat-card-value">{formatVND(results.expectedShortfall)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  📉
                </div>
              </div>
              <div className="badge badge-danger">
                {formatPercent(results.esPercent)} of portfolio
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Average loss beyond VaR
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Method</div>
                  <div className="stat-card-value" style={{ fontSize: '18px' }}>{results.method}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  {useBackendAPI ? '🔌' : '💻'}
                </div>
              </div>
              <div className="badge badge-primary">
                {useBackendAPI ? 'Backend API' : 'Local Demo'}
              </div>
            </div>

            {results.riskMetrics && (
              <div className="stat-card">
                <div className="stat-card-header">
                  <div>
                    <div className="stat-card-title">Risk Metrics</div>
                    <div className="stat-card-value" style={{ fontSize: '16px' }}>
                      Sharpe: {results.riskMetrics.sharpe_ratio.toFixed(3)}
                    </div>
                  </div>
                  <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    📊
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Skew: {results.riskMetrics.skewness.toFixed(3)}, 
                  Kurt: {results.riskMetrics.kurtosis.toFixed(3)}
                </p>
              </div>
            )}
          </div>

          {/* VaR Over Time Chart */}
          {results.varOverTime && (
            <div className="card mb-3">
              <div className="card-header">
                <h3 className="card-title">VaR Evolution (√t Scaling)</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={results.varOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="days" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'VaR (VND)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => formatVND(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="var" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="VaR" />
                    <Area type="monotone" dataKey="es" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Expected Shortfall" />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                    <strong>√t Scaling:</strong> VaR grows with square root of time. 
                    1-day VaR = {formatVND(results.varPercent * params.portfolioValue)}, 
                    10-day VaR ≈ {formatVND(results.varPercent * params.portfolioValue * Math.sqrt(10))}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!results && !calculating && (
        <div className="card">
          <div className="card-body text-center" style={{ padding: '60px' }}>
            <p style={{ fontSize: '16px', color: '#64748b' }}>
              {useBackendAPI 
                ? '👆 Select warrants and click "Calculate VaR" to get real risk metrics from backend'
                : '👆 Click "Calculate VaR" to see demo risk metrics'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaRAnalysisEnhanced; 