import React, { useState, useEffect } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const HedgingStrategies = () => {
  const [selectedStrategy, setSelectedStrategy] = useState('delta');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const strategies = [
    {
      id: 'delta',
      name: 'Delta Hedging',
      description: 'Hedge chỉ Delta, điều chỉnh theo giá cơ sở',
      complexity: 2,
      cost: 2,
      effectiveness: 4,
      rebalanceFreq: 'Hàng ngày',
      bestFor: 'Thị trường ít biến động'
    },
    {
      id: 'deltaGamma',
      name: 'Delta-Gamma Hedging',
      description: 'Hedge cả Delta và Gamma với options',
      complexity: 4,
      cost: 3,
      effectiveness: 5,
      rebalanceFreq: 'Hàng tuần',
      bestFor: 'Thị trường biến động mạnh'
    },
    {
      id: 'deltaVega',
      name: 'Delta-Vega Hedging',
      description: 'Hedge Delta và Vega (volatility risk)',
      complexity: 4,
      cost: 3,
      effectiveness: 4,
      rebalanceFreq: 'Khi vol thay đổi >10%',
      bestFor: 'Khi volatility không ổn định'
    },
    {
      id: 'static',
      name: 'Static Hedging',
      description: 'Hedge một lần, không điều chỉnh',
      complexity: 1,
      cost: 1,
      effectiveness: 2,
      rebalanceFreq: 'Không',
      bestFor: 'Chi phí giao dịch rất cao'
    },
    {
      id: 'dynamic',
      name: 'Full Dynamic Hedging',
      description: 'Hedge tất cả Greeks, điều chỉnh liên tục',
      complexity: 5,
      cost: 5,
      effectiveness: 5,
      rebalanceFreq: 'Real-time',
      bestFor: 'Portfolios lớn, thanh khoản tốt'
    }
  ];

  useEffect(() => {
    generateComparison();
  }, []);

  const generateComparison = () => {
    setLoading(true);
    
    // Simulate performance data for each strategy
    const performanceData = strategies.map(strategy => {
      const baseReturn = Math.random() * 20 - 5; // -5% to +15%
      const volatility = (6 - strategy.effectiveness) * 2; // Lower effectiveness = higher vol
      const cost = strategy.cost * 500000; // Cost in VND
      const sharpeRatio = (baseReturn - cost / 1000000) / volatility;
      
      return {
        strategy: strategy.name,
        ...strategy,
        avgReturn: baseReturn,
        volatility: volatility,
        sharpeRatio: sharpeRatio,
        cost: cost,
        netReturn: baseReturn - (cost / 1000000),
        maxDrawdown: volatility * 1.5,
        winRate: 0.5 + (strategy.effectiveness - 3) * 0.1
      };
    });
    
    // Radar chart data for strategy comparison
    const radarData = [
      {
        metric: 'Effectiveness',
        ...Object.fromEntries(strategies.map(s => [s.name, s.effectiveness * 20]))
      },
      {
        metric: 'Cost',
        ...Object.fromEntries(strategies.map(s => [s.name, (6 - s.cost) * 20])) // Inverted
      },
      {
        metric: 'Simplicity',
        ...Object.fromEntries(strategies.map(s => [s.name, (6 - s.complexity) * 20])) // Inverted
      },
      {
        metric: 'Stability',
        ...Object.fromEntries(performanceData.map(s => [s.strategy, (10 - s.volatility) * 10]))
      }
    ];
    
    setComparison({
      performanceData,
      radarData
    });
    
    setLoading(false);
  };

  const getStrategyColor = (index) => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    return colors[index % colors.length];
  };

  const getRecommendation = () => {
    const recommendations = [
      {
        scenario: 'Thị trường ổn định, chi phí thấp',
        strategy: 'Delta Hedging',
        reason: 'Đơn giản, chi phí thấp, hiệu quả tốt khi thị trường ít biến động'
      },
      {
        scenario: 'Thị trường biến động mạnh',
        strategy: 'Delta-Gamma Hedging',
        reason: 'Bảo vệ tốt hơn khi giá thay đổi nhanh, Gamma giúp giảm tần suất rebalancing'
      },
      {
        scenario: 'Volatility không ổn định',
        strategy: 'Delta-Vega Hedging',
        reason: 'Hedge được rủi ro từ volatility, quan trọng cho warrants gần ATM'
      },
      {
        scenario: 'Chi phí giao dịch rất cao',
        strategy: 'Static Hedging',
        reason: 'Tránh chi phí rebalancing, chấp nhận tracking error cao hơn'
      },
      {
        scenario: 'Portfolio lớn, chuyên nghiệp',
        strategy: 'Full Dynamic Hedging',
        reason: 'Hiệu quả tốt nhất, phù hợp khi có hệ thống tự động và thanh khoản tốt'
      }
    ];
    
    return recommendations;
  };

  return (
    <div className="hedging-strategies">
      <div className="page-header">
        <h1>🎯 Hedging Strategies</h1>
        <p>So sánh và lựa chọn chiến lược hedging phù hợp</p>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang phân tích strategies...</p>
        </div>
      )}

      {comparison && !loading && (
        <>
          {/* Strategy Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {strategies.map((strategy, index) => (
              <div
                key={strategy.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  border: selectedStrategy === strategy.id ? `2px solid ${getStrategyColor(index)}` : '1px solid #e2e8f0',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedStrategy(strategy.id)}
              >
                <div className="card-body">
                  <h3 style={{ marginBottom: '8px', color: getStrategyColor(index) }}>
                    {strategy.name}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
                    {strategy.description}
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div>
                      <strong>Complexity:</strong>
                      <div style={{ marginTop: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < strategy.complexity ? '#f59e0b' : '#e2e8f0' }}>★</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <strong>Cost:</strong>
                      <div style={{ marginTop: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < strategy.cost ? '#ef4444' : '#e2e8f0' }}>💰</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <strong>Effectiveness:</strong>
                      <div style={{ marginTop: '4px' }}>
                        {[...Array(5)].map((_, i) => (
                          <span key={i} style={{ color: i < strategy.effectiveness ? '#10b981' : '#e2e8f0' }}>✓</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <strong>Rebalance:</strong>
                      <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                        {strategy.rebalanceFreq}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>
                    <strong>Best for:</strong> {strategy.bestFor}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Comparison */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Performance Comparison</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Strategy</th>
                      <th>Avg Return</th>
                      <th>Volatility</th>
                      <th>Sharpe Ratio</th>
                      <th>Cost</th>
                      <th>Net Return</th>
                      <th>Win Rate</th>
                      <th>Ranking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.performanceData
                      .sort((a, b) => b.sharpeRatio - a.sharpeRatio)
                      .map((perf, index) => (
                        <tr key={index}>
                          <td><strong>{perf.strategy}</strong></td>
                          <td className={`badge badge-${perf.avgReturn >= 0 ? 'success' : 'danger'}`}>
                            {formatPercent(perf.avgReturn / 100)}
                          </td>
                          <td>{formatPercent(perf.volatility / 100)}</td>
                          <td>
                            <span className={`badge badge-${perf.sharpeRatio > 1 ? 'success' : perf.sharpeRatio > 0.5 ? 'warning' : 'danger'}`}>
                              {formatNumber(perf.sharpeRatio)}
                            </span>
                          </td>
                          <td>{formatVND(perf.cost)}</td>
                          <td className={`badge badge-${perf.netReturn >= 0 ? 'success' : 'danger'}`}>
                            {formatPercent(perf.netReturn / 100)}
                          </td>
                          <td>{formatPercent(perf.winRate)}</td>
                          <td>
                            {index === 0 && <span className="badge badge-success">🥇 Best</span>}
                            {index === 1 && <span className="badge badge-warning">🥈 2nd</span>}
                            {index === 2 && <span className="badge badge-primary">🥉 3rd</span>}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Radar Comparison */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Multi-dimensional Comparison</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={comparison.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  {strategies.map((strategy, index) => (
                    <Radar
                      key={strategy.name}
                      name={strategy.name}
                      dataKey={strategy.name}
                      stroke={getStrategyColor(index)}
                      fill={getStrategyColor(index)}
                      fillOpacity={selectedStrategy === strategy.id ? 0.6 : 0.2}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '16px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                <p>Click vào strategy card để highlight. Điểm cao hơn = tốt hơn</p>
              </div>
            </div>
          </div>

          {/* Sharpe Ratio Comparison */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Risk-Adjusted Returns (Sharpe Ratio)</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparison.performanceData.sort((a, b) => b.sharpeRatio - a.sharpeRatio)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" angle={-15} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="sharpeRatio" name="Sharpe Ratio">
                    {comparison.performanceData.map((entry, index) => (
                      <Bar
                        key={`cell-${index}`}
                        fill={entry.sharpeRatio > 1 ? '#10b981' : entry.sharpeRatio > 0.5 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Strategy Recommendations</h3>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gap: '16px' }}>
                {getRecommendation().map((rec, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <strong style={{ color: '#1e293b', fontSize: '15px' }}>
                          {rec.scenario}
                        </strong>
                      </div>
                      <span className="badge badge-primary">{rec.strategy}</span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                      💡 {rec.reason}
                    </p>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#dbeafe', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ marginBottom: '12px', color: '#1e40af' }}>📋 General Guidelines</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af' }}>
                  <li>Thị trường ít biến động → Delta Hedging</li>
                  <li>Thị trường biến động mạnh → Delta-Gamma Hedging</li>
                  <li>Volatility không ổn định → Delta-Vega Hedging</li>
                  <li>Chi phí cao → Static Hedging hoặc giảm rebalancing frequency</li>
                  <li>Portfolio lớn, chuyên nghiệp → Full Dynamic Hedging</li>
                  <li>Warrants gần ATM → Cần Gamma hedge mạnh hơn</li>
                  <li>Warrants xa OTM/ITM → Delta hedge đơn giản đủ</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HedgingStrategies; 