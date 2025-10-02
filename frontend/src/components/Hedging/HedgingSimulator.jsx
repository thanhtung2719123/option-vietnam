import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../context/MarketDataContext';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import apiService from '../../services/apiService';

const HedgingSimulator = () => {
  const { warrants } = useMarketData();
  const [selectedWarrant, setSelectedWarrant] = useState('');
  const [params, setParams] = useState({
    initialSpotPrice: 100000,
    strikePrice: 100000,
    timeToMaturity: 0.5,
    volatility: 0.25,
    riskFreeRate: 0.0376,
    rebalancingFrequency: 1, // days
    simulationDays: 30,
    transactionCost: 0.00156, // 0.156% Vietnamese market
    slippage: 0.0005
  });
  const [simulating, setSimulating] = useState(false);
  const [results, setResults] = useState(null);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      // Simulate GBM price path
      const pricePath = generatePricePath();
      
      // Simulate delta hedging
      const hedgingResults = simulateDeltaHedging(pricePath);
      
      setResults({
        pricePath,
        hedgingPath: hedgingResults.hedgingPath,
        pnlPath: hedgingResults.pnlPath,
        summary: hedgingResults.summary
      });
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setSimulating(false);
    }
  };

  const generatePricePath = () => {
    const { initialSpotPrice, volatility, riskFreeRate, simulationDays } = params;
    const dt = 1/252; // daily time step
    const path = [{ day: 0, price: initialSpotPrice, logReturn: 0 }];
    
    let currentPrice = initialSpotPrice;
    for (let i = 1; i <= simulationDays; i++) {
      const randomShock = (Math.random() - 0.5) * 2; // Normal approximation
      const drift = (riskFreeRate - 0.5 * volatility * volatility) * dt;
      const diffusion = volatility * Math.sqrt(dt) * randomShock;
      
      currentPrice = currentPrice * Math.exp(drift + diffusion);
      const logReturn = Math.log(currentPrice / path[i-1].price);
      
      path.push({
        day: i,
        price: currentPrice,
        logReturn: logReturn
      });
    }
    
    return path;
  };

  const calculateDelta = (S, K, T, sigma, r) => {
    if (T <= 0) return S > K ? 1 : 0;
    
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    // Normal CDF approximation
    const delta = 0.5 * (1 + Math.erf(d1 / Math.sqrt(2)));
    return delta;
  };

  const simulateDeltaHedging = (pricePath) => {
    const { strikePrice, timeToMaturity, volatility, riskFreeRate, 
            rebalancingFrequency, transactionCost, slippage } = params;
    
    const hedgingPath = [];
    const pnlPath = [];
    let cumulativePnL = 0;
    let cumulativeCost = 0;
    let hedgePosition = 0;
    let previousDelta = 0;
    
    pricePath.forEach((point, index) => {
      const timeRemaining = Math.max(0, timeToMaturity - (index / 252));
      const currentDelta = calculateDelta(point.price, strikePrice, timeRemaining, volatility, riskFreeRate);
      
      let transactionCostToday = 0;
      let rebalanced = false;
      
      // Rebalance if it's a rebalancing day
      if (index % rebalancingFrequency === 0 || index === 0) {
        const deltaChange = currentDelta - previousDelta;
        const sharesTraded = Math.abs(deltaChange);
        
        if (sharesTraded > 0.001) { // Only if significant change
          transactionCostToday = sharesTraded * point.price * (transactionCost + slippage);
          cumulativeCost += transactionCostToday;
          hedgePosition = currentDelta;
          previousDelta = currentDelta;
          rebalanced = true;
        }
      }
      
      // Calculate P&L from hedge position
      if (index > 0) {
        const priceChange = point.price - pricePath[index - 1].price;
        const hedgePnL = hedgePosition * priceChange;
        cumulativePnL += hedgePnL - transactionCostToday;
      }
      
      hedgingPath.push({
        day: point.day,
        price: point.price,
        delta: currentDelta,
        hedgePosition: hedgePosition,
        rebalanced: rebalanced
      });
      
      pnlPath.push({
        day: point.day,
        pnl: cumulativePnL,
        cost: cumulativeCost,
        netPnL: cumulativePnL - cumulativeCost
      });
    });
    
    // Calculate summary statistics
    const finalPnL = pnlPath[pnlPath.length - 1].netPnL;
    const totalCost = cumulativeCost;
    const rebalancingCount = hedgingPath.filter(p => p.rebalanced).length;
    const avgCostPerRebalance = totalCost / Math.max(1, rebalancingCount);
    const pnlVolatility = Math.sqrt(
      pnlPath.reduce((sum, p, i) => {
        if (i === 0) return 0;
        const pnlChange = p.pnl - pnlPath[i-1].pnl;
        return sum + pnlChange * pnlChange;
      }, 0) / Math.max(1, pnlPath.length - 1)
    );
    
    return {
      hedgingPath,
      pnlPath,
      summary: {
        finalPnL,
        totalCost,
        netPnL: finalPnL - totalCost,
        rebalancingCount,
        avgCostPerRebalance,
        pnlVolatility,
        costRatio: totalCost / Math.abs(finalPnL || 1),
        finalDelta: hedgingPath[hedgingPath.length - 1].delta
      }
    };
  };

  return (
    <div className="hedging-simulator">
      <div className="page-header">
        <h1>🎯 Delta Hedging Simulator</h1>
        <p>Mô phỏng dynamic delta hedging với chi phí giao dịch</p>
      </div>

      {/* Parameter Input */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Tham số mô phỏng</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Giá spot ban đầu (VND)</label>
              <input
                type="number"
                className="form-control"
                value={params.initialSpotPrice}
                onChange={(e) => handleParamChange('initialSpotPrice', e.target.value)}
                step="1000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Strike price (VND)</label>
              <input
                type="number"
                className="form-control"
                value={params.strikePrice}
                onChange={(e) => handleParamChange('strikePrice', e.target.value)}
                step="1000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Time to maturity (năm)</label>
              <input
                type="number"
                className="form-control"
                value={params.timeToMaturity}
                onChange={(e) => handleParamChange('timeToMaturity', e.target.value)}
                step="0.1"
                min="0.1"
                max="2"
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
                min="0.1"
                max="1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Risk-free rate</label>
              <input
                type="number"
                className="form-control"
                value={params.riskFreeRate}
                onChange={(e) => handleParamChange('riskFreeRate', e.target.value)}
                step="0.001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rebalancing frequency (ngày)</label>
              <input
                type="number"
                className="form-control"
                value={params.rebalancingFrequency}
                onChange={(e) => handleParamChange('rebalancingFrequency', e.target.value)}
                step="1"
                min="1"
                max="10"
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
                min="10"
                max="252"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Transaction cost (%)</label>
              <input
                type="number"
                className="form-control"
                value={params.transactionCost * 100}
                onChange={(e) => handleParamChange('transactionCost', e.target.value / 100)}
                step="0.01"
              />
            </div>
          </div>

          <button
            className="btn btn-primary mt-2"
            onClick={runSimulation}
            disabled={simulating}
            style={{ width: '200px' }}
          >
            {simulating ? '🔄 Đang mô phỏng...' : '▶️ Chạy mô phỏng'}
          </button>
        </div>
      </div>

      {simulating && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang mô phỏng delta hedging...</p>
        </div>
      )}

      {results && !simulating && (
        <>
          {/* Summary Cards */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Net P&L</div>
                  <div className="stat-card-value">{formatVND(results.summary.netPnL)}</div>
                </div>
                <div className="stat-card-icon" style={{ 
                  backgroundColor: results.summary.netPnL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: results.summary.netPnL >= 0 ? '#10b981' : '#ef4444'
                }}>
                  {results.summary.netPnL >= 0 ? '✓' : '✗'}
                </div>
              </div>
              <div className={`badge badge-${results.summary.netPnL >= 0 ? 'success' : 'danger'}`}>
                {results.summary.netPnL >= 0 ? 'Lợi nhuận' : 'Thua lỗ'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Total Cost</div>
                  <div className="stat-card-value">{formatVND(results.summary.totalCost)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  💰
                </div>
              </div>
              <div className="badge badge-warning">
                {formatPercent(results.summary.costRatio)} of P&L
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Rebalancing Count</div>
                  <div className="stat-card-value">{results.summary.rebalancingCount}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  🔄
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {formatVND(results.summary.avgCostPerRebalance)}/lần
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Final Delta</div>
                  <div className="stat-card-value">{formatNumber(results.summary.finalDelta)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  Δ
                </div>
              </div>
              <div className="badge badge-primary">Delta position</div>
            </div>
          </div>

          {/* Price Path Chart */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Giá cổ phiếu cơ sở (GBM Simulation)</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={results.pricePath}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Ngày', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Giá (VND)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="rgba(59, 130, 246, 0.2)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Delta Hedging Path */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Delta Hedging Path</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={results.hedgingPath}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Ngày', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Delta / Position', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="stepAfter" dataKey="delta" stroke="#8b5cf6" name="Delta" strokeWidth={2} />
                  <Line type="stepAfter" dataKey="hedgePosition" stroke="#10b981" name="Hedge Position" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* P&L Evolution */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">P&L Evolution</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={results.pnlPath}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Ngày', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'P&L (VND)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="pnl" stroke="#3b82f6" name="Gross P&L" strokeWidth={2} />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" name="Cumulative Cost" strokeWidth={2} />
                  <Line type="monotone" dataKey="netPnL" stroke="#10b981" name="Net P&L" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Table */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Kết quả chi tiết</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Value</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Final Net P&L</strong></td>
                      <td className={`badge badge-${results.summary.netPnL >= 0 ? 'success' : 'danger'}`}>
                        {formatVND(results.summary.netPnL)}
                      </td>
                      <td>P&L sau khi trừ chi phí</td>
                    </tr>
                    <tr>
                      <td><strong>Total Transaction Cost</strong></td>
                      <td>{formatVND(results.summary.totalCost)}</td>
                      <td>Tổng chi phí giao dịch</td>
                    </tr>
                    <tr>
                      <td><strong>Rebalancing Count</strong></td>
                      <td>{results.summary.rebalancingCount}</td>
                      <td>Số lần điều chỉnh hedge</td>
                    </tr>
                    <tr>
                      <td><strong>Avg Cost per Rebalance</strong></td>
                      <td>{formatVND(results.summary.avgCostPerRebalance)}</td>
                      <td>Chi phí trung bình mỗi lần</td>
                    </tr>
                    <tr>
                      <td><strong>P&L Volatility</strong></td>
                      <td>{formatVND(results.summary.pnlVolatility)}</td>
                      <td>Độ biến động của P&L</td>
                    </tr>
                    <tr>
                      <td><strong>Cost Ratio</strong></td>
                      <td>{formatPercent(results.summary.costRatio)}</td>
                      <td>Chi phí / P&L</td>
                    </tr>
                    <tr>
                      <td><strong>Final Delta</strong></td>
                      <td>{formatNumber(results.summary.finalDelta)}</td>
                      <td>Delta cuối kỳ</td>
                    </tr>
                    <tr>
                      <td><strong>Initial Spot</strong></td>
                      <td>{formatVND(params.initialSpotPrice)}</td>
                      <td>Giá spot ban đầu</td>
                    </tr>
                    <tr>
                      <td><strong>Final Spot</strong></td>
                      <td>{formatVND(results.pricePath[results.pricePath.length - 1].price)}</td>
                      <td>Giá spot cuối kỳ</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!results && !simulating && (
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', fontSize: '14px', padding: '40px' }}>
              ▶️ Nhấn "Chạy mô phỏng" để bắt đầu
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HedgingSimulator; 