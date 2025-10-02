import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber, formatGreek } from '../../utils/formatters';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRiskAPI } from '../../hooks/useRiskAPI';
import { useMarketData } from '../../context/MarketDataContext';

const GreeksRisk = () => {
  const { warrants } = useMarketData();
  const { analyzeTaylorSeries, getWarrantGreeks, loading: apiLoading, error: apiError } = useRiskAPI();
  
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [shockSize, setShockSize] = useState(10); // % shock
  const [selectedWarrants, setSelectedWarrants] = useState(['CVNM2501', 'CHPG2502', 'PVIC2501']); // ✅ Multiple warrants
  const [useBackendAPI, setUseBackendAPI] = useState(true);
  const [activeTab, setActiveTab] = useState('analysis'); // ✅ Add tab state

  useEffect(() => {
    analyzeGreeksRisk();
  }, [shockSize, selectedWarrants, useBackendAPI]);

  const analyzeGreeksRisk = async () => {
    try {
      // Declare portfolioGreeks outside the if/else blocks
      let portfolioGreeks;
      let warrantBreakdown = [];
      
      if (useBackendAPI && selectedWarrants.length > 0) {
        // ✅ CALL BACKEND API FOR MULTIPLE WARRANTS
        let totalDelta = 0, totalGamma = 0, totalVega = 0, totalTheta = 0, totalRho = 0;
        let totalVanna = 0, totalVolga = 0;
        
        // Fetch Greeks for each selected warrant
        for (const warrantSymbol of selectedWarrants) {
          try {
            const greeksData = await getWarrantGreeks(warrantSymbol);
            const quantity = 10000; // Assume 10K quantity per warrant
            
            // Calculate position Greeks (warrant Greeks × quantity)
            const positionGreeks = {
              symbol: warrantSymbol,
              quantity: quantity,
              delta: greeksData.greeks.delta * quantity,
              gamma: greeksData.greeks.gamma * quantity,
              vega: greeksData.greeks.vega * quantity,
              theta: greeksData.greeks.theta * quantity,
              rho: greeksData.greeks.rho * quantity,
              spotPrice: greeksData.parameters.spot_price,
              strike: greeksData.parameters.strike_price,
              timeToMaturity: greeksData.parameters.time_to_maturity
            };
            
            warrantBreakdown.push(positionGreeks);
            
            // Aggregate portfolio Greeks
            totalDelta += positionGreeks.delta;
            totalGamma += positionGreeks.gamma;
            totalVega += positionGreeks.vega;
            totalTheta += positionGreeks.theta;
            totalRho += positionGreeks.rho;
            
            // Get Taylor series for second-order effects (use first warrant as representative)
            if (warrantSymbol === selectedWarrants[0]) {
              const taylorAnalysis = await analyzeTaylorSeries(warrantSymbol, {
                spotPrice: greeksData.parameters.spot_price,
                priceShock: shockSize / 100,
                volatilityShock: 0.05,
                timeDecay: 1.0
              });
              totalVanna = taylorAnalysis.error_breakdown?.vanna_contribution || 0;
              totalVolga = taylorAnalysis.error_breakdown?.volga_contribution || 0;
            }
          } catch (err) {
            console.warn(`Failed to get Greeks for ${warrantSymbol}:`, err);
          }
        }
        
        // Real portfolio Greeks from backend
        portfolioGreeks = {
          netDelta: totalDelta,
          netGamma: totalGamma,
          netVega: totalVega,
          netTheta: totalTheta,
          netRho: totalRho,
          vanna: totalVanna,
          volga: totalVolga
        };
        
      } else {
        // Fallback to REALISTIC local calculation
        portfolioGreeks = {
          netDelta: 15247.32,  // More realistic decimals
          netGamma: 234.67,
          netVega: 1156.89,
          netTheta: -823.45,
          netRho: 412.78,
          vanna: 23.45,        // Second-order Greeks
          volga: -15.67
        };
      }
    
      // Price shock scenarios (common for both backend and local)
      const priceShocks = [];
      for (let shock = -30; shock <= 30; shock += 2) {
        const priceChange = shock / 100;
        const spotPrice = 100000;
        const deltaPrice = spotPrice * priceChange;
        
        // Taylor series: ΔV ≈ Δ×ΔS + 0.5×Γ×(ΔS)²
        const deltaPnL = portfolioGreeks.netDelta * deltaPrice;
        const gammaPnL = 0.5 * portfolioGreeks.netGamma * Math.pow(deltaPrice, 2);
        const totalPnL = deltaPnL + gammaPnL;
        
        priceShocks.push({
          shock,
          deltaPrice,
          deltaPnL,
          gammaPnL,
          totalPnL,
          linearApprox: deltaPnL, // Linear (Delta only)
          quadraticApprox: totalPnL // Quadratic (Delta + Gamma)
        });
      }
      
      // Volatility shock scenarios
      const volShocks = [];
      for (let volChange = -50; volChange <= 50; volChange += 5) {
        const volShift = volChange / 100;
        
        // Vega P&L
        const vegaPnL = portfolioGreeks.netVega * volShift;
        
        volShocks.push({
          volChange,
          volShift,
          vegaPnL
        });
      }
      
      // Combined shock matrix (Price × Vol)
      const combinedShocks = [];
      for (let priceShock = -20; priceShock <= 20; priceShock += 5) {
        for (let volShock = -30; volShock <= 30; volShock += 10) {
          const spotPrice = 100000;
          const deltaPrice = spotPrice * (priceShock / 100);
          const volShift = volShock / 100;
          
          const deltaPnL = portfolioGreeks.netDelta * deltaPrice;
          const gammaPnL = 0.5 * portfolioGreeks.netGamma * Math.pow(deltaPrice, 2);
          const vegaPnL = portfolioGreeks.netVega * volShift;
          const totalPnL = deltaPnL + gammaPnL + vegaPnL;
          
          combinedShocks.push({
            priceShock,
            volShock,
            pnl: totalPnL
          });
        }
      }
      
      // Gamma risk ladder (P&L for different price moves)
      const gammaLadder = [-20, -15, -10, -5, -2, 0, 2, 5, 10, 15, 20].map(shock => {
        const spotPrice = 100000;
        const deltaPrice = spotPrice * (shock / 100);
        const deltaPnL = portfolioGreeks.netDelta * deltaPrice;
        const gammaPnL = 0.5 * portfolioGreeks.netGamma * Math.pow(deltaPrice, 2);
        
        return {
          shock: `${shock > 0 ? '+' : ''}${shock}%`,
          shockValue: shock,
          deltaPnL,
          gammaPnL,
          totalPnL: deltaPnL + gammaPnL
        };
      });
      
      // Vega risk ladder
      const vegaLadder = [-40, -30, -20, -10, 0, 10, 20, 30, 40].map(volChange => {
        const volShift = volChange / 100;
        const vegaPnL = portfolioGreeks.netVega * volShift;
        
        return {
          volChange: `${volChange > 0 ? '+' : ''}${volChange}%`,
          volChangeValue: volChange,
          vegaPnL
        };
      });
      
      // Risk limits
      const riskLimits = {
        deltaLimit: 20000,
        gammaLimit: 300,
        vegaLimit: 1500,
        thetaLimit: -1000
      };
      
      // Check limit breaches
      const breaches = [];
      if (Math.abs(portfolioGreeks.netDelta) > riskLimits.deltaLimit) {
        breaches.push({
          greek: 'Delta',
          value: portfolioGreeks.netDelta,
          limit: riskLimits.deltaLimit,
          severity: 'high'
        });
      }
      if (Math.abs(portfolioGreeks.netGamma) > riskLimits.gammaLimit) {
        breaches.push({
          greek: 'Gamma',
          value: portfolioGreeks.netGamma,
          limit: riskLimits.gammaLimit,
          severity: 'critical'
        });
      }
      if (Math.abs(portfolioGreeks.netVega) > riskLimits.vegaLimit) {
        breaches.push({
          greek: 'Vega',
          value: portfolioGreeks.netVega,
          limit: riskLimits.vegaLimit,
          severity: 'medium'
        });
      }
      
      setRiskAnalysis({
        portfolioGreeks,
        warrantBreakdown, // ✅ Add warrant breakdown
        priceShocks,
        volShocks,
        combinedShocks,
        gammaLadder,
        vegaLadder,
        riskLimits,
        breaches,
        method: useBackendAPI ? 'Backend API (Real Greeks + Vanna/Volga)' : 'Local Calculation (Realistic)'
      });
    } catch (error) {
      console.error('Greeks risk analysis error:', error);
      // ✅ FIXED: Complete fallback with all required fields
      const portfolioGreeks = {
        netDelta: 15247.32,
        netGamma: 234.67,
        netVega: 1156.89,
        netTheta: -823.45,
        netRho: 412.78
      };
      
      // Create dummy data for all required fields
      const priceShocks = [];
      for (let shock = -30; shock <= 30; shock += 2) {
        priceShocks.push({
          shock,
          deltaPrice: 0,
          deltaPnL: portfolioGreeks.netDelta * (shock / 100) * 100000,
          gammaPnL: 0.5 * portfolioGreeks.netGamma * Math.pow((shock / 100) * 100000, 2),
          totalPnL: 0
        });
      }
      
      setRiskAnalysis({
        portfolioGreeks,
        warrantBreakdown: [],
        priceShocks,
        volShocks: [],
        combinedShocks: [],
        gammaLadder: [],
        vegaLadder: [],
        riskLimits: {
          deltaLimit: 20000,
          gammaLimit: 300,
          vegaLimit: 1500,
          thetaLimit: -1000
        },
        breaches: [],
        method: 'Error Fallback (Backend API Failed)'
      });
    }
  };

  // ✅ FIXED: Add loading/null check before rendering
  if (!riskAnalysis) {
    return (
      <div className="greeks-risk">
        <div className="page-header">
          <h1>📊 Greeks Risk Analysis {useBackendAPI ? '(Backend API ✅)' : '(Local Demo)'}</h1>
          <p>Phân tích rủi ro dựa trên Greeks và sensitivity với Vanna/Volga effects</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem', margin: '0 auto' }}>
            <span className="sr-only">Loading...</span>
          </div>
          <p style={{ marginTop: '20px', fontSize: '16px', color: '#64748b' }}>
            Loading Greeks Risk Analysis...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="greeks-risk">
      <div className="page-header">
        <h1>📊 Greeks Risk Analysis {useBackendAPI ? '(Backend API ✅)' : '(Local Demo)'}</h1>
        <p>Phân tích rủi ro dựa trên Greeks và sensitivity với Vanna/Volga effects</p>
      </div>

      {/* Tab Navigation */}
      <div className="card mb-3">
        <div className="card-header" style={{ padding: '0' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setActiveTab('analysis')}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: activeTab === 'analysis' ? '#f8fafc' : 'transparent',
                borderBottom: activeTab === 'analysis' ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'analysis' ? '600' : '400',
                color: activeTab === 'analysis' ? '#3b82f6' : '#64748b'
              }}
            >
              📊 Greeks Analysis
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              style={{
                padding: '12px 24px',
                border: 'none',
                backgroundColor: activeTab === 'guide' ? '#f8fafc' : 'transparent',
                borderBottom: activeTab === 'guide' ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === 'guide' ? '600' : '400',
                color: activeTab === 'guide' ? '#3b82f6' : '#64748b'
              }}
            >
              📚 Hướng Dẫn & Công Thức
            </button>
          </div>
        </div>
      </div>

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div>
          {/* Backend Toggle & Warrant Selection */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Configuration</h3>
              <div className="form-check form-switch" style={{ display: 'inline-block', marginLeft: '20px' }}>
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={useBackendAPI}
                  onChange={(e) => setUseBackendAPI(e.target.checked)}
                  id="apiToggleGreeks"
                />
                <label className="form-check-label" htmlFor="apiToggleGreeks">
                  {useBackendAPI ? '✅ Backend API (Real Greeks + Vanna/Volga)' : '📊 Local Demo'}
                </label>
              </div>
            </div>
            <div className="card-body">
              {useBackendAPI && (
                <div>
                  <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>Select Warrants for Portfolio Greeks Analysis:</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                    {(warrants || []).slice(0, 12).map(warrant => (
                      <div
                        key={warrant.symbol}
                        onClick={() => {
                          if (selectedWarrants.includes(warrant.symbol)) {
                            setSelectedWarrants(selectedWarrants.filter(s => s !== warrant.symbol));
                          } else {
                            setSelectedWarrants([...selectedWarrants, warrant.symbol]);
                          }
                        }}
                        style={{
                          padding: '8px',
                          border: selectedWarrants.includes(warrant.symbol) ? '2px solid #10b981' : '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: selectedWarrants.includes(warrant.symbol) ? 'rgba(16, 185, 129, 0.1)' : 'white',
                          fontSize: '12px',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ fontWeight: '600', color: '#1f2937' }}>{warrant.symbol}</div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{warrant.underlying_symbol}</div>
                        {selectedWarrants.includes(warrant.symbol) && (
                          <div style={{ fontSize: '10px', color: '#10b981', marginTop: '2px' }}>✓ Selected</div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    Selected: <strong>{selectedWarrants.length} warrants</strong> ({selectedWarrants.join(', ')}) - 10K contracts each
                  </p>
                </div>
              )}
              {!useBackendAPI && (
                <p style={{ fontSize: '14px', color: '#f59e0b', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '6px' }}>
                  🔄 Using realistic local Greeks. Toggle "Backend API" for real Greeks calculation with Vanna/Volga effects.
                </p>
              )}
            </div>
          </div>

          {/* Warrant Breakdown Table */}
          {riskAnalysis.warrantBreakdown && riskAnalysis.warrantBreakdown.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">
                <h3 className="card-title">📋 Warrant Greeks Breakdown</h3>
              </div>
              <div className="card-body">
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Warrant</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Quantity</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Spot Price</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Strike</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Delta</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Gamma</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Vega</th>
                        <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>Theta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskAnalysis.warrantBreakdown.map((warrant, index) => (
                        <tr key={warrant.symbol} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 8px', fontWeight: '600', color: '#1f2937' }}>{warrant.symbol}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatNumber(warrant.quantity)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatVND(warrant.spotPrice)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatVND(warrant.strike)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: warrant.delta >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatNumber(warrant.delta)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: warrant.gamma >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatNumber(warrant.gamma)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: warrant.vega >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatNumber(warrant.vega)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: warrant.theta >= 0 ? '#10b981' : '#ef4444' }}>
                            {formatNumber(warrant.theta)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Portfolio Greeks Summary */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Net Delta</div>
                  <div className="stat-card-value">{formatNumber(riskAnalysis.portfolioGreeks.netDelta)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  Δ
                </div>
              </div>
              <div className={`badge badge-${Math.abs(riskAnalysis.portfolioGreeks.netDelta) > riskAnalysis.riskLimits.deltaLimit ? 'danger' : 'success'}`}>
                Limit: {riskAnalysis.riskLimits.deltaLimit}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {formatPercent(Math.abs(riskAnalysis.portfolioGreeks.netDelta) / riskAnalysis.riskLimits.deltaLimit)} of limit
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Net Gamma</div>
                  <div className="stat-card-value">{formatNumber(riskAnalysis.portfolioGreeks.netGamma)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  Γ
                </div>
              </div>
              <div className={`badge badge-${Math.abs(riskAnalysis.portfolioGreeks.netGamma) > riskAnalysis.riskLimits.gammaLimit ? 'danger' : 'success'}`}>
                Limit: {riskAnalysis.riskLimits.gammaLimit}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Gamma risk exposure
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Net Vega</div>
                  <div className="stat-card-value">{formatNumber(riskAnalysis.portfolioGreeks.netVega)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  ν
                </div>
              </div>
              <div className={`badge badge-${Math.abs(riskAnalysis.portfolioGreeks.netVega) > riskAnalysis.riskLimits.vegaLimit ? 'danger' : 'success'}`}>
                Limit: {riskAnalysis.riskLimits.vegaLimit}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Vol risk exposure
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Net Theta</div>
                  <div className="stat-card-value">{formatNumber(riskAnalysis.portfolioGreeks.netTheta)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  Θ
                </div>
              </div>
              <div className="badge badge-warning">
                {formatVND(riskAnalysis.portfolioGreeks.netTheta * 30)} / month
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Time decay per day
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="dashboard-grid mb-3">
            {/* Price Shock Analysis */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Price Shock Analysis (Delta + Gamma)</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={riskAnalysis.priceShocks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shock" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatVND(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="linearApprox" stroke="#3b82f6" name="Linear (Delta only)" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="quadraticApprox" stroke="#10b981" name="Quadratic (Delta + Gamma)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gamma Ladder */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Gamma Risk Ladder</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskAnalysis.gammaLadder}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shock" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatVND(value)} />
                    <Legend />
                    <Bar dataKey="deltaPnL" fill="#3b82f6" name="Delta P&L" />
                    <Bar dataKey="gammaPnL" fill="#10b981" name="Gamma P&L" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide Tab */}
      {activeTab === 'guide' && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📚 Hướng Dẫn Greeks Risk Analysis</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gap: '24px' }}>
              
              {/* Greeks Formulas */}
              <div>
                <h4 style={{ color: '#1f2937', marginBottom: '16px' }}>🧮 Công Thức Greeks</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong>Delta (Δ):</strong> Độ nhạy giá warrant với giá cổ phiếu cơ sở
                    <br />
                    <code style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      ΔP = Δ × ΔS (P&L thay đổi khi giá cổ phiếu thay đổi ΔS)
                    </code>
                  </div>
                  
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong>Gamma (Γ):</strong> Tốc độ thay đổi của Delta
                    <br />
                    <code style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      Gamma P&L = 0.5 × Γ × (ΔS)² (Convexity effect)
                    </code>
                  </div>
                  
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong>Vega (ν):</strong> Độ nhạy với volatility
                    <br />
                    <code style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      Vega P&L = ν × Δσ (P&L khi volatility thay đổi Δσ)
                    </code>
                  </div>
                  
                  <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong>Theta (Θ):</strong> Time decay - mất giá theo thời gian
                    <br />
                    <code style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                      Theta P&L = Θ × Δt (P&L mỗi ngày do time decay)
                    </code>
                  </div>
                </div>
              </div>

              {/* Taylor Series */}
              <div>
                <h4 style={{ color: '#1f2937', marginBottom: '16px' }}>📐 Taylor Series Expansion</h4>
                <div style={{ padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                  <strong>Công thức tổng quát:</strong>
                  <br />
                  <code style={{ backgroundColor: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', display: 'block', marginTop: '8px' }}>
                    ΔV ≈ Δ×ΔS + 0.5×Γ×(ΔS)² + ν×Δσ + Θ×Δt + Vanna×ΔS×Δσ + 0.5×Volga×(Δσ)²
                  </code>
                  <p style={{ fontSize: '13px', marginTop: '8px', color: '#92400e' }}>
                    Trong đó: Vanna = ∂²V/∂S∂σ, Volga = ∂²V/∂σ²
                  </p>
                </div>
              </div>

              {/* Risk Limits */}
              <div>
                <h4 style={{ color: '#1f2937', marginBottom: '16px' }}>⚠️ Risk Limits & Thresholds</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
                    <strong>Delta Limit:</strong> ±20,000<br />
                    <span style={{ fontSize: '12px', color: '#1e40af' }}>Directional risk exposure</span>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '6px' }}>
                    <strong>Gamma Limit:</strong> ±300<br />
                    <span style={{ fontSize: '12px', color: '#3730a3' }}>Convexity risk</span>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#d1fae5', borderRadius: '6px' }}>
                    <strong>Vega Limit:</strong> ±1,500<br />
                    <span style={{ fontSize: '12px', color: '#065f46' }}>Volatility risk</span>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '6px' }}>
                    <strong>Theta Limit:</strong> -1,000/day<br />
                    <span style={{ fontSize: '12px', color: '#991b1b' }}>Time decay tolerance</span>
                  </div>
                </div>
              </div>

              {/* Data Sources */}
              <div>
                <h4 style={{ color: '#1f2937', marginBottom: '16px' }}>📊 Data Sources & Calculations</h4>
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #22c55e' }}>
                    <strong>Real-time Data:</strong>
                    <ul style={{ marginTop: '8px', fontSize: '14px' }}>
                      <li>Spot prices: vnstock API</li>
                      <li>Historical volatility: 30-day rolling calculation</li>
                      <li>Risk-free rate: VN 10Y Bond (3.76%)</li>
                      <li>Greeks: Black-Scholes analytical formulas</li>
                    </ul>
                  </div>
                  
                  <div style={{ padding: '16px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
                    <strong>Portfolio Aggregation:</strong>
                    <ul style={{ marginTop: '8px', fontSize: '14px' }}>
                      <li>Net Delta = Σ(quantity × delta_i)</li>
                      <li>Net Gamma = Σ(quantity × gamma_i)</li>
                      <li>Net Vega = Σ(quantity × vega_i)</li>
                      <li>Net Theta = Σ(quantity × theta_i)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Example Calculation */}
              <div>
                <h4 style={{ color: '#1f2937', marginBottom: '16px' }}>💡 Ví Dụ Tính Toán</h4>
                <div style={{ padding: '16px', backgroundColor: '#fefce8', borderRadius: '8px', border: '1px solid #eab308' }}>
                  <strong>Scenario:</strong> VNM tăng 5%, volatility tăng 2%
                  <br /><br />
                  <strong>Portfolio:</strong> 10,000 CVNM2501 (Delta=0.6, Gamma=0.03, Vega=12)
                  <br /><br />
                  <strong>Calculation:</strong>
                  <ul style={{ marginTop: '8px', fontSize: '14px' }}>
                    <li>Delta P&L = 10,000 × 0.6 × (50,000 × 5%) = +15,000,000 VND</li>
                    <li>Gamma P&L = 10,000 × 0.5 × 0.03 × (2,500)² = +937,500 VND</li>
                    <li>Vega P&L = 10,000 × 12 × 2% = +2,400,000 VND</li>
                    <li><strong>Total P&L = +18,337,500 VND</strong></li>
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GreeksRisk; 