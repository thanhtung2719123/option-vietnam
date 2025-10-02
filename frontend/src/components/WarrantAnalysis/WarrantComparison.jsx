import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../context/MarketDataContext';
import { formatVND, formatPercent, formatGreek, formatNumber, formatDate } from '../../utils/formatters';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/apiService';

const WarrantComparison = () => {
  const { warrants } = useMarketData();
  const [selectedWarrants, setSelectedWarrants] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterUnderlying, setFilterUnderlying] = useState('all');

  useEffect(() => {
    if (selectedWarrants.length > 0) {
      generateComparisonData();
    }
  }, [selectedWarrants]);

  // Get unique underlying symbols
  const underlyingSymbols = [...new Set(warrants.map(w => w.underlying_symbol))].sort();
  
  // Filter warrants by underlying
  const filteredWarrants = filterUnderlying === 'all' 
    ? warrants 
    : warrants.filter(w => w.underlying_symbol === filterUnderlying);

  const generateComparisonData = async () => {
    setLoading(true);
    
    // Fetch REAL data for each selected warrant
    const dataPromises = selectedWarrants.map(async (symbol) => {
      const warrant = warrants.find(w => w.symbol === symbol);
      if (!warrant) return null;

      try {
        // Fetch real Greeks from backend
        const greeksResponse = await apiService.warrants.getGreeks(warrant.symbol);
        const greeksData = greeksResponse.data;
        
        return {
          symbol: warrant.symbol,
          underlying: warrant.underlying_symbol,
          type: warrant.warrant_type,
          strike: warrant.strike_price,
          maturity: warrant.maturity_date,
          issuer: warrant.issuer,
          exerciseRatio: warrant.exercise_ratio,
          // REAL data from backend
          theoreticalPrice: greeksData.theoretical_price || 0,
          marketPrice: greeksData.market_option_price || warrant.close_price || 0,
          spotPrice: greeksData.spot_price || 0,
          delta: greeksData.greeks?.delta || 0,
          gamma: greeksData.greeks?.gamma || 0,
          vega: greeksData.greeks?.vega || 0,
          theta: greeksData.greeks?.theta || 0,
          rho: greeksData.greeks?.rho || 0,
          impliedVol: greeksData.volatility || 0,
          moneyness: greeksData.spot_price / warrant.strike_price
        };
      } catch (error) {
        console.error(`Failed to fetch data for ${symbol}:`, error);
        return null;
      }
    });
    
    const data = (await Promise.all(dataPromises)).filter(Boolean);

    // Radar chart data
    const radarData = [
      {
        metric: 'Delta',
        ...Object.fromEntries(data.map(d => [d.symbol, Math.abs(d.delta) * 100]))
      },
      {
        metric: 'Gamma',
        ...Object.fromEntries(data.map(d => [d.symbol, Math.abs(d.gamma) * 1000]))
      },
      {
        metric: 'Vega',
        ...Object.fromEntries(data.map(d => [d.symbol, Math.abs(d.vega) * 100]))
      },
      {
        metric: 'Implied Vol',
        ...Object.fromEntries(data.map(d => [d.symbol, d.impliedVol * 100]))
      },
      {
        metric: 'Moneyness',
        ...Object.fromEntries(data.map(d => [d.symbol, d.moneyness * 100]))
      }
    ];

    setComparisonData({ data, radarData });
    setLoading(false);
  };

  const handleWarrantSelect = (symbol) => {
    if (selectedWarrants.includes(symbol)) {
      setSelectedWarrants(selectedWarrants.filter(s => s !== symbol));
    } else if (selectedWarrants.length < 4) {
      setSelectedWarrants([...selectedWarrants, symbol]);
    }
  };

  const getWarrantColor = (index) => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];
    return colors[index % colors.length];
  };

  return (
    <div className="warrant-comparison">
      <div className="page-header">
        <h1>🔄 Warrant Comparison</h1>
        <p>So sánh đa chiều giữa các warrant (Dữ liệu thực từ vnstock & Black-Scholes)</p>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang tính toán Greeks và lấy dữ liệu thực...</p>
        </div>
      )}

      {/* Warrant Selection */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Chọn Warrants để so sánh (tối đa 4)</h3>
        </div>
        <div className="card-body">
          {/* Filter by Underlying */}
          <div className="form-group mb-3">
            <label className="form-label">Lọc theo cổ phiếu cơ sở:</label>
            <select 
              className="form-control"
              value={filterUnderlying}
              onChange={(e) => setFilterUnderlying(e.target.value)}
              style={{ maxWidth: '300px' }}
            >
              <option value="all">Tất cả ({warrants.length} warrants)</option>
              {underlyingSymbols.map(symbol => {
                const count = warrants.filter(w => w.underlying_symbol === symbol).length;
                return (
                  <option key={symbol} value={symbol}>
                    {symbol} ({count} warrants)
                  </option>
                );
              })}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {filteredWarrants.slice(0, 50).map(warrant => (
              <div
                key={warrant.symbol}
                onClick={() => handleWarrantSelect(warrant.symbol)}
                style={{
                  padding: '12px',
                  border: selectedWarrants.includes(warrant.symbol) ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  backgroundColor: selectedWarrants.includes(warrant.symbol) ? 'rgba(59, 130, 246, 0.1)' : 'white',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{warrant.symbol}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {warrant.underlying_symbol} - {warrant.warrant_type}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>
            Đã chọn: {selectedWarrants.length}/4 warrants
          </div>
        </div>
      </div>

      {comparisonData && comparisonData.data.length > 0 && (
        <>
          {/* Radar Chart Comparison */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">So sánh Greeks và Metrics</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={comparisonData.radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis />
                  {comparisonData.data.map((warrant, index) => (
                    <Radar
                      key={warrant.symbol}
                      name={warrant.symbol}
                      dataKey={warrant.symbol}
                      stroke={getWarrantColor(index)}
                      fill={getWarrantColor(index)}
                      fillOpacity={0.3}
                    />
                  ))}
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side-by-Side Comparison Table */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Thông tin cơ bản</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Thông số</th>
                      {comparisonData.data.map((warrant, index) => (
                        <th key={index} style={{ color: getWarrantColor(index) }}>
                          {warrant.symbol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Cổ phiếu cơ sở</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{w.underlying}</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Loại</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>
                          <span className={`badge badge-${w.type === 'Call' ? 'success' : 'danger'}`}>
                            {w.type}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Strike Price</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatVND(w.strike)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Spot Price</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatVND(w.spotPrice)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Moneyness</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>
                          <span className={`badge badge-${
                            w.moneyness > 1.05 ? 'success' : 
                            w.moneyness < 0.95 ? 'danger' : 
                            'warning'
                          }`}>
                            {formatNumber(w.moneyness)}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Maturity</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatDate(w.maturity)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Exercise Ratio</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatNumber(w.exerciseRatio)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Issuer</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{w.issuer}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pricing Comparison */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Định giá</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Thông số</th>
                      {comparisonData.data.map((warrant, index) => (
                        <th key={index} style={{ color: getWarrantColor(index) }}>
                          {warrant.symbol}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Theoretical Price</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatVND(w.theoreticalPrice)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Market Price</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatVND(w.marketPrice)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td><strong>Price Difference</strong></td>
                      {comparisonData.data.map((w, i) => {
                        const diff = w.theoreticalPrice > 0 
                          ? ((w.marketPrice - w.theoreticalPrice) / w.theoreticalPrice) * 100 
                          : 0;
                        return (
                          <td key={i}>
                            <span className={`badge badge-${diff > 0 ? 'danger' : 'success'}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td><strong>Implied Volatility</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatPercent(w.impliedVol)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Greeks Comparison */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Greeks</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Greek</th>
                      {comparisonData.data.map((warrant, index) => (
                        <th key={index} style={{ color: getWarrantColor(index) }}>
                          {warrant.symbol}
                        </th>
                      ))}
                      <th>Cao nhất</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Delta (Δ)</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatGreek('delta', w.delta)}</td>
                      ))}
                      <td>
                        <span className="badge badge-primary">
                          {comparisonData.data.reduce((max, w) => Math.abs(w.delta) > Math.abs(max.delta) ? w : max).symbol}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Gamma (Γ)</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatGreek('gamma', w.gamma)}</td>
                      ))}
                      <td>
                        <span className="badge badge-primary">
                          {comparisonData.data.reduce((max, w) => Math.abs(w.gamma) > Math.abs(max.gamma) ? w : max).symbol}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Vega (ν)</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatGreek('vega', w.vega)}</td>
                      ))}
                      <td>
                        <span className="badge badge-primary">
                          {comparisonData.data.reduce((max, w) => Math.abs(w.vega) > Math.abs(max.vega) ? w : max).symbol}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Theta (Θ)</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatGreek('theta', w.theta)}</td>
                      ))}
                      <td>
                        <span className="badge badge-warning">
                          {comparisonData.data.reduce((max, w) => Math.abs(w.theta) > Math.abs(max.theta) ? w : max).symbol}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Rho (ρ)</strong></td>
                      {comparisonData.data.map((w, i) => (
                        <td key={i}>{formatGreek('rho', w.rho)}</td>
                      ))}
                      <td>
                        <span className="badge badge-primary">
                          {comparisonData.data.reduce((max, w) => Math.abs(w.rho) > Math.abs(max.rho) ? w : max).symbol}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {selectedWarrants.length === 0 && (
        <div className="card">
          <div className="card-body text-center">
            <p style={{ color: '#64748b', fontSize: '14px', padding: '40px' }}>
              🔍 Vui lòng chọn ít nhất 2 warrants để so sánh
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarrantComparison; 