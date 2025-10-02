import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber, formatDate } from '../../utils/formatters';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const PnLAnalysis = () => {
  const [timeRange, setTimeRange] = useState('30d'); // 7d, 30d, 90d, 1y
  const [pnlData, setPnlData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generatePnLData();
  }, [timeRange]);

  const generatePnLData = () => {
    setLoading(true);
    
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 252;
    const dailyPnL = [];
    let cumulativePnL = 0;
    let cumulativeHedgePnL = 0;
    let cumulativeOptionPnL = 0;
    let cumulativeCost = 0;
    
    for (let i = 0; i <= days; i++) {
      // Simulate daily P&L components
      const optionPnL = (Math.random() - 0.5) * 5000000; // Option P&L
      const hedgePnL = (Math.random() - 0.48) * 5000000; // Hedge P&L (slightly negative bias)
      const transactionCost = Math.random() * 100000; // Daily transaction cost
      const dailyNet = optionPnL + hedgePnL - transactionCost;
      
      cumulativeOptionPnL += optionPnL;
      cumulativeHedgePnL += hedgePnL;
      cumulativeCost += transactionCost;
      cumulativePnL += dailyNet;
      
      dailyPnL.push({
        day: i,
        date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000),
        optionPnL: cumulativeOptionPnL,
        hedgePnL: cumulativeHedgePnL,
        transactionCost: cumulativeCost,
        netPnL: cumulativePnL,
        dailyPnL: dailyNet
      });
    }
    
    // Calculate performance metrics
    const avgDailyPnL = dailyPnL.reduce((sum, d) => sum + d.dailyPnL, 0) / days;
    const pnlStdDev = Math.sqrt(
      dailyPnL.reduce((sum, d) => sum + Math.pow(d.dailyPnL - avgDailyPnL, 2), 0) / days
    );
    const sharpeRatio = (avgDailyPnL / pnlStdDev) * Math.sqrt(252); // Annualized
    
    const maxPnL = Math.max(...dailyPnL.map(d => d.netPnL));
    const minPnL = Math.min(...dailyPnL.map(d => d.netPnL));
    const maxDrawdown = maxPnL - minPnL;
    
    const profitDays = dailyPnL.filter(d => d.dailyPnL > 0).length;
    const lossDays = dailyPnL.filter(d => d.dailyPnL < 0).length;
    const winRate = profitDays / (profitDays + lossDays);
    
    // Monthly breakdown
    const monthlyData = groupByMonth(dailyPnL);
    
    // P&L distribution
    const pnlDistribution = createDistribution(dailyPnL.map(d => d.dailyPnL));
    
    setPnlData({
      dailyPnL,
      monthlyData,
      pnlDistribution,
      metrics: {
        totalPnL: cumulativePnL,
        avgDailyPnL,
        pnlStdDev,
        sharpeRatio,
        maxDrawdown,
        winRate,
        profitDays,
        lossDays,
        totalCost: cumulativeCost,
        optionPnL: cumulativeOptionPnL,
        hedgePnL: cumulativeHedgePnL
      }
    });
    
    setLoading(false);
  };

  const groupByMonth = (dailyData) => {
    const months = {};
    dailyData.forEach(d => {
      const month = d.date.toISOString().slice(0, 7); // YYYY-MM
      if (!months[month]) {
        months[month] = { month, pnl: 0, count: 0 };
      }
      months[month].pnl += d.dailyPnL;
      months[month].count++;
    });
    return Object.values(months);
  };

  const createDistribution = (values) => {
    const bins = 10;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binSize = (max - min) / bins;
    
    const distribution = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binSize;
      const binEnd = binStart + binSize;
      const count = values.filter(v => v >= binStart && v < binEnd).length;
      distribution.push({
        range: `${formatVND(binStart)} - ${formatVND(binEnd)}`,
        count,
        binStart
      });
    }
    return distribution;
  };

  return (
    <div className="pnl-analysis">
      <div className="page-header">
        <h1>💵 P&L Analysis</h1>
        <p>Phân tích lợi nhuận và hiệu suất hedging</p>
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

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang phân tích P&L...</p>
        </div>
      )}

      {pnlData && !loading && (
        <>
          {/* Performance Metrics */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Total P&L</div>
                  <div className="stat-card-value">{formatVND(pnlData.metrics.totalPnL)}</div>
                </div>
                <div className="stat-card-icon" style={{ 
                  backgroundColor: pnlData.metrics.totalPnL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: pnlData.metrics.totalPnL >= 0 ? '#10b981' : '#ef4444'
                }}>
                  💰
                </div>
              </div>
              <div className={`badge badge-${pnlData.metrics.totalPnL >= 0 ? 'success' : 'danger'}`}>
                {pnlData.metrics.totalPnL >= 0 ? 'Lợi nhuận' : 'Thua lỗ'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Sharpe Ratio</div>
                  <div className="stat-card-value">{formatNumber(pnlData.metrics.sharpeRatio)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  📊
                </div>
              </div>
              <div className={`badge badge-${pnlData.metrics.sharpeRatio > 1 ? 'success' : pnlData.metrics.sharpeRatio > 0.5 ? 'warning' : 'danger'}`}>
                {pnlData.metrics.sharpeRatio > 1 ? 'Tốt' : pnlData.metrics.sharpeRatio > 0.5 ? 'Trung bình' : 'Kém'}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Win Rate</div>
                  <div className="stat-card-value">{formatPercent(pnlData.metrics.winRate)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  ✓
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {pnlData.metrics.profitDays} profit / {pnlData.metrics.lossDays} loss days
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Max Drawdown</div>
                  <div className="stat-card-value">{formatVND(pnlData.metrics.maxDrawdown)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  📉
                </div>
              </div>
              <div className="badge badge-danger">Rủi ro tối đa</div>
            </div>
          </div>

          {/* Cumulative P&L Chart */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Cumulative P&L Evolution</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={pnlData.dailyPnL}>
                  <defs>
                    <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    label={{ value: 'Ngày', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: 'P&L (VND)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => formatVND(value)}
                    labelFormatter={(day) => `Ngày ${day}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="netPnL" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorPnL)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* P&L Components */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">P&L Components Breakdown</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={pnlData.dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="optionPnL" stroke="#10b981" name="Option P&L" strokeWidth={2} />
                  <Line type="monotone" dataKey="hedgePnL" stroke="#8b5cf6" name="Hedge P&L" strokeWidth={2} />
                  <Line type="monotone" dataKey="transactionCost" stroke="#ef4444" name="Transaction Cost" strokeWidth={2} />
                  <Line type="monotone" dataKey="netPnL" stroke="#3b82f6" name="Net P&L" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly P&L */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Monthly P&L</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pnlData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Bar dataKey="pnl" fill="#3b82f6">
                    {pnlData.monthlyData.map((entry, index) => (
                      <Bar key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily P&L Distribution */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Daily P&L Distribution</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pnlData.pnlDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Metrics */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Detailed Performance Metrics</h3>
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
                      <td><strong>Total Net P&L</strong></td>
                      <td className={`badge badge-${pnlData.metrics.totalPnL >= 0 ? 'success' : 'danger'}`}>
                        {formatVND(pnlData.metrics.totalPnL)}
                      </td>
                      <td>Tổng lợi nhuận sau chi phí</td>
                    </tr>
                    <tr>
                      <td><strong>Option P&L</strong></td>
                      <td>{formatVND(pnlData.metrics.optionPnL)}</td>
                      <td>P&L từ option positions</td>
                    </tr>
                    <tr>
                      <td><strong>Hedge P&L</strong></td>
                      <td>{formatVND(pnlData.metrics.hedgePnL)}</td>
                      <td>P&L từ hedge positions</td>
                    </tr>
                    <tr>
                      <td><strong>Total Transaction Cost</strong></td>
                      <td className="badge badge-danger">{formatVND(pnlData.metrics.totalCost)}</td>
                      <td>Tổng chi phí giao dịch</td>
                    </tr>
                    <tr>
                      <td><strong>Average Daily P&L</strong></td>
                      <td>{formatVND(pnlData.metrics.avgDailyPnL)}</td>
                      <td>P&L trung bình mỗi ngày</td>
                    </tr>
                    <tr>
                      <td><strong>P&L Std Dev</strong></td>
                      <td>{formatVND(pnlData.metrics.pnlStdDev)}</td>
                      <td>Độ biến động P&L</td>
                    </tr>
                    <tr>
                      <td><strong>Sharpe Ratio (Annualized)</strong></td>
                      <td>
                        <span className={`badge badge-${pnlData.metrics.sharpeRatio > 1 ? 'success' : pnlData.metrics.sharpeRatio > 0.5 ? 'warning' : 'danger'}`}>
                          {formatNumber(pnlData.metrics.sharpeRatio)}
                        </span>
                      </td>
                      <td>Risk-adjusted return</td>
                    </tr>
                    <tr>
                      <td><strong>Maximum Drawdown</strong></td>
                      <td className="badge badge-danger">{formatVND(pnlData.metrics.maxDrawdown)}</td>
                      <td>Thua lỗ tối đa từ đỉnh</td>
                    </tr>
                    <tr>
                      <td><strong>Win Rate</strong></td>
                      <td>{formatPercent(pnlData.metrics.winRate)}</td>
                      <td>Tỷ lệ ngày lời</td>
                    </tr>
                    <tr>
                      <td><strong>Profit Days / Loss Days</strong></td>
                      <td>{pnlData.metrics.profitDays} / {pnlData.metrics.lossDays}</td>
                      <td>Số ngày lời / lỗ</td>
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

export default PnLAnalysis; 