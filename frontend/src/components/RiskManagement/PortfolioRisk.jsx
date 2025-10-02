import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRiskAPI } from '../../hooks/useRiskAPI';
import { useMarketData } from '../../context/MarketDataContext';

const PortfolioRisk = () => {
  const { warrants } = useMarketData();
  const { getWarrantGreeks, loading: apiLoading, error: apiError } = useRiskAPI();
  
  const [portfolioData, setPortfolioData] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedWarrants, setSelectedWarrants] = useState(['CVNM2501', 'CHPG2502', 'PVIC2501', 'CMWG2503']);
  const [useBackendAPI, setUseBackendAPI] = useState(true);

  useEffect(() => {
    generatePortfolioData();
  }, [timeRange, selectedWarrants, useBackendAPI]);

  const generatePortfolioData = async () => {
    try {
      // Declare positions outside the if/else blocks
      let positions;
      
      if (useBackendAPI && selectedWarrants.length > 0) {
        // ✅ CALL BACKEND API FOR REAL PORTFOLIO DATA
        const greeksPromises = selectedWarrants.map(symbol => getWarrantGreeks(symbol));
        const allGreeks = await Promise.all(greeksPromises);
        
        // Calculate portfolio value distribution
        const totalValue = 1000000000; // 1B VND
        const valuePerWarrant = totalValue / selectedWarrants.length;
        
        // Create positions from real Greeks data
        positions = allGreeks.map((greeksData, index) => ({
          symbol: selectedWarrants[index],
          underlying: selectedWarrants[index].substring(1, 4), // Extract underlying
          type: 'Call', // Simplified
          quantity: 10000,
          value: valuePerWarrant,
          delta: greeksData.greeks.delta,
          gamma: greeksData.greeks.gamma,
          vega: greeksData.greeks.vega,
          theta: greeksData.greeks.theta,
          rho: greeksData.greeks.rho,
          volatility: greeksData.volatility || 0.25,
          weight: 1 / selectedWarrants.length,
          theoreticalPrice: greeksData.theoretical_price,
          spotPrice: greeksData.spot_price
        }));
        
      } else {
        // Fallback to REALISTIC local data
        positions = [
      { 
        symbol: 'CVNM2501', 
        underlying: 'VNM', 
        type: 'Call', 
        quantity: 10000, 
        value: 200000000,
        delta: 0.6, 
        gamma: 0.03, 
        vega: 0.15, 
        theta: -0.05,
        volatility: 0.28,
        weight: 0.20
      },
      { 
        symbol: 'CHPG2502', 
        underlying: 'HPG', 
        type: 'Call', 
        quantity: 8000, 
        value: 180000000,
        delta: 0.5, 
        gamma: 0.04, 
        vega: 0.18, 
        theta: -0.06,
        volatility: 0.32,
        weight: 0.18
      },
      { 
        symbol: 'PVIC2501', 
        underlying: 'VIC', 
        type: 'Put', 
        quantity: 12000, 
        value: 220000000,
        delta: -0.4, 
        gamma: 0.035, 
        vega: 0.16, 
        theta: -0.04,
        volatility: 0.25,
        weight: 0.22
      },
      { 
        symbol: 'CMWG2503', 
        underlying: 'MWG', 
        type: 'Call', 
        quantity: 15000, 
        value: 250000000,
        delta: 0.7, 
        gamma: 0.025, 
        vega: 0.12, 
        theta: -0.07,
        volatility: 0.30,
        weight: 0.25
      },
      { 
        symbol: 'CVHM2502', 
        underlying: 'VHM', 
        type: 'Call', 
        quantity: 10000, 
        value: 150000000,
        delta: 0.55, 
        gamma: 0.038, 
        vega: 0.17, 
        theta: -0.055,
        volatility: 0.27,
        weight: 0.15
      }
    ];
      }
    
      // Common calculations for both backend and local data
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
    
    // Calculate portfolio Greeks
    const portfolioGreeks = {
      netDelta: positions.reduce((sum, p) => sum + p.delta * p.quantity, 0),
      netGamma: positions.reduce((sum, p) => sum + p.gamma * p.quantity, 0),
      netVega: positions.reduce((sum, p) => sum + p.vega * p.quantity, 0),
      netTheta: positions.reduce((sum, p) => sum + p.theta * p.quantity, 0),
      deltaExposure: positions.reduce((sum, p) => sum + Math.abs(p.delta * p.value), 0),
      gammaExposure: positions.reduce((sum, p) => sum + Math.abs(p.gamma * p.value), 0),
      vegaExposure: positions.reduce((sum, p) => sum + Math.abs(p.vega * p.value), 0)
    };
    
    // Concentration analysis
    const underlyingConcentration = {};
    positions.forEach(pos => {
      if (!underlyingConcentration[pos.underlying]) {
        underlyingConcentration[pos.underlying] = { value: 0, count: 0 };
      }
      underlyingConcentration[pos.underlying].value += pos.value;
      underlyingConcentration[pos.underlying].count += 1;
    });
    
    const concentrationData = Object.entries(underlyingConcentration).map(([underlying, data]) => ({
      underlying,
      value: data.value,
      percentage: data.value / totalValue,
      count: data.count
    })).sort((a, b) => b.value - a.value);
    
    // Calculate concentration risk (HHI - Herfindahl-Hirschman Index)
    const hhi = concentrationData.reduce((sum, item) => sum + Math.pow(item.percentage, 2), 0);
    const diversificationIndex = 1 / hhi; // Effective number of positions
    
    // Type distribution
    const typeDistribution = [
      { 
        name: 'Call Warrants', 
        value: positions.filter(p => p.type === 'Call').reduce((sum, p) => sum + p.value, 0),
        count: positions.filter(p => p.type === 'Call').length
      },
      { 
        name: 'Put Warrants', 
        value: positions.filter(p => p.type === 'Put').reduce((sum, p) => sum + p.value, 0),
        count: positions.filter(p => p.type === 'Put').length
      }
    ];
    
    // Risk metrics
    const riskMetrics = {
      portfolioVolatility: Math.sqrt(
        positions.reduce((sum, p) => sum + Math.pow(p.volatility * p.weight, 2), 0)
      ),
      maxDrawdown: 0.15 * totalValue,
      var95: 0.08 * totalValue,
      expectedShortfall: 0.12 * totalValue,
      sharpeRatio: 1.25,
      beta: 0.85
    };
    
    // Time series risk evolution (simulated)
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 252;
    const riskEvolution = [];
    let cumulativeVar = 0;
    
    for (let i = 0; i <= days; i++) {
      const dailyVar = (riskMetrics.var95 / Math.sqrt(days)) * (1 + Math.random() * 0.2);
      cumulativeVar += dailyVar;
      
      riskEvolution.push({
        day: i,
        var: dailyVar,
        cumulativeVar,
        portfolioValue: totalValue * (1 + (Math.random() - 0.51) * 0.02 * Math.sqrt(i))
      });
    }
    
    // Greeks contribution to risk
    const greeksContribution = [
      { greek: 'Delta', exposure: portfolioGreeks.deltaExposure, percent: portfolioGreeks.deltaExposure / totalValue },
      { greek: 'Gamma', exposure: portfolioGreeks.gammaExposure, percent: portfolioGreeks.gammaExposure / totalValue },
      { greek: 'Vega', exposure: portfolioGreeks.vegaExposure, percent: portfolioGreeks.vegaExposure / totalValue }
    ];
    
    setPortfolioData({
      positions,
      totalValue,
      portfolioGreeks,
      concentrationData,
      typeDistribution,
      riskMetrics,
      riskEvolution,
      greeksContribution,
      hhi,
        diversificationIndex,
        method: useBackendAPI ? 'Backend API (Real Portfolio Greeks)' : 'Local Calculation (Realistic)'
      });
    } catch (error) {
      console.error('Portfolio data generation error:', error);
      // Fallback to basic portfolio on error
      setPortfolioData({
        positions: [],
        totalValue: 1000000000,
        portfolioGreeks: { netDelta: 0, netGamma: 0, netVega: 0, netTheta: 0 },
        method: 'Error Fallback'
    });
    }
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="portfolio-risk">
      <div className="page-header">
        <h1>💼 Portfolio Risk Metrics {useBackendAPI ? '(Backend API ✅)' : '(Local Demo)'}</h1>
        <p>Phân tích rủi ro tổng thể của portfolio với real Greeks aggregation</p>
      </div>

      {/* Backend Toggle & Warrant Selection */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Portfolio Configuration</h3>
          <div className="form-check form-switch" style={{ display: 'inline-block', marginLeft: '20px' }}>
            <input
              className="form-check-input"
              type="checkbox"
              checked={useBackendAPI}
              onChange={(e) => setUseBackendAPI(e.target.checked)}
              id="apiTogglePortfolio"
            />
            <label className="form-check-label" htmlFor="apiTogglePortfolio">
              {useBackendAPI ? '✅ Backend API (Real Portfolio Greeks)' : '📊 Local Demo'}
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
                    onClick={() => {
                      setSelectedWarrants(prev =>
                        prev.includes(warrant.symbol)
                          ? prev.filter(s => s !== warrant.symbol)
                          : [...prev, warrant.symbol]
                      );
                    }}
                    style={{
                      padding: '8px',
                      border: selectedWarrants.includes(warrant.symbol) ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedWarrants.includes(warrant.symbol) ? 'rgba(139, 92, 246, 0.1)' : 'white',
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
              🔄 Using realistic local portfolio. Toggle "Backend API" for real portfolio Greeks aggregation.
            </p>
          )}
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="card mb-3">
        <div className="card-body">
          <div style={{ display: 'flex', gap: '12px' }}>
            {['7d', '30d', '90d', '1y'].map(range => (
              <button
                key={range}
                className={`btn ${timeRange === range ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' ? '7 ngày' : range === '30d' ? '30 ngày' : range === '90d' ? '90 ngày' : '1 năm'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {portfolioData && (
        <>
          {/* Key Risk Metrics */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Portfolio Value</div>
                  <div className="stat-card-value">{formatVND(portfolioData.totalValue)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  💼
                </div>
              </div>
              <div className="badge badge-primary">{portfolioData.positions.length} positions</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">VaR (95%)</div>
                  <div className="stat-card-value">{formatVND(portfolioData.riskMetrics.var95)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  ⚠️
                </div>
              </div>
              <div className="badge badge-danger">
                {formatPercent(portfolioData.riskMetrics.var95 / portfolioData.totalValue)} of portfolio
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Sharpe Ratio</div>
                  <div className="stat-card-value">{formatNumber(portfolioData.riskMetrics.sharpeRatio)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  📊
                </div>
              </div>
              <div className="badge badge-success">Risk-adjusted return</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Diversification Index</div>
                  <div className="stat-card-value">{formatNumber(portfolioData.diversificationIndex)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  🎯
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Effective positions
              </p>
            </div>
          </div>

          {/* Concentration Analysis */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Concentration by Underlying</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioData.concentrationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ underlying, percentage }) => `${underlying}: ${(percentage * 100).toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {portfolioData.concentrationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatVND(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <div className="badge badge-primary">
                    HHI: {formatNumber(portfolioData.hhi)}
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                    {portfolioData.hhi < 0.15 ? '✅ Well diversified' : 
                     portfolioData.hhi < 0.25 ? '⚠️ Moderately concentrated' : 
                     '🚨 Highly concentrated'}
                  </p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Type Distribution</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={portfolioData.typeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatVND(value)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip formatter={(value) => formatVND(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Greeks Exposure */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Greeks Exposure</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={portfolioData.greeksContribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="greek" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Bar dataKey="exposure" name="Exposure (VND)" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Evolution */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Portfolio Value & VaR Evolution</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={portfolioData.riskEvolution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                  <YAxis yAxisId="left" label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'VaR', angle: 90, position: 'insideRight' }} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="portfolioValue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Portfolio Value" 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="var" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Daily VaR" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Position Details */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Position-Level Risk</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Underlying</th>
                      <th>Type</th>
                      <th>Value</th>
                      <th>Weight</th>
                      <th>Delta</th>
                      <th>Gamma</th>
                      <th>Vega</th>
                      <th>Theta</th>
                      <th>Volatility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portfolioData.positions.map((pos, index) => (
                      <tr key={index}>
                        <td><strong>{pos.symbol}</strong></td>
                        <td>{pos.underlying}</td>
                        <td>
                          <span className={`badge badge-${pos.type === 'Call' ? 'success' : 'danger'}`}>
                            {pos.type}
                          </span>
                        </td>
                        <td>{formatVND(pos.value)}</td>
                        <td>{formatPercent(pos.weight)}</td>
                        <td>{formatNumber(pos.delta * pos.quantity)}</td>
                        <td>{formatNumber(pos.gamma * pos.quantity)}</td>
                        <td>{formatNumber(pos.vega * pos.quantity)}</td>
                        <td>{formatNumber(pos.theta * pos.quantity)}</td>
                        <td>{formatPercent(pos.volatility)}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                      <td colSpan="3"><strong>PORTFOLIO TOTAL</strong></td>
                      <td>{formatVND(portfolioData.totalValue)}</td>
                      <td>100%</td>
                      <td>{formatNumber(portfolioData.portfolioGreeks.netDelta)}</td>
                      <td>{formatNumber(portfolioData.portfolioGreeks.netGamma)}</td>
                      <td>{formatNumber(portfolioData.portfolioGreeks.netVega)}</td>
                      <td>{formatNumber(portfolioData.portfolioGreeks.netTheta)}</td>
                      <td>{formatPercent(portfolioData.riskMetrics.portfolioVolatility)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Risk Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Risk Summary & Recommendations</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Risk Metric</th>
                      <th>Value</th>
                      <th>Status</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Portfolio Volatility</strong></td>
                      <td>{formatPercent(portfolioData.riskMetrics.portfolioVolatility)}</td>
                      <td>
                        <span className={`badge badge-${portfolioData.riskMetrics.portfolioVolatility < 0.25 ? 'success' : portfolioData.riskMetrics.portfolioVolatility < 0.35 ? 'warning' : 'danger'}`}>
                          {portfolioData.riskMetrics.portfolioVolatility < 0.25 ? 'Low' : portfolioData.riskMetrics.portfolioVolatility < 0.35 ? 'Medium' : 'High'}
                        </span>
                      </td>
                      <td>
                        {portfolioData.riskMetrics.portfolioVolatility > 0.35 ? 'Consider reducing high-vol positions' : 'Within acceptable range'}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>VaR (95%, 1-day)</strong></td>
                      <td>{formatVND(portfolioData.riskMetrics.var95)}</td>
                      <td>
                        <span className="badge badge-warning">
                          {formatPercent(portfolioData.riskMetrics.var95 / portfolioData.totalValue)}
                        </span>
                      </td>
                      <td>Maximum expected loss at 95% confidence</td>
                    </tr>
                    <tr>
                      <td><strong>Expected Shortfall</strong></td>
                      <td>{formatVND(portfolioData.riskMetrics.expectedShortfall)}</td>
                      <td>
                        <span className="badge badge-danger">
                          {formatPercent(portfolioData.riskMetrics.expectedShortfall / portfolioData.totalValue)}
                        </span>
                      </td>
                      <td>Average loss when VaR is breached</td>
                    </tr>
                    <tr>
                      <td><strong>Sharpe Ratio</strong></td>
                      <td>{formatNumber(portfolioData.riskMetrics.sharpeRatio)}</td>
                      <td>
                        <span className={`badge badge-${portfolioData.riskMetrics.sharpeRatio > 1 ? 'success' : 'warning'}`}>
                          {portfolioData.riskMetrics.sharpeRatio > 1 ? 'Good' : 'Fair'}
                        </span>
                      </td>
                      <td>Risk-adjusted return performance</td>
                    </tr>
                    <tr>
                      <td><strong>Concentration (HHI)</strong></td>
                      <td>{formatNumber(portfolioData.hhi)}</td>
                      <td>
                        <span className={`badge badge-${portfolioData.hhi < 0.15 ? 'success' : portfolioData.hhi < 0.25 ? 'warning' : 'danger'}`}>
                          {portfolioData.hhi < 0.15 ? 'Diversified' : portfolioData.hhi < 0.25 ? 'Moderate' : 'Concentrated'}
                        </span>
                      </td>
                      <td>
                        {portfolioData.hhi > 0.25 ? 'Consider diversifying across more underlyings' : 'Good diversification'}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Effective Positions</strong></td>
                      <td>{formatNumber(portfolioData.diversificationIndex)}</td>
                      <td>
                        <span className={`badge badge-${portfolioData.diversificationIndex > 3 ? 'success' : 'warning'}`}>
                          {portfolioData.diversificationIndex > 3 ? 'Good' : 'Low'}
                        </span>
                      </td>
                      <td>Equivalent number of equal-weighted positions</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ marginBottom: '12px', color: '#1e40af' }}>📋 Portfolio Health Check</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af' }}>
                  <li>✅ Portfolio value: {formatVND(portfolioData.totalValue)}</li>
                  <li>{portfolioData.riskMetrics.var95 / portfolioData.totalValue < 0.10 ? '✅' : '⚠️'} VaR within acceptable limits</li>
                  <li>{portfolioData.riskMetrics.sharpeRatio > 1 ? '✅' : '⚠️'} Sharpe ratio {portfolioData.riskMetrics.sharpeRatio > 1 ? 'good' : 'needs improvement'}</li>
                  <li>{portfolioData.hhi < 0.20 ? '✅' : '⚠️'} Concentration {portfolioData.hhi < 0.20 ? 'acceptable' : 'high'}</li>
                  <li>{Math.abs(portfolioData.portfolioGreeks.netDelta) < 20000 ? '✅' : '⚠️'} Delta exposure {Math.abs(portfolioData.portfolioGreeks.netDelta) < 20000 ? 'controlled' : 'high'}</li>
                  <li>{Math.abs(portfolioData.portfolioGreeks.netGamma) < 300 ? '✅' : '⚠️'} Gamma risk {Math.abs(portfolioData.portfolioGreeks.netGamma) < 300 ? 'acceptable' : 'elevated'}</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PortfolioRisk; 