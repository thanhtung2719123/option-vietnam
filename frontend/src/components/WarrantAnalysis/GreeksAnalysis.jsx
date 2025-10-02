import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../context/MarketDataContext';
import { formatGreek, formatVND, formatPercent } from '../../utils/formatters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/apiService';

const GreeksAnalysis = () => {
  const { warrants } = useMarketData();
  const [selectedWarrant, setSelectedWarrant] = useState('');
  const [greeksData, setGreeksData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [spotPrice, setSpotPrice] = useState(100000);
  const [priceRange, setPriceRange] = useState([]);

  // Auto-fetch spot price when warrant is selected
  useEffect(() => {
    const fetchSpotPrice = async () => {
      if (!selectedWarrant) return;
      
      // Find the selected warrant to get underlying symbol
      const warrant = warrants.find(w => w.symbol === selectedWarrant);
      if (!warrant) return;
      
      try {
        // Fetch current market price from vnstock
        const response = await apiService.warrants.getMarketPrice(warrant.underlying_symbol);
        const currentPrice = response.data.current_price;
        
        if (currentPrice) {
          setSpotPrice(Math.round(currentPrice)); // Round to nearest VND
          console.log(`Auto-fetched spot price for ${warrant.underlying_symbol}: ${currentPrice}`);
        }
      } catch (err) {
        console.error('Failed to fetch spot price:', err);
        // Keep the default spot price if fetch fails
      }
    };
    
    fetchSpotPrice();
  }, [selectedWarrant, warrants]);

  useEffect(() => {
    if (selectedWarrant && spotPrice) {
      fetchGreeksData();
    }
  }, [selectedWarrant, spotPrice]);

  useEffect(() => {
    if (selectedWarrant && spotPrice) {
      generatePriceRange();
    }
  }, [selectedWarrant, spotPrice]);

  const fetchGreeksData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass spot price as query parameter
      const response = await apiService.warrants.getGreeks(selectedWarrant, spotPrice);
      setGreeksData(response.data);
    } catch (err) {
      setError(err.message || 'Request failed with status code 500');
      console.error('Failed to fetch Greeks:', err);
    } finally {
      setLoading(false);
    }
  };

  const generatePriceRange = () => {
    // Generate price range for sensitivity analysis (-30% to +30%)
    const range = [];
    for (let i = -30; i <= 30; i += 2) {
      const price = spotPrice * (1 + i / 100);
      range.push({
        price,
        priceChange: i,
        // Simulate Greeks evolution (in real app, calculate from backend)
        delta: 0.5 + (i / 100) * 0.3,
        gamma: 0.02 * Math.exp(-(i * i) / 200),
        vega: 0.15 * Math.exp(-(i * i) / 300),
        theta: -0.05 - Math.abs(i / 100) * 0.02,
      });
    }
    setPriceRange(range);
  };

  const getRiskLevel = (greek, type) => {
    if (!greek) return 'low';
    
    const thresholds = {
      delta: { high: 0.7, medium: 0.4 },
      gamma: { high: 0.03, medium: 0.015 },
      vega: { high: 0.2, medium: 0.1 },
      theta: { high: -0.08, medium: -0.04 }
    };
    
    const threshold = thresholds[type];
    if (!threshold) return 'low';
    
    const absValue = Math.abs(greek);
    if (absValue >= threshold.high) return 'high';
    if (absValue >= threshold.medium) return 'medium';
    return 'low';
  };

  const getGreekColor = (type) => {
    const colors = {
      delta: '#3b82f6',
      gamma: '#8b5cf6',
      vega: '#10b981',
      theta: '#ef4444',
      rho: '#f59e0b'
    };
    return colors[type] || '#64748b';
  };

  return (
    <div className="greeks-analysis">
      <div className="page-header">
        <h1>📈 Greeks Analysis</h1>
        <p>Phân tích độ nhạy và rủi ro của warrant</p>
      </div>

      {/* Warrant Selection */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Chọn Warrant</label>
            <select 
              className="form-control"
              value={selectedWarrant}
              onChange={(e) => setSelectedWarrant(e.target.value)}
            >
              <option value="">-- Chọn warrant --</option>
              {warrants.map(w => (
                <option key={w.symbol} value={w.symbol}>
                  {w.symbol} - {w.underlying_symbol} ({w.warrant_type})
                </option>
              ))}
            </select>
          </div>

          {selectedWarrant && (
            <div className="form-group">
              <label className="form-label">
                Giá cổ phiếu cơ sở (VND)
                <span style={{ fontSize: '12px', color: '#10b981', marginLeft: '8px' }}>
                  🔄 Tự động từ vnstock
                </span>
              </label>
              <input
                type="number"
                className="form-control"
                value={spotPrice}
                onChange={(e) => setSpotPrice(Number(e.target.value))}
                step="1000"
                placeholder="Nhập giá hoặc để tự động lấy từ vnstock"
              />
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                💡 Giá được lấy tự động từ vnstock (giá đóng cửa gần nhất). Bạn có thể thay đổi để test các kịch bản khác.
              </p>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang tính toán Greeks...</p>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <strong>⚠️ Lỗi:</strong> {error}
        </div>
      )}

      {greeksData && !loading && (
        <>
          {/* Black-Scholes Parameters Section */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">📋 Thông Số Black-Scholes</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Các yếu tố đầu vào trong công thức định giá
              </p>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Thông Số</th>
                      <th>Ký Hiệu</th>
                      <th>Giá Trị</th>
                      <th>Giải Thích</th>
                    </tr>
                  </thead>
                  <tbody>
                    {greeksData.parameters && (
                      <>
                        <tr>
                          <td><strong>Giá quyền chọn thị trường</strong></td>
                          <td><code>C hoặc P</code></td>
                          <td>
                            {greeksData.parameters.market_option_price 
                              ? formatVND(greeksData.parameters.market_option_price)
                              : <span style={{ color: '#94a3b8' }}>Chưa có dữ liệu</span>
                            }
                          </td>
                          <td>Giá warrant đang giao dịch trên sàn</td>
                        </tr>
                        <tr>
                          <td><strong>Giá lý thuyết (Black-Scholes)</strong></td>
                          <td><code>V</code></td>
                          <td className="badge badge-success">{formatVND(greeksData.parameters.theoretical_price)}</td>
                          <td>Giá tính từ mô hình Black-Scholes</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td><strong>Giá cổ phiếu hiện tại</strong></td>
                          <td><code>S</code></td>
                          <td className="badge badge-primary">{formatVND(greeksData.parameters.spot_price)}</td>
                          <td>Giá hiện tại của cổ phiếu {greeksData.parameters.underlying_symbol}</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td><strong>Giá thực thi</strong></td>
                          <td><code>K</code></td>
                          <td className="badge badge-primary">{formatVND(greeksData.parameters.strike_price)}</td>
                          <td>Mức giá quyền chọn cho phép mua/bán cổ phiếu</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td><strong>Thời gian đáo hạn</strong></td>
                          <td><code>T</code></td>
                          <td>
                            <span className="badge badge-warning">
                              {greeksData.parameters.time_to_maturity.toFixed(4)} năm
                            </span>
                            <br />
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              ({greeksData.parameters.time_to_maturity_days} ngày)
                            </span>
                          </td>
                          <td>Thời gian còn lại đến ngày đáo hạn (tính theo năm)</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td><strong>Lãi suất phi rủi ro</strong></td>
                          <td><code>r</code></td>
                          <td className="badge badge-info">
                            {formatPercent(greeksData.parameters.risk_free_rate)}
                          </td>
                          <td>Lãi suất tín phiếu kho bạc VN 10 năm</td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td><strong>Biến động (Volatility)</strong></td>
                          <td><code>σ</code></td>
                          <td>
                            <span className="badge badge-warning">
                              {formatPercent(greeksData.parameters.volatility)}
                            </span>
                            {greeksData.parameters.volatility_source && greeksData.parameters.volatility_source !== 'default' && (
                              <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>
                                ✓ Từ vnstock ({greeksData.parameters.volatility_period})
                              </div>
                            )}
                          </td>
                          <td>
                            Độ biến động lịch sử của cổ phiếu
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                              Công thức: σ = Daily_Std × √252
                            </div>
                          </td>
                        </tr>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <td><strong>Tỷ lệ cổ tức</strong></td>
                          <td><code>q</code></td>
                          <td className="badge badge-secondary">
                            {formatPercent(greeksData.parameters.dividend_yield)}
                          </td>
                          <td>Tỷ lệ cổ tức dự kiến trong thời gian T</td>
                        </tr>
                        <tr>
                          <td><strong>Tỷ lệ chuyển đổi</strong></td>
                          <td><code>Ratio</code></td>
                          <td><span className="badge badge-info">{greeksData.parameters.conversion_ratio.toFixed(2)} : 1</span></td>
                          <td>Số warrant cần để chuyển đổi 1 cổ phiếu</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Black-Scholes Formula */}
              <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
                  📐 Công thức Black-Scholes cho Warrant:
                </h4>
                <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#475569', lineHeight: '1.8' }}>
                  <div><strong>Call Warrant:</strong> C = S × e<sup>-qT</sup> × N(d₁) - K × e<sup>-rT</sup> × N(d₂)</div>
                  <div style={{ marginTop: '8px' }}><strong>Put Warrant:</strong> P = K × e<sup>-rT</sup> × N(-d₂) - S × e<sup>-qT</sup> × N(-d₁)</div>
                  <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b' }}>
                    Trong đó: d₁ = [ln(S/K) + (r - q + σ²/2)T] / (σ√T)<br />
                    d₂ = d₁ - σ√T
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Greeks Cards */}
          <div className="dashboard-grid mb-3">
            {/* Delta Card */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Delta (Δ)</div>
                  <div className="stat-card-value">
                    {greeksData.greeks?.delta != null 
                      ? formatGreek('delta', greeksData.greeks.delta)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  Δ
                </div>
              </div>
              <div className={`badge badge-${getRiskLevel(greeksData.greeks?.delta || 0, 'delta')}`}>
                {getRiskLevel(greeksData.greeks?.delta || 0, 'delta') === 'high' ? 'Cao' : getRiskLevel(greeksData.greeks?.delta || 0, 'delta') === 'medium' ? 'Trung bình' : 'Thấp'}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Độ nhạy với giá cơ sở
              </p>
            </div>

            {/* Gamma Card */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Gamma (Γ)</div>
                  <div className="stat-card-value">
                    {greeksData.greeks?.gamma != null 
                      ? formatGreek('gamma', greeksData.greeks.gamma)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  Γ
                </div>
              </div>
              <div className={`badge badge-${getRiskLevel(greeksData.greeks?.gamma || 0, 'gamma')}`}>
                {getRiskLevel(greeksData.greeks?.gamma || 0, 'gamma') === 'high' ? 'Cao' : getRiskLevel(greeksData.greeks?.gamma || 0, 'gamma') === 'medium' ? 'Trung bình' : 'Thấp'}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Tốc độ thay đổi Delta
              </p>
            </div>

            {/* Vega Card */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Vega (ν)</div>
                  <div className="stat-card-value">
                    {greeksData.greeks?.vega != null 
                      ? formatGreek('vega', greeksData.greeks.vega)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  ν
                </div>
              </div>
              <div className={`badge badge-${getRiskLevel(greeksData.greeks?.vega || 0, 'vega')}`}>
                {getRiskLevel(greeksData.greeks?.vega || 0, 'vega') === 'high' ? 'Cao' : getRiskLevel(greeksData.greeks?.vega || 0, 'vega') === 'medium' ? 'Trung bình' : 'Thấp'}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Độ nhạy với volatility
              </p>
            </div>

            {/* Theta Card */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Theta (Θ)</div>
                  <div className="stat-card-value">
                    {greeksData.greeks?.theta != null 
                      ? formatGreek('theta', greeksData.greeks.theta)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  Θ
                </div>
              </div>
              <div className={`badge badge-${getRiskLevel(greeksData.greeks?.theta || 0, 'theta')}`}>
                {getRiskLevel(greeksData.greeks?.theta || 0, 'theta') === 'high' ? 'Cao' : getRiskLevel(greeksData.greeks?.theta || 0, 'theta') === 'medium' ? 'Trung bình' : 'Thấp'}
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Suy giảm theo thời gian
              </p>
            </div>

            {/* Rho Card */}
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Rho (ρ)</div>
                  <div className="stat-card-value">
                    {greeksData.greeks?.rho != null 
                      ? formatGreek('rho', greeksData.greeks.rho)
                      : 'N/A'
                    }
                  </div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  ρ
                </div>
              </div>
              <div className="badge badge-primary">Thông tin</div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Độ nhạy với lãi suất
              </p>
            </div>
          </div>

          {/* Greeks Evolution Chart */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Biến động Greeks theo giá cơ sở</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={priceRange}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="priceChange" 
                    label={{ value: 'Thay đổi giá (%)', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis label={{ value: 'Giá trị Greeks', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="delta" stroke="#3b82f6" name="Delta" strokeWidth={2} />
                  <Line type="monotone" dataKey="gamma" stroke="#8b5cf6" name="Gamma" strokeWidth={2} />
                  <Line type="monotone" dataKey="vega" stroke="#10b981" name="Vega" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sensitivity Analysis */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Phân tích độ nhạy</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={[
                  { name: 'Delta', value: Math.abs(greeksData.greeks?.delta || 0.5), color: '#3b82f6' },
                  { name: 'Gamma', value: Math.abs(greeksData.greeks?.gamma || 0.02) * 10, color: '#8b5cf6' },
                  { name: 'Vega', value: Math.abs(greeksData.greeks?.vega || 0.15), color: '#10b981' },
                  { name: 'Theta', value: Math.abs(greeksData.greeks?.theta || -0.05) * 5, color: '#ef4444' },
                  { name: 'Rho', value: Math.abs(greeksData.greeks?.rho || 0.08), color: '#f59e0b' },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6">
                    {[
                      { name: 'Delta', value: Math.abs(greeksData.greeks?.delta || 0.5), color: '#3b82f6' },
                      { name: 'Gamma', value: Math.abs(greeksData.greeks?.gamma || 0.02) * 10, color: '#8b5cf6' },
                      { name: 'Vega', value: Math.abs(greeksData.greeks?.vega || 0.15), color: '#10b981' },
                      { name: 'Theta', value: Math.abs(greeksData.greeks?.theta || -0.05) * 5, color: '#ef4444' },
                      { name: 'Rho', value: Math.abs(greeksData.greeks?.rho || 0.08), color: '#f59e0b' },
                    ].map((entry, index) => (
                      <Bar key={`cell-${index}`} dataKey="value" fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Risk Scenarios */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Kịch bản rủi ro</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Kịch bản</th>
                      <th>Thay đổi giá</th>
                      <th>Delta P&L</th>
                      <th>Gamma P&L</th>
                      <th>Tổng P&L</th>
                      <th>Mức độ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Tăng mạnh (+10%)</td>
                      <td className="badge badge-success">+10%</td>
                      <td>{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * 0.1)}</td>
                      <td>{formatVND(0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.1, 2))}</td>
                      <td className="badge badge-success">{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * 0.1 + 0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.1, 2))}</td>
                      <td><span className="badge badge-success">Lợi nhuận</span></td>
                    </tr>
                    <tr>
                      <td>Tăng nhẹ (+5%)</td>
                      <td className="badge badge-success">+5%</td>
                      <td>{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * 0.05)}</td>
                      <td>{formatVND(0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.05, 2))}</td>
                      <td className="badge badge-success">{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * 0.05 + 0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.05, 2))}</td>
                      <td><span className="badge badge-success">Lợi nhuận</span></td>
                    </tr>
                    <tr>
                      <td>Không đổi (0%)</td>
                      <td className="badge badge-warning">0%</td>
                      <td>{formatVND(0)}</td>
                      <td>{formatVND(0)}</td>
                      <td className="badge badge-warning">{formatVND((greeksData.greeks?.theta || -0.05) * 1)}</td>
                      <td><span className="badge badge-warning">Time decay</span></td>
                    </tr>
                    <tr>
                      <td>Giảm nhẹ (-5%)</td>
                      <td className="badge badge-danger">-5%</td>
                      <td>{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * -0.05)}</td>
                      <td>{formatVND(0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.05, 2))}</td>
                      <td className="badge badge-danger">{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * -0.05 + 0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.05, 2))}</td>
                      <td><span className="badge badge-danger">Thua lỗ</span></td>
                    </tr>
                    <tr>
                      <td>Giảm mạnh (-10%)</td>
                      <td className="badge badge-danger">-10%</td>
                      <td>{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * -0.1)}</td>
                      <td>{formatVND(0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.1, 2))}</td>
                      <td className="badge badge-danger">{formatVND((greeksData.greeks?.delta || 0.5) * spotPrice * -0.1 + 0.5 * (greeksData.greeks?.gamma || 0.02) * Math.pow(spotPrice * 0.1, 2))}</td>
                      <td><span className="badge badge-danger">Thua lỗ</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedWarrant && !loading && (
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              🔍 Vui lòng chọn warrant để xem phân tích Greeks
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GreeksAnalysis; 