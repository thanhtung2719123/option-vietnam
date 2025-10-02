import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { BarChart, Bar, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRiskAPI } from '../../hooks/useRiskAPI';
import { useMarketData } from '../../context/MarketDataContext';

const StressTesting = () => {
  const { warrants } = useMarketData();
  const { runStressTest: apiRunStressTest, loading: apiLoading, error: apiError } = useRiskAPI();
  
  const [portfolioValue, setPortfolioValue] = useState(1000000000);
  const [selectedScenario, setSelectedScenario] = useState('market_crash');
  const [selectedWarrants, setSelectedWarrants] = useState(['CVNM2501', 'CHPG2502', 'PVIC2501']);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useBackendAPI, setUseBackendAPI] = useState(true);

  const scenarios = [
    {
      id: 'market_crash',
      name: 'Market Crash (-30%)',
      description: 'Thị trường sụp đổ 30% trong 1 tuần',
      priceShock: -0.30,
      volShock: 1.5, // Vol tăng 50%
      rateShock: -0.01,
      severity: 'critical'
    },
    {
      id: 'flash_crash',
      name: 'Flash Crash (-15%)',
      description: 'Giảm đột ngột 15% trong 1 ngày',
      priceShock: -0.15,
      volShock: 2.0, // Vol tăng gấp đôi
      rateShock: 0,
      severity: 'high'
    },
    {
      id: 'vol_spike',
      name: 'Volatility Spike',
      description: 'Volatility tăng đột biến 100%',
      priceShock: 0,
      volShock: 2.0,
      rateShock: 0,
      severity: 'high'
    },
    {
      id: 'rate_hike',
      name: 'Interest Rate Hike',
      description: 'Lãi suất tăng 200 bps',
      priceShock: -0.05,
      volShock: 1.2,
      rateShock: 0.02,
      severity: 'medium'
    },
    {
      id: 'correction',
      name: 'Market Correction (-10%)',
      description: 'Điều chỉnh thị trường 10%',
      priceShock: -0.10,
      volShock: 1.3,
      rateShock: 0,
      severity: 'medium'
    },
    {
      id: 'mild_shock',
      name: 'Mild Shock (-5%)',
      description: 'Sốc nhẹ 5%',
      priceShock: -0.05,
      volShock: 1.1,
      rateShock: 0,
      severity: 'low'
    }
  ];

  useEffect(() => {
    runStressTest();
  }, [portfolioValue, selectedScenario]);

  const runStressTest = async () => {
    setLoading(true);
    
    try {
      const scenario = scenarios.find(s => s.id === selectedScenario);
      
      // Check if scenario exists
      if (!scenario) {
        console.error('Scenario not found:', selectedScenario);
        setLoading(false);
        return;
      }
      
      // Declare positions for both backend and local calculations
      let positions;
      
      if (useBackendAPI && selectedWarrants.length > 0) {
        // ✅ CALL BACKEND API WITH REAL DATA - Send ALL scenarios for comparison
        const stressScenarios = scenarios.map(scn => ({
          name: scn.name,
          price_shock: scn.priceShock,
          vol_shock: scn.volShock,
          rate_shock: scn.rateShock || 0
        }));
        
        const apiResult = await apiRunStressTest(
          selectedWarrants,
          stressScenarios,
          portfolioValue
        );
        
        // ✅ FIXED: Convert API response to frontend format (corrected field mapping)
        const stressResults = (apiResult.stress_results || []).map((result, index) => ({
          scenario: result.scenario_name,
          portfolioValue: result.portfolio_value, // ✅ Backend returns 'portfolio_value' not 'stressed_portfolio_value'
          pnl: -result.loss, // ✅ Backend returns 'loss' (positive = bad), we need pnl (negative = loss)
          pnlPercent: -result.loss_pct / 100, // ✅ FIX: Backend returns % (e.g., 10.5), convert to decimal (0.105)
          deltaContribution: result.delta_contribution || 0,
          gammaContribution: result.gamma_contribution || 0,
          vegaContribution: result.vega_contribution || 0,
          thetaContribution: result.theta_contribution || 0
        }));
        
        // ✅ FIXED: Find the selected scenario result (not just first one)
        const selectedResult = stressResults.find(r => r.scenario === scenario.name) || stressResults[0];
        
        // ✅ FIXED: Calculate totals for display
        const totalCurrentValue = portfolioValue;
        const totalPnL = selectedResult?.pnl || 0;
        const totalStressedValue = totalCurrentValue + totalPnL;
        const pnlPercent = totalPnL / totalCurrentValue;  // ✅ FIX: Removed * 100 (formatPercent handles it)
        
        setResults({
          scenario, // Add scenario to backend results
          stressResults,
          worstCase: apiResult.worst_case_scenario,
          recommendations: apiResult.recommendations,
          method: 'Backend API (Real Data)',
          positions: selectedWarrants.map(symbol => ({
            symbol,
            type: 'Call', // Simplified
            currentValue: portfolioValue / selectedWarrants.length,
            pnl: selectedResult?.pnl / selectedWarrants.length || 0,
            deltaImpact: selectedResult?.deltaContribution / selectedWarrants.length || 0,
            gammaImpact: selectedResult?.gammaContribution / selectedWarrants.length || 0,
            vegaImpact: selectedResult?.vegaContribution / selectedWarrants.length || 0,
            thetaImpact: selectedResult?.thetaContribution / selectedWarrants.length || 0,
            stressedValue: (portfolioValue / selectedWarrants.length) + (selectedResult?.pnl / selectedWarrants.length || 0)
          })),
          // ✅ FIXED: Impact breakdown with real Greeks contributions
          impactBreakdown: [
            { component: 'Delta', impact: selectedResult?.deltaContribution || 0 },
            { component: 'Gamma', impact: selectedResult?.gammaContribution || 0 },
            { component: 'Vega', impact: selectedResult?.vegaContribution || 0 },
            { component: 'Theta', impact: selectedResult?.thetaContribution || 0 }
          ],
          scenarioComparison: stressResults.map(result => {
            // ✅ FIXED: Match severity from scenarios array
            const matchedScenario = scenarios.find(s => s.name === result.scenario);
            return {
              scenario: result.scenario,
              pnl: result.pnl,
              pnlPercent: result.pnlPercent,
              severity: matchedScenario?.severity || 'medium'
            };
          }),
          // ✅ FIXED: Add calculated totals for display
          totalCurrentValue,
          totalStressedValue,
          totalPnL,
          pnlPercent
        });
        return; // Exit early for backend API path
        
      } else {
        // Fallback to REALISTIC local calculation
        positions = [
          { symbol: 'CVNM2501', type: 'Call', quantity: 10000, delta: 0.6234, gamma: 0.000045, vega: 0.1234, theta: -0.0567, currentValue: 200000000 },
          { symbol: 'CHPG2502', type: 'Call', quantity: 8000, delta: 0.5123, gamma: 0.000052, vega: 0.1456, theta: -0.0634, currentValue: 180000000 },
          { symbol: 'PVIC2501', type: 'Put', quantity: 12000, delta: -0.4567, gamma: 0.000038, vega: 0.1345, theta: -0.0456, currentValue: 220000000 },
          { symbol: 'CMWG2503', type: 'Call', quantity: 15000, delta: 0.6789, gamma: 0.000041, vega: 0.1123, theta: -0.0678, currentValue: 250000000 },
          { symbol: 'CVHM2502', type: 'Call', quantity: 10000, delta: 0.5678, gamma: 0.000047, vega: 0.1567, theta: -0.0589, currentValue: 150000000 }
      ];
      
        // Calculate REALISTIC stress impact
      const stressedPositions = positions.map(pos => {
        // Delta impact
        const deltaImpact = pos.delta * pos.currentValue * scenario.priceShock;
        
        // Gamma impact (second order)
        const gammaImpact = 0.5 * pos.gamma * pos.currentValue * Math.pow(scenario.priceShock, 2);
        
        // Vega impact
        const baseVol = 0.25;
        const volChange = baseVol * (scenario.volShock - 1);
        const vegaImpact = pos.vega * pos.currentValue * volChange;
        
        // Theta impact (time decay during stress period)
        // Formula: Theta × Position Value × (stress_days / 365)
        const stress_days = 5; // Typical stress test horizon
        const thetaImpact = pos.theta * pos.currentValue * (stress_days / 365);
        
        const totalImpact = deltaImpact + gammaImpact + vegaImpact + thetaImpact;
        const stressedValue = pos.currentValue + totalImpact;
        const pnl = totalImpact;
        
        return {
          ...pos,
          deltaImpact,
          gammaImpact,
          vegaImpact,
          thetaImpact,
          totalImpact,
          stressedValue,
          pnl,
          pnlPercent: (pnl / pos.currentValue)
        };
      });
      
      // Portfolio level aggregation
      const totalCurrentValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
      const totalStressedValue = stressedPositions.reduce((sum, p) => sum + p.stressedValue, 0);
      const totalPnL = totalStressedValue - totalCurrentValue;
      const pnlPercent = totalPnL / totalCurrentValue;
      
      // Greeks aggregation
      const portfolioGreeks = {
        delta: positions.reduce((sum, p) => sum + p.delta * p.quantity, 0),
        gamma: positions.reduce((sum, p) => sum + p.gamma * p.quantity, 0),
        vega: positions.reduce((sum, p) => sum + p.vega * p.quantity, 0),
        theta: positions.reduce((sum, p) => sum + p.theta * p.quantity, 0)
      };
      
      // Impact breakdown
      const impactBreakdown = [
        { component: 'Delta', impact: stressedPositions.reduce((sum, p) => sum + p.deltaImpact, 0) },
        { component: 'Gamma', impact: stressedPositions.reduce((sum, p) => sum + p.gammaImpact, 0) },
        { component: 'Vega', impact: stressedPositions.reduce((sum, p) => sum + p.vegaImpact, 0) },
        { component: 'Theta', impact: stressedPositions.reduce((sum, p) => sum + p.thetaImpact, 0) }
      ];
      
      // Compare all scenarios
      const scenarioComparison = scenarios.map(scn => {
        const pnl = positions.reduce((sum, pos) => {
          const deltaImpact = pos.delta * pos.currentValue * scn.priceShock;
          const gammaImpact = 0.5 * pos.gamma * pos.currentValue * Math.pow(scn.priceShock, 2);
          const baseVol = 0.25;
          const volChange = baseVol * (scn.volShock - 1);
          const vegaImpact = pos.vega * pos.currentValue * volChange;
          const thetaImpact = pos.theta * pos.currentValue * (5 / 365);
          return sum + deltaImpact + gammaImpact + vegaImpact + thetaImpact;
        }, 0);
        
        return {
          scenario: scn.name,
          pnl,
          pnlPercent: pnl / totalCurrentValue,
          severity: scn.severity
        };
      });
      
      setResults({
        scenario,
        positions: stressedPositions,
        totalCurrentValue,
        totalStressedValue,
        totalPnL,
        pnlPercent,
        portfolioGreeks,
        impactBreakdown,
          scenarioComparison,
          method: 'Local Calculation (Realistic Values)'
      });
      }
    } catch (error) {
      console.error('Stress test error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#ef4444',
      high: '#f59e0b',
      medium: '#3b82f6',
      low: '#10b981'
    };
    return colors[severity] || '#64748b';
  };

  return (
    <div className="stress-testing">
      <div className="page-header">
        <h1>🔥 Stress Testing {useBackendAPI ? '(Backend API ✅)' : '(Local Demo)'}</h1>
        <p>Kiểm tra khả năng chịu đựng của portfolio trong các kịch bản khắc nghiệt</p>
      </div>

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
              id="apiToggleStress"
            />
            <label className="form-check-label" htmlFor="apiToggleStress">
              {useBackendAPI ? '✅ Backend API (Real Data)' : '📊 Local Demo'}
            </label>
          </div>
        </div>
        <div className="card-body">
          {useBackendAPI && (
            <>
              <h4 style={{ marginBottom: '12px', fontSize: '15px' }}>Select Warrants for Stress Test:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', marginBottom: '16px' }}>
                {(warrants || []).slice(0, 15).map(warrant => (
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
                      border: selectedWarrants.includes(warrant.symbol) ? '2px solid #ef4444' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: selectedWarrants.includes(warrant.symbol) ? 'rgba(239, 68, 68, 0.1)' : 'white',
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
              🔄 Using realistic local simulation. Toggle "Backend API" for real stress testing with selected warrants.
            </p>
          )}
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Chọn kịch bản stress test</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {(scenarios || []).map(scenario => (
              <div
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                style={{
                  padding: '16px',
                  border: selectedScenario === scenario.id ? `2px solid ${getSeverityColor(scenario.severity)}` : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedScenario === scenario.id ? 'rgba(59, 130, 246, 0.05)' : 'white',
                  transition: 'all 0.2s'
                }}
              >
                <h4 style={{ marginBottom: '8px', color: getSeverityColor(scenario.severity) }}>
                  {scenario.name}
                </h4>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                  {scenario.description}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {scenario.priceShock !== 0 && (
                    <span className="badge badge-danger">
                      Price: {formatPercent(scenario.priceShock)}
                    </span>
                  )}
                  {scenario.volShock !== 1 && (
                    <span className="badge badge-warning">
                      Vol: ×{scenario.volShock}
                    </span>
                  )}
                  {scenario.rateShock !== 0 && (
                    <span className="badge badge-primary">
                      Rate: {scenario.rateShock > 0 ? '+' : ''}{formatPercent(scenario.rateShock)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Portfolio Value (VND)</label>
            <input
              type="number"
              className="form-control"
              value={portfolioValue}
              onChange={(e) => setPortfolioValue(parseFloat(e.target.value))}
              step="100000000"
              style={{ maxWidth: '300px' }}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang chạy stress test...</p>
        </div>
      )}

      {results && !loading && (
        <>
          {/* Impact Summary */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Portfolio P&L</div>
                  <div className="stat-card-value">{formatVND(results.totalPnL)}</div>
                </div>
                <div className="stat-card-icon" style={{ 
                  backgroundColor: results.totalPnL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: results.totalPnL >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {results.totalPnL >= 0 ? '✓' : '✗'}
                </div>
              </div>
              <div className={`badge badge-${results.totalPnL >= 0 ? 'success' : 'danger'}`}>
                {formatPercent(results.pnlPercent)} of portfolio
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Stressed Value</div>
                  <div className="stat-card-value">{formatVND(results.totalStressedValue)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  💼
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                From {formatVND(results.totalCurrentValue)}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Scenario</div>
                  <div className="stat-card-value" style={{ fontSize: '18px' }}>{results.scenario?.name || 'Unknown Scenario'}</div>
                </div>
                <div className="stat-card-icon" style={{ 
                  backgroundColor: `rgba(${results.scenario?.severity === 'critical' ? '239, 68, 68' : results.scenario?.severity === 'high' ? '245, 158, 11' : '59, 130, 246'}, 0.1)`,
                  color: getSeverityColor(results.scenario?.severity || 'medium')
                }}>
                  🔥
                </div>
              </div>
              <div className={`badge badge-${results.scenario?.severity === 'critical' ? 'danger' : results.scenario?.severity === 'high' ? 'warning' : 'primary'}`}>
                {results.scenario?.severity?.toUpperCase() || 'MEDIUM'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Worst Position</div>
                  <div className="stat-card-value" style={{ fontSize: '18px' }}>
                    {results.positions.reduce((worst, p) => p.pnl < worst.pnl ? p : worst).symbol}
                  </div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  ⚠️
                </div>
              </div>
              <div className="badge badge-danger">
                {formatVND(results.positions.reduce((worst, p) => p.pnl < worst.pnl ? p : worst).pnl)}
              </div>
            </div>
          </div>

          {/* Greeks Impact Breakdown */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">P&L Impact Breakdown by Greeks</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.impactBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="component" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Bar dataKey="impact" name="Impact (VND)">
                    {(results.impactBreakdown || []).map((entry, index) => (
                      <Bar key={`bar-${index}`} fill={entry.impact < 0 ? '#ef4444' : '#10b981'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario Comparison */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">All Scenarios Comparison</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.scenarioComparison.sort((a, b) => a.pnl - b.pnl)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="scenario" angle={-15} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Bar dataKey="pnl" name="P&L">
                    {(results.scenarioComparison || []).map((entry, index) => (
                      <Bar 
                        key={`bar-${index}`} 
                        fill={entry.severity === 'critical' ? '#ef4444' : entry.severity === 'high' ? '#f59e0b' : entry.severity === 'medium' ? '#3b82f6' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Position-Level Impact */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Position-Level Stress Impact</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Type</th>
                      <th>Current Value</th>
                      <th>Delta Impact</th>
                      <th>Gamma Impact</th>
                      <th>Vega Impact</th>
                      <th>Theta Impact</th>
                      <th>Total P&L</th>
                      <th>Stressed Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.positions || []).sort((a, b) => a.pnl - b.pnl).map((pos, index) => (
                      <tr key={index}>
                        <td><strong>{pos.symbol}</strong></td>
                        <td>
                          <span className={`badge badge-${pos.type === 'Call' ? 'success' : 'danger'}`}>
                            {pos.type}
                          </span>
                        </td>
                        <td>{formatVND(pos.currentValue)}</td>
                        <td style={{ color: pos.deltaImpact < 0 ? '#ef4444' : '#10b981' }}>
                          {formatVND(pos.deltaImpact)}
                        </td>
                        <td style={{ color: pos.gammaImpact < 0 ? '#ef4444' : '#10b981' }}>
                          {formatVND(pos.gammaImpact)}
                        </td>
                        <td style={{ color: pos.vegaImpact < 0 ? '#ef4444' : '#10b981' }}>
                          {formatVND(pos.vegaImpact)}
                        </td>
                        <td style={{ color: pos.thetaImpact < 0 ? '#ef4444' : '#10b981' }}>
                          {formatVND(pos.thetaImpact)}
                        </td>
                        <td>
                          <strong className={`badge badge-${pos.pnl >= 0 ? 'success' : 'danger'}`}>
                            {formatVND(pos.pnl)}
                          </strong>
                        </td>
                        <td>{formatVND(pos.stressedValue)}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                      <td colSpan="2"><strong>TOTAL</strong></td>
                      <td>{formatVND(results.totalCurrentValue)}</td>
                      <td>{formatVND(results.impactBreakdown[0].impact)}</td>
                      <td>{formatVND(results.impactBreakdown[1].impact)}</td>
                      <td>{formatVND(results.impactBreakdown[2].impact)}</td>
                      <td>{formatVND(results.impactBreakdown[3].impact)}</td>
                      <td className={`badge badge-${results.totalPnL >= 0 ? 'success' : 'danger'}`}>
                        {formatVND(results.totalPnL)}
                      </td>
                      <td>{formatVND(results.totalStressedValue)}</td>
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

export default StressTesting; 