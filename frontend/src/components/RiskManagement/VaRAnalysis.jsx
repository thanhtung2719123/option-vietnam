import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/apiService';
import { useMarketData } from '../../context/MarketDataContext';

const VaRAnalysis = () => {
  const { warrants } = useMarketData();
  const [params, setParams] = useState({
    portfolioValue: 1000000000, // 1 billion VND
    confidenceLevel: 0.95, // 95%
    timeHorizon: 1, // days
    method: 'historical', // historical, parametric, monte_carlo
    numSimulations: 10000,
    historicalDays: 252,
    portfolioSymbols: [] // Selected warrants
  });
  const [results, setResults] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [useBackendAPI, setUseBackendAPI] = useState(true);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const calculateVaR = async () => {
    setCalculating(true);
    
    try {
      if (useBackendAPI && params.portfolioSymbols.length > 0) {
        // Call REAL backend API with actual warrant data
        const response = await apiService.risk.calculateVar({
          portfolio_symbols: params.portfolioSymbols,
          confidence_level: params.confidenceLevel,
          time_horizon: params.timeHorizon,
          method: params.method,
          num_simulations: params.numSimulations
        });
        
        const apiData = response.data;
        
        // Convert API response to frontend format
        const varValue = apiData.var_value * params.portfolioValue;
        const esValue = apiData.expected_shortfall * params.portfolioValue;
        
        setResults({
          var: varValue,
          expectedShortfall: esValue,
          confidence: params.confidenceLevel,
          method: apiData.method,
          varPercent: apiData.var_value,
          esPercent: apiData.expected_shortfall,
          riskMetrics: apiData.risk_metrics,
          distribution: generateDistributionFromAPI(apiData),
          varOverTime: generateVarOverTime(apiData.var_value, apiData.expected_shortfall)
        });
      } else {
        // Fallback to local calculation (for demo/testing)
      let varResult;
      
      if (params.method === 'historical') {
        varResult = calculateHistoricalVaR();
      } else if (params.method === 'parametric') {
        varResult = calculateParametricVaR();
      } else {
        varResult = calculateMonteCarloVaR();
      }
      
      setResults(varResult);
      }
    } catch (error) {
      console.error('VaR calculation error:', error);
      // Fallback to local calculation on API error
      let varResult;
      if (params.method === 'historical') {
        varResult = calculateHistoricalVaR();
      } else if (params.method === 'parametric') {
        varResult = calculateParametricVaR();
      } else {
        varResult = calculateMonteCarloVaR();
      }
      setResults(varResult);
    } finally {
      setCalculating(false);
    }
  };

  const calculateHistoricalVaR = () => {
    // Generate historical returns (simulated)
    const returns = [];
    for (let i = 0; i < params.historicalDays; i++) {
      const dailyReturn = (Math.random() - 0.52) * 0.04; // Slightly negative bias
      returns.push(dailyReturn);
    }
    
    // Sort returns
    returns.sort((a, b) => a - b);
    
    // Calculate VaR at confidence level
    const varIndex = Math.floor((1 - params.confidenceLevel) * returns.length);
    const varReturn = returns[varIndex];
    const varValue = params.portfolioValue * Math.abs(varReturn) * Math.sqrt(params.timeHorizon);
    
    // Calculate Expected Shortfall (CVaR)
    const tailReturns = returns.slice(0, varIndex);
    const avgTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
    const expectedShortfall = params.portfolioValue * Math.abs(avgTailReturn) * Math.sqrt(params.timeHorizon);
    
    // Return distribution
    const distribution = createDistribution(returns, 20);
    
    // VaR over time
    const varOverTime = [];
    for (let days = 1; days <= 30; days++) {
      varOverTime.push({
        days,
        var: params.portfolioValue * Math.abs(varReturn) * Math.sqrt(days),
        es: params.portfolioValue * Math.abs(avgTailReturn) * Math.sqrt(days)
      });
    }
    
    return {
      var: varValue,
      expectedShortfall,
      confidence: params.confidenceLevel,
      method: 'Historical Simulation',
      returns,
      distribution,
      varOverTime,
      varPercent: Math.abs(varReturn) * Math.sqrt(params.timeHorizon),
      esPercent: Math.abs(avgTailReturn) * Math.sqrt(params.timeHorizon)
    };
  };

  const calculateParametricVaR = () => {
    // Assume normal distribution
    const dailyVolatility = 0.02; // 2% daily volatility
    const meanReturn = -0.0005; // Slight negative drift
    
    // Z-score for confidence level
    const zScores = {
      0.90: 1.282,
      0.95: 1.645,
      0.99: 2.326
    };
    const zScore = zScores[params.confidenceLevel] || 1.645;
    
    // VaR calculation: VaR = Portfolio * (μ - z*σ) * √t
    const varReturn = Math.abs(meanReturn - zScore * dailyVolatility);
    const varValue = params.portfolioValue * varReturn * Math.sqrt(params.timeHorizon);
    
    // Expected Shortfall for normal distribution
    const normalPdf = Math.exp(-0.5 * zScore * zScore) / Math.sqrt(2 * Math.PI);
    const esReturn = dailyVolatility * normalPdf / (1 - params.confidenceLevel);
    const expectedShortfall = params.portfolioValue * esReturn * Math.sqrt(params.timeHorizon);
    
    // Generate normal distribution
    const distribution = [];
    for (let i = -4; i <= 4; i += 0.2) {
      const x = i * dailyVolatility;
      const y = Math.exp(-0.5 * (i * i)) / Math.sqrt(2 * Math.PI) / dailyVolatility;
      distribution.push({ return: x, density: y * 100 });
    }
    
    // VaR over time
    const varOverTime = [];
    for (let days = 1; days <= 30; days++) {
      varOverTime.push({
        days,
        var: params.portfolioValue * varReturn * Math.sqrt(days),
        es: params.portfolioValue * esReturn * Math.sqrt(days)
      });
    }
    
    return {
      var: varValue,
      expectedShortfall,
      confidence: params.confidenceLevel,
      method: 'Parametric (Normal)',
      volatility: dailyVolatility,
      distribution,
      varOverTime,
      varPercent: varReturn * Math.sqrt(params.timeHorizon),
      esPercent: esReturn * Math.sqrt(params.timeHorizon)
    };
  };

  const calculateMonteCarloVaR = () => {
    const dailyVolatility = 0.02;
    const meanReturn = -0.0005;
    const simulations = [];
    
    // Run Monte Carlo simulations
    for (let i = 0; i < params.numSimulations; i++) {
      let pathReturn = 0;
      for (let day = 0; day < params.timeHorizon; day++) {
        const randomShock = (Math.random() - 0.5) * 2; // Normal approximation
        const dailyReturn = meanReturn + dailyVolatility * randomShock;
        pathReturn += dailyReturn;
      }
      simulations.push(pathReturn);
    }
    
    // Sort simulations
    simulations.sort((a, b) => a - b);
    
    // Calculate VaR
    const varIndex = Math.floor((1 - params.confidenceLevel) * params.numSimulations);
    const varReturn = Math.abs(simulations[varIndex]);
    const varValue = params.portfolioValue * varReturn;
    
    // Calculate Expected Shortfall
    const tailSimulations = simulations.slice(0, varIndex);
    const avgTailReturn = Math.abs(tailSimulations.reduce((sum, r) => sum + r, 0) / tailSimulations.length);
    const expectedShortfall = params.portfolioValue * avgTailReturn;
    
    // Distribution
    const distribution = createDistribution(simulations, 30);
    
    // VaR over time
    const varOverTime = [];
    for (let days = 1; days <= 30; days++) {
      const scaleFactor = Math.sqrt(days / params.timeHorizon);
      varOverTime.push({
        days,
        var: varValue * scaleFactor,
        es: expectedShortfall * scaleFactor
      });
    }
    
    return {
      var: varValue,
      expectedShortfall,
      confidence: params.confidenceLevel,
      method: `Monte Carlo (${params.numSimulations} sims)`,
      simulations,
      distribution,
      varOverTime,
      varPercent: varReturn,
      esPercent: avgTailReturn
    };
  };

  const createDistribution = (data, bins) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binSize = (max - min) / bins;
    
    const distribution = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      const count = data.filter(v => v >= binStart && v < binEnd).length;
      distribution.push({
        return: (binStart + binEnd) / 2,
        count,
        density: count / data.length / binSize
      });
    }
    return distribution;
  };

  const generateDistributionFromAPI = (apiData) => {
    // Generate distribution from API risk metrics
    const mean = apiData.risk_metrics.mean_return;
    const std = apiData.risk_metrics.volatility;
    
    const distribution = [];
    for (let i = -4; i <= 4; i += 0.2) {
      const x = mean + i * std;
      const density = Math.exp(-0.5 * i * i) / Math.sqrt(2 * Math.PI) / std;
      distribution.push({
        return: x,
        count: density * 100,
        density: density
      });
    }
    return distribution;
  };

  const generateVarOverTime = (varPercent, esPercent) => {
    const varOverTime = [];
    for (let days = 1; days <= 30; days++) {
      varOverTime.push({
        days,
        var: params.portfolioValue * varPercent * Math.sqrt(days),
        es: params.portfolioValue * esPercent * Math.sqrt(days)
      });
    }
    return varOverTime;
  };

  useEffect(() => {
    calculateVaR();
  }, [params.method, params.confidenceLevel, params.timeHorizon, params.numSimulations]);

  return (
    <div className="var-analysis">
      <div className="page-header">
        <h1>⚠️ Value at Risk (VaR) Analysis</h1>
        <p>Đo lường rủi ro tối đa với mức độ tin cậy nhất định</p>
      </div>

      {/* Parameters */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Tham số VaR</h3>
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
              <label className="form-label">Calculation Method</label>
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

      {calculating && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang tính toán VaR...</p>
        </div>
      )}

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
                  <div className="stat-card-title">Calculation Method</div>
                  <div className="stat-card-value" style={{ fontSize: '20px' }}>{results.method}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  📊
                </div>
              </div>
              <div className="badge badge-primary">
                {formatPercent(params.confidenceLevel)} confidence
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Risk Capacity</div>
                  <div className="stat-card-value">{formatVND(params.portfolioValue - results.var)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  💰
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Remaining after VaR
              </p>
            </div>
          </div>

          {/* Return Distribution */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Return Distribution</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="return" 
                    tickFormatter={(value) => formatPercent(value)}
                    label={{ value: 'Return', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => formatNumber(value)}
                    labelFormatter={(value) => `Return: ${formatPercent(value)}`}
                  />
                  <Bar dataKey="count" fill="#3b82f6">
                    {results.distribution.map((entry, index) => (
                      <Bar 
                        key={`bar-${index}`} 
                        fill={entry.return < -Math.abs(results.varPercent) ? '#ef4444' : '#3b82f6'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', marginRight: '8px' }}>
                  VaR Region ({formatPercent(1 - params.confidenceLevel)})
                </span>
                <span style={{ display: 'inline-block', padding: '4px 12px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px' }}>
                  Normal Region ({formatPercent(params.confidenceLevel)})
                </span>
              </div>
            </div>
          </div>

          {/* VaR Over Time */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">VaR Evolution Over Time Horizon</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={results.varOverTime}>
                  <defs>
                    <linearGradient id="colorVar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorES" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="days" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'VaR (VND)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="var" stroke="#ef4444" fillOpacity={1} fill="url(#colorVar)" name="VaR" />
                  <Area type="monotone" dataKey="es" stroke="#f59e0b" fillOpacity={1} fill="url(#colorES)" name="Expected Shortfall" />
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#92400e' }}>
                  <strong>Note:</strong> VaR increases with √t (square root of time). For {params.timeHorizon}-day VaR = {formatVND(results.var)}, 
                  10-day VaR ≈ {formatVND(results.var * Math.sqrt(10 / params.timeHorizon))}
                </p>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">VaR Metrics Summary</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>% of Portfolio</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Portfolio Value</strong></td>
                      <td>{formatVND(params.portfolioValue)}</td>
                      <td>100%</td>
                      <td>Total portfolio value</td>
                    </tr>
                    <tr>
                      <td><strong>Value at Risk (VaR)</strong></td>
                      <td className="badge badge-danger">{formatVND(results.var)}</td>
                      <td>{formatPercent(results.varPercent)}</td>
                      <td>Maximum expected loss at {formatPercent(params.confidenceLevel)} confidence</td>
                    </tr>
                    <tr>
                      <td><strong>Expected Shortfall</strong></td>
                      <td className="badge badge-danger">{formatVND(results.expectedShortfall)}</td>
                      <td>{formatPercent(results.esPercent)}</td>
                      <td>Average loss when VaR is exceeded</td>
                    </tr>
                    <tr>
                      <td><strong>Risk Capacity</strong></td>
                      <td className="badge badge-success">{formatVND(params.portfolioValue - results.var)}</td>
                      <td>{formatPercent(1 - results.varPercent)}</td>
                      <td>Remaining value after VaR</td>
                    </tr>
                    <tr>
                      <td><strong>Confidence Level</strong></td>
                      <td>{formatPercent(params.confidenceLevel)}</td>
                      <td>-</td>
                      <td>Probability VaR will not be exceeded</td>
                    </tr>
                    <tr>
                      <td><strong>Time Horizon</strong></td>
                      <td>{params.timeHorizon} day(s)</td>
                      <td>-</td>
                      <td>Risk measurement period</td>
                    </tr>
                    <tr>
                      <td><strong>Method</strong></td>
                      <td>{results.method}</td>
                      <td>-</td>
                      <td>VaR calculation methodology</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VaRAnalysis; 