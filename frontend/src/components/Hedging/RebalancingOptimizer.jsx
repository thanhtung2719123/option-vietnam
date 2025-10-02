import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const RebalancingOptimizer = () => {
  const [params, setParams] = useState({
    initialSpotPrice: 100000,
    volatility: 0.25,
    simulationDays: 60,
    transactionCostBps: 15.6, // 0.156% in basis points
    minFrequency: 1,
    maxFrequency: 10
  });
  const [optimizing, setOptimizing] = useState(false);
  const [results, setResults] = useState(null);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const runOptimization = () => {
    setOptimizing(true);
    
    try {
      // Test different rebalancing frequencies
      const frequencies = [];
      for (let freq = params.minFrequency; freq <= params.maxFrequency; freq++) {
        frequencies.push(freq);
      }
      
      // Simulate for each frequency
      const simulations = frequencies.map(freq => {
        const result = simulateWithFrequency(freq);
        return {
          frequency: freq,
          ...result
        };
      });
      
      // Find optimal frequency (minimum total cost)
      const optimal = simulations.reduce((best, current) => 
        current.totalCost < best.totalCost ? current : best
      );
      
      // Calculate inverse square root law validation
      const theoreticalCosts = simulations.map(sim => ({
        frequency: sim.frequency,
        empiricalCost: sim.totalCost,
        theoreticalCost: calculateTheoreticalCost(sim.frequency),
        rebalancingCost: sim.rebalancingCost,
        hedgingError: sim.hedgingError
      }));
      
      setResults({
        simulations,
        optimal,
        theoreticalCosts
      });
    } catch (error) {
      console.error('Optimization error:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const simulateWithFrequency = (frequency) => {
    const { initialSpotPrice, volatility, simulationDays, transactionCostBps } = params;
    const transactionCost = transactionCostBps / 10000;
    const dt = 1 / 252;
    const numRebalances = Math.floor(simulationDays / frequency);
    
    // Hedging error cost (proportional to sqrt(frequency))
    // Based on: Error ~ σ * sqrt(dt) * S
    const hedgingError = volatility * Math.sqrt(frequency * dt) * initialSpotPrice * 
                        Math.sqrt(simulationDays);
    
    // Rebalancing cost (proportional to number of rebalances)
    const avgDeltaChange = 0.3; // Typical delta change per rebalance
    const rebalancingCost = numRebalances * avgDeltaChange * initialSpotPrice * transactionCost;
    
    // Total cost
    const totalCost = hedgingError + rebalancingCost;
    
    return {
      numRebalances,
      hedgingError,
      rebalancingCost,
      totalCost,
      costPerDay: totalCost / simulationDays
    };
  };

  const calculateTheoreticalCost = (frequency) => {
    // Inverse square root law: C(n) = A/√n + B*n
    // where A is hedging error coefficient, B is transaction cost coefficient
    const { initialSpotPrice, volatility, transactionCostBps, simulationDays } = params;
    const transactionCost = transactionCostBps / 10000;
    
    const A = volatility * initialSpotPrice * Math.sqrt(simulationDays / 252);
    const B = 0.3 * initialSpotPrice * transactionCost;
    
    return A / Math.sqrt(frequency / (simulationDays / 252)) + B * (simulationDays / frequency);
  };

  return (
    <div className="rebalancing-optimizer">
      <div className="page-header">
        <h1>⚙️ Rebalancing Optimizer</h1>
        <p>Tối ưu hóa tần suất điều chỉnh hedge theo định luật căn bậc hai nghịch đảo</p>
      </div>

      {/* Parameters */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Tham số tối ưu hóa</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Initial spot price (VND)</label>
              <input
                type="number"
                className="form-control"
                value={params.initialSpotPrice}
                onChange={(e) => handleParamChange('initialSpotPrice', e.target.value)}
                step="1000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Volatility (σ)</label>
              <input
                type="number"
                className="form-control"
                value={params.volatility}
                onChange={(e) => handleParamChange('volatility', e.target.value)}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Simulation days</label>
              <input
                type="number"
                className="form-control"
                value={params.simulationDays}
                onChange={(e) => handleParamChange('simulationDays', e.target.value)}
                step="5"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Transaction cost (bps)</label>
              <input
                type="number"
                className="form-control"
                value={params.transactionCostBps}
                onChange={(e) => handleParamChange('transactionCostBps', e.target.value)}
                step="0.1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Min frequency (days)</label>
              <input
                type="number"
                className="form-control"
                value={params.minFrequency}
                onChange={(e) => handleParamChange('minFrequency', e.target.value)}
                min="1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max frequency (days)</label>
              <input
                type="number"
                className="form-control"
                value={params.maxFrequency}
                onChange={(e) => handleParamChange('maxFrequency', e.target.value)}
                max="30"
              />
            </div>
          </div>

          <button
            className="btn btn-primary mt-2"
            onClick={runOptimization}
            disabled={optimizing}
            style={{ width: '200px' }}
          >
            {optimizing ? '🔄 Đang tối ưu...' : '⚡ Tối ưu hóa'}
          </button>
        </div>
      </div>

      {optimizing && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang tối ưu hóa tần suất rebalancing...</p>
        </div>
      )}

      {results && !optimizing && (
        <>
          {/* Optimal Result Cards */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Optimal Frequency</div>
                  <div className="stat-card-value">{results.optimal.frequency} ngày</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  ⚡
                </div>
              </div>
              <div className="badge badge-success">Tần suất tối ưu</div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Minimum Cost</div>
                  <div className="stat-card-value">{formatVND(results.optimal.totalCost)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  💰
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {formatVND(results.optimal.costPerDay)}/ngày
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Rebalancing Cost</div>
                  <div className="stat-card-value">{formatVND(results.optimal.rebalancingCost)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  📊
                </div>
              </div>
              <div className="badge badge-warning">
                {formatPercent(results.optimal.rebalancingCost / results.optimal.totalCost)} of total
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Hedging Error</div>
                  <div className="stat-card-value">{formatVND(results.optimal.hedgingError)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  ⚠️
                </div>
              </div>
              <div className="badge badge-danger">
                {formatPercent(results.optimal.hedgingError / results.optimal.totalCost)} of total
              </div>
            </div>
          </div>

          {/* Cost Comparison Chart */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Chi phí theo tần suất rebalancing</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={results.simulations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="frequency" 
                    label={{ value: 'Rebalancing Frequency (ngày)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: 'Chi phí (VND)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="totalCost" stroke="#3b82f6" strokeWidth={3} name="Total Cost" />
                  <Line type="monotone" dataKey="rebalancingCost" stroke="#f59e0b" strokeWidth={2} name="Rebalancing Cost" />
                  <Line type="monotone" dataKey="hedgingError" stroke="#ef4444" strokeWidth={2} name="Hedging Error" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Inverse Square Root Law Validation */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Inverse Square Root Law Validation</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={results.theoreticalCosts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="frequency" label={{ value: 'Frequency (ngày)', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Cost', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="empiricalCost" stroke="#3b82f6" strokeWidth={2} name="Empirical Cost" />
                  <Line type="monotone" dataKey="theoreticalCost" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Theoretical (C = A/√n + Bn)" />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                  <strong>Định luật căn bậc hai nghịch đảo:</strong> C(n) = A/√n + B×n
                  <br/>
                  Trong đó: A = chi phí hedging error, B = chi phí transaction, n = số lần rebalance
                </p>
              </div>
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Phân tích chi phí theo frequency</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.simulations}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="frequency" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Bar dataKey="rebalancingCost" stackId="a" fill="#f59e0b" name="Rebalancing Cost" />
                  <Bar dataKey="hedgingError" stackId="a" fill="#ef4444" name="Hedging Error" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Kết quả chi tiết</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Frequency (ngày)</th>
                      <th>Rebalances</th>
                      <th>Hedging Error</th>
                      <th>Rebalancing Cost</th>
                      <th>Total Cost</th>
                      <th>Cost/Day</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.simulations.map((sim, index) => (
                      <tr key={index} style={{ 
                        backgroundColor: sim.frequency === results.optimal.frequency ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                      }}>
                        <td>
                          <strong>{sim.frequency}</strong>
                          {sim.frequency === results.optimal.frequency && 
                            <span className="badge badge-success" style={{ marginLeft: '8px' }}>Optimal</span>
                          }
                        </td>
                        <td>{sim.numRebalances}</td>
                        <td>{formatVND(sim.hedgingError)}</td>
                        <td>{formatVND(sim.rebalancingCost)}</td>
                        <td><strong>{formatVND(sim.totalCost)}</strong></td>
                        <td>{formatVND(sim.costPerDay)}</td>
                        <td>
                          {sim.frequency === results.optimal.frequency ? (
                            <span className="badge badge-success">✓ Best</span>
                          ) : sim.totalCost < results.optimal.totalCost * 1.1 ? (
                            <span className="badge badge-warning">~ Good</span>
                          ) : (
                            <span className="badge badge-danger">✗ Suboptimal</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!results && !optimizing && (
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', fontSize: '14px', padding: '40px' }}>
              ⚡ Nhấn "Tối ưu hóa" để tìm tần suất rebalancing tối ưu
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RebalancingOptimizer; 