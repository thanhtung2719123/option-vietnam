import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Plot from 'react-plotly.js';

const MonteCarloViz = () => {
  const [params, setParams] = useState({
    initialValue: 1000000000,
    timeHorizon: 30, // days
    numSimulations: 1000,
    volatility: 0.25,
    drift: 0.0,
    confidenceLevel: 0.95
  });
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const runMonteCarloSimulation = () => {
    setSimulating(true);
    
    try {
      const { initialValue, timeHorizon, numSimulations, volatility, drift } = params;
      const dt = 1 / 252; // Daily time step
      
      // Run simulations
      const paths = [];
      const finalValues = [];
      
      for (let sim = 0; sim < numSimulations; sim++) {
        const path = [{ day: 0, value: initialValue }];
        let currentValue = initialValue;
        
        for (let day = 1; day <= timeHorizon; day++) {
          const randomShock = (Math.random() - 0.5) * 2; // Approximate normal
          const driftTerm = (drift - 0.5 * volatility * volatility) * dt;
          const diffusionTerm = volatility * Math.sqrt(dt) * randomShock;
          
          currentValue = currentValue * Math.exp(driftTerm + diffusionTerm);
          path.push({ day, value: currentValue });
        }
        
        paths.push(path);
        finalValues.push(currentValue);
      }
      
      // Calculate statistics
      const avgFinalValue = finalValues.reduce((sum, v) => sum + v, 0) / numSimulations;
      const sortedFinalValues = [...finalValues].sort((a, b) => a - b);
      
      // Percentiles
      const p5 = sortedFinalValues[Math.floor(0.05 * numSimulations)];
      const p25 = sortedFinalValues[Math.floor(0.25 * numSimulations)];
      const p50 = sortedFinalValues[Math.floor(0.50 * numSimulations)];
      const p75 = sortedFinalValues[Math.floor(0.75 * numSimulations)];
      const p95 = sortedFinalValues[Math.floor(0.95 * numSimulations)];
      
      // VaR calculation
      const varIndex = Math.floor((1 - params.confidenceLevel) * numSimulations);
      const var95 = initialValue - sortedFinalValues[varIndex];
      
      // Expected Shortfall
      const tailValues = sortedFinalValues.slice(0, varIndex);
      const avgTailValue = tailValues.reduce((sum, v) => sum + v, 0) / tailValues.length;
      const expectedShortfall = initialValue - avgTailValue;
      
      // Distribution
      const distribution = createDistribution(finalValues, 30);
      
      // Confidence intervals over time
      const confidenceIntervals = [];
      for (let day = 0; day <= timeHorizon; day += Math.max(1, Math.floor(timeHorizon / 20))) {
        const dayValues = paths.map(path => path[day].value).sort((a, b) => a - b);
        confidenceIntervals.push({
          day,
          p5: dayValues[Math.floor(0.05 * numSimulations)],
          p25: dayValues[Math.floor(0.25 * numSimulations)],
          p50: dayValues[Math.floor(0.50 * numSimulations)],
          p75: dayValues[Math.floor(0.75 * numSimulations)],
          p95: dayValues[Math.floor(0.95 * numSimulations)]
        });
      }
      
      // Select representative paths
      const representativePaths = [
        paths[Math.floor(0.05 * numSimulations)], // 5th percentile
        paths[Math.floor(0.50 * numSimulations)], // Median
        paths[Math.floor(0.95 * numSimulations)]  // 95th percentile
      ];
      
      // Win/Loss analysis
      const profitScenarios = finalValues.filter(v => v > initialValue).length;
      const lossScenarios = finalValues.filter(v => v <= initialValue).length;
      const winRate = profitScenarios / numSimulations;
      
      setResults({
        paths,
        finalValues,
        representativePaths,
        distribution,
        confidenceIntervals,
        statistics: {
          avgFinalValue,
          p5, p25, p50, p75, p95,
          var95,
          expectedShortfall,
          stdDev: Math.sqrt(finalValues.reduce((sum, v) => sum + Math.pow(v - avgFinalValue, 2), 0) / numSimulations),
          minValue: Math.min(...finalValues),
          maxValue: Math.max(...finalValues),
          profitScenarios,
          lossScenarios,
          winRate
        }
      });
    } catch (error) {
      console.error('Monte Carlo error:', error);
    } finally {
      setSimulating(false);
    }
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
        value: (binStart + binEnd) / 2,
        count,
        frequency: count / data.length
      });
    }
    return distribution;
  };

  useEffect(() => {
    runMonteCarloSimulation();
  }, []);

  return (
    <div className="monte-carlo-viz">
      <div className="page-header">
        <h1>🎲 Monte Carlo Simulation</h1>
        <p>Mô phỏng Monte Carlo với hàng nghìn kịch bản</p>
      </div>

      {/* Parameters */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Simulation Parameters</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Initial Portfolio Value (VND)</label>
              <input
                type="number"
                className="form-control"
                value={params.initialValue}
                onChange={(e) => handleParamChange('initialValue', e.target.value)}
                step="100000000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Time Horizon (days)</label>
              <input
                type="number"
                className="form-control"
                value={params.timeHorizon}
                onChange={(e) => handleParamChange('timeHorizon', e.target.value)}
                min="5"
                max="252"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Number of Simulations</label>
              <select
                className="form-control"
                value={params.numSimulations}
                onChange={(e) => handleParamChange('numSimulations', e.target.value)}
              >
                <option value="100">100 (Fast)</option>
                <option value="500">500</option>
                <option value="1000">1,000 (Recommended)</option>
                <option value="5000">5,000</option>
                <option value="10000">10,000 (Accurate)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Volatility (σ)</label>
              <input
                type="number"
                className="form-control"
                value={params.volatility}
                onChange={(e) => handleParamChange('volatility', e.target.value)}
                step="0.01"
                min="0.1"
                max="1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Drift (μ)</label>
              <input
                type="number"
                className="form-control"
                value={params.drift}
                onChange={(e) => handleParamChange('drift', e.target.value)}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confidence Level</label>
              <select
                className="form-control"
                value={params.confidenceLevel}
                onChange={(e) => handleParamChange('confidenceLevel', e.target.value)}
              >
                <option value="0.90">90%</option>
                <option value="0.95">95%</option>
                <option value="0.99">99%</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary mt-2"
            onClick={runMonteCarloSimulation}
            disabled={simulating}
            style={{ width: '200px' }}
          >
            {simulating ? '🔄 Simulating...' : '▶️ Run Simulation'}
          </button>
        </div>
      </div>

      {simulating && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang chạy {params.numSimulations} simulations...</p>
        </div>
      )}

      {results && !simulating && (
        <>
          {/* Statistics Summary */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Average Final Value</div>
                  <div className="stat-card-value">{formatVND(results.statistics.avgFinalValue)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  📊
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                From {formatVND(params.initialValue)}
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">VaR ({formatPercent(params.confidenceLevel)})</div>
                  <div className="stat-card-value">{formatVND(results.statistics.var95)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  ⚠️
                </div>
              </div>
              <div className="badge badge-danger">
                Maximum loss at {formatPercent(params.confidenceLevel)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Expected Shortfall</div>
                  <div className="stat-card-value">{formatVND(results.statistics.expectedShortfall)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  📉
                </div>
              </div>
              <div className="badge badge-danger">
                Average loss beyond VaR
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Win Rate</div>
                  <div className="stat-card-value">{formatPercent(results.statistics.winRate)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  ✓
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {results.statistics.profitScenarios} profit / {results.statistics.lossScenarios} loss
              </p>
            </div>
          </div>

          {/* Simulation Paths */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Simulation Paths ({params.numSimulations} scenarios)</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number"
                    dataKey="day"
                    domain={[0, params.timeHorizon]}
                    label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Portfolio Value (VND)', angle: -90, position: 'insideLeft' }}
                    tickFormatter={(value) => formatVND(value)}
                  />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  
                  {/* Representative paths */}
                  <Line 
                    data={results.representativePaths[0]} 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="5th Percentile (Worst)"
                    dot={false}
                  />
                  <Line 
                    data={results.representativePaths[1]} 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Median"
                    dot={false}
                  />
                  <Line 
                    data={results.representativePaths[2]} 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="95th Percentile (Best)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confidence Bands */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Confidence Intervals</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={results.confidenceIntervals}>
                  <defs>
                    <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                  <YAxis tickFormatter={(value) => formatVND(value)} />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="p95" stroke="#10b981" fill="transparent" name="95th %ile" />
                  <Area type="monotone" dataKey="p75" stroke="#3b82f6" fill="url(#colorRange)" name="75th %ile" />
                  <Area type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={3} fill="transparent" name="Median" />
                  <Area type="monotone" dataKey="p25" stroke="#f59e0b" fill="transparent" name="25th %ile" />
                  <Area type="monotone" dataKey="p5" stroke="#ef4444" fill="transparent" name="5th %ile" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Final Value Distribution */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Final Portfolio Value Distribution</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.distribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="value" 
                    tickFormatter={(value) => formatVND(value)}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => formatNumber(value)}
                    labelFormatter={(value) => formatVND(value)}
                  />
                  <Bar dataKey="count" fill="#3b82f6">
                    {results.distribution.map((entry, index) => (
                      <Bar 
                        key={`bar-${index}`} 
                        fill={entry.value < params.initialValue - results.statistics.var95 ? '#ef4444' : entry.value < params.initialValue ? '#f59e0b' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statistics Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Simulation Statistics</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Percentile</th>
                      <th>Final Value</th>
                      <th>P&L</th>
                      <th>Return</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>5th (Worst)</td>
                      <td className="badge badge-danger">{formatVND(results.statistics.p5)}</td>
                      <td>{formatVND(results.statistics.p5 - params.initialValue)}</td>
                      <td>{formatPercent((results.statistics.p5 - params.initialValue) / params.initialValue)}</td>
                      <td>95% scenarios better than this</td>
                    </tr>
                    <tr>
                      <td>25th</td>
                      <td>{formatVND(results.statistics.p25)}</td>
                      <td>{formatVND(results.statistics.p25 - params.initialValue)}</td>
                      <td>{formatPercent((results.statistics.p25 - params.initialValue) / params.initialValue)}</td>
                      <td>75% scenarios better</td>
                    </tr>
                    <tr>
                      <td>50th (Median)</td>
                      <td className="badge badge-primary">{formatVND(results.statistics.p50)}</td>
                      <td>{formatVND(results.statistics.p50 - params.initialValue)}</td>
                      <td>{formatPercent((results.statistics.p50 - params.initialValue) / params.initialValue)}</td>
                      <td>Typical scenario</td>
                    </tr>
                    <tr>
                      <td>75th</td>
                      <td>{formatVND(results.statistics.p75)}</td>
                      <td>{formatVND(results.statistics.p75 - params.initialValue)}</td>
                      <td>{formatPercent((results.statistics.p75 - params.initialValue) / params.initialValue)}</td>
                      <td>25% scenarios better</td>
                    </tr>
                    <tr>
                      <td>95th (Best)</td>
                      <td className="badge badge-success">{formatVND(results.statistics.p95)}</td>
                      <td>{formatVND(results.statistics.p95 - params.initialValue)}</td>
                      <td>{formatPercent((results.statistics.p95 - params.initialValue) / params.initialValue)}</td>
                      <td>5% scenarios better than this</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f1f5f9' }}>
                      <td><strong>Average</strong></td>
                      <td><strong>{formatVND(results.statistics.avgFinalValue)}</strong></td>
                      <td><strong>{formatVND(results.statistics.avgFinalValue - params.initialValue)}</strong></td>
                      <td><strong>{formatPercent((results.statistics.avgFinalValue - params.initialValue) / params.initialValue)}</strong></td>
                      <td>Expected value</td>
                    </tr>
                    <tr>
                      <td><strong>VaR ({formatPercent(params.confidenceLevel)})</strong></td>
                      <td className="badge badge-danger">{formatVND(params.initialValue - results.statistics.var95)}</td>
                      <td className="badge badge-danger">{formatVND(-results.statistics.var95)}</td>
                      <td>{formatPercent(-results.statistics.var95 / params.initialValue)}</td>
                      <td>Maximum loss at {formatPercent(params.confidenceLevel)}</td>
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

export default MonteCarloViz; 