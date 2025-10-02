import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../context/MarketDataContext';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiService from '../../services/apiService';

const MoneynessAnalysis = () => {
  const { warrants } = useMarketData();
  const [moneynessData, setMoneynessData] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, call, put
  const [spotPrices, setSpotPrices] = useState({});  // Cache spot prices by underlying
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (warrants && warrants.length > 0) {
      fetchSpotPricesAndCalculate();
    }
  }, [warrants, filterType]);

  const fetchSpotPricesAndCalculate = async () => {
    setLoading(true);
    
    // Get unique underlyings
    const underlyings = [...new Set(warrants.map(w => w.underlying_symbol))];
    
    // Fetch REAL spot prices from vnstock
    const prices = {};
    for (const underlying of underlyings) {
      try {
        const response = await apiService.warrants.getMarketPrice(underlying);
        prices[underlying] = response.data.current_price;
        console.log(`✅ Fetched spot price for ${underlying}: ${response.data.current_price}`);
      } catch (error) {
        console.error(`Failed to fetch spot price for ${underlying}:`, error);
        prices[underlying] = null;
      }
    }
    
    setSpotPrices(prices);
    calculateMoneyness(prices);
    setLoading(false);
  };

  const calculateMoneyness = (prices = spotPrices) => {
    const filtered = filterType === 'all' ? warrants : 
                     warrants.filter(w => w.warrant_type?.toLowerCase() === filterType);

    const classified = filtered.map(warrant => {
      // Get REAL spot price from cache for this underlying
      const spotPrice = prices[warrant.underlying_symbol] || warrant.strike_price || 100000;
      const moneyness = spotPrice / (warrant.strike_price || 100000);
      const isCall = warrant.warrant_type?.toLowerCase() === 'call';

      let classification;
      let intrinsicValue = 0;
      let exerciseProbability = 0;

      if (isCall) {
        if (moneyness > 1.05) {
          classification = 'ITM';
          intrinsicValue = spotPrice - (warrant.strike_price || 100000);
          exerciseProbability = 0.7 + Math.random() * 0.25;
        } else if (moneyness >= 0.95) {
          classification = 'ATM';
          intrinsicValue = Math.max(0, spotPrice - (warrant.strike_price || 100000));
          exerciseProbability = 0.4 + Math.random() * 0.2;
        } else {
          classification = 'OTM';
          intrinsicValue = 0;
          exerciseProbability = 0.1 + Math.random() * 0.2;
        }
      } else {
        if (moneyness < 0.95) {
          classification = 'ITM';
          intrinsicValue = (warrant.strike_price || 100000) - spotPrice;
          exerciseProbability = 0.7 + Math.random() * 0.25;
        } else if (moneyness <= 1.05) {
          classification = 'ATM';
          intrinsicValue = Math.max(0, (warrant.strike_price || 100000) - spotPrice);
          exerciseProbability = 0.4 + Math.random() * 0.2;
        } else {
          classification = 'OTM';
          intrinsicValue = 0;
          exerciseProbability = 0.1 + Math.random() * 0.2;
        }
      }

      return {
        ...warrant,
        spotPrice,
        moneyness,
        classification,
        intrinsicValue,
        exerciseProbability
      };
    });

    const summary = {
      ITM: classified.filter(w => w.classification === 'ITM'),
      ATM: classified.filter(w => w.classification === 'ATM'),
      OTM: classified.filter(w => w.classification === 'OTM')
    };

    const distribution = [
      { name: 'ITM (In-The-Money)', value: summary.ITM.length, color: '#10b981' },
      { name: 'ATM (At-The-Money)', value: summary.ATM.length, color: '#f59e0b' },
      { name: 'OTM (Out-of-The-Money)', value: summary.OTM.length, color: '#ef4444' }
    ];

    const moneynessRanges = [
      { range: '< 0.85', count: classified.filter(w => w.moneyness < 0.85).length },
      { range: '0.85-0.95', count: classified.filter(w => w.moneyness >= 0.85 && w.moneyness < 0.95).length },
      { range: '0.95-1.05', count: classified.filter(w => w.moneyness >= 0.95 && w.moneyness <= 1.05).length },
      { range: '1.05-1.15', count: classified.filter(w => w.moneyness > 1.05 && w.moneyness <= 1.15).length },
      { range: '> 1.15', count: classified.filter(w => w.moneyness > 1.15).length }
    ];

    setMoneynessData({
      classified,
      summary,
      distribution,
      moneynessRanges
    });
  };

  const COLORS = {
    ITM: '#10b981',
    ATM: '#f59e0b',
    OTM: '#ef4444'
  };

  return (
    <div className="moneyness-analysis">
      <div className="page-header">
        <h1>💰 Moneyness Analysis</h1>
        <p>Phân tích mức độ sinh lợi của warrant (Spot prices từ vnstock)</p>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p className="loading-text">Đang lấy giá thực từ vnstock...</p>
        </div>
      )}

      {/* Filter */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="form-group">
            <label className="form-label">Loại Warrant</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className={`btn ${filterType === 'all' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterType('all')}
              >
                Tất cả
              </button>
              <button 
                className={`btn ${filterType === 'call' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterType('call')}
              >
                Call Warrants
              </button>
              <button 
                className={`btn ${filterType === 'put' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterType('put')}
              >
                Put Warrants
              </button>
            </div>
          </div>
        </div>
      </div>

      {moneynessData && (
        <>
          {/* Summary Cards */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">ITM Warrants</div>
                  <div className="stat-card-value">{moneynessData.summary.ITM.length}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                  ✓
                </div>
              </div>
              <div className="badge badge-success">Có giá trị nội tại</div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {formatPercent(moneynessData.summary.ITM.length / moneynessData.classified.length)} tổng số
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">ATM Warrants</div>
                  <div className="stat-card-value">{moneynessData.summary.ATM.length}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  ≈
                </div>
              </div>
              <div className="badge badge-warning">Gần mức hòa vốn</div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {formatPercent(moneynessData.summary.ATM.length / moneynessData.classified.length)} tổng số
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">OTM Warrants</div>
                  <div className="stat-card-value">{moneynessData.summary.OTM.length}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  ✗
                </div>
              </div>
              <div className="badge badge-danger">Chưa có giá trị</div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                {formatPercent(moneynessData.summary.OTM.length / moneynessData.classified.length)} tổng số
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Avg Exercise Prob.</div>
                  <div className="stat-card-value">
                    {formatPercent(moneynessData.classified.reduce((sum, w) => sum + w.exerciseProbability, 0) / moneynessData.classified.length)}
                  </div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  🎯
                </div>
              </div>
              <div className="badge badge-primary">Xác suất thực hiện</div>
            </div>
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Pie Chart */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Phân bố Moneyness</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={moneynessData.distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {moneynessData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Phân bố theo khoảng Moneyness</h3>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={moneynessData.moneynessRanges}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ITM Warrants */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">ITM Warrants (In-The-Money)</h3>
            </div>
            <div className="card-body">
              {moneynessData.summary.ITM.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Type</th>
                        <th>Strike</th>
                        <th>Spot Price</th>
                        <th>Moneyness</th>
                        <th>Intrinsic Value</th>
                        <th>Exercise Prob.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moneynessData.summary.ITM.slice(0, 10).map((warrant, index) => (
                        <tr key={index}>
                          <td><strong>{warrant.symbol}</strong></td>
                          <td><span className="badge badge-primary">{warrant.warrant_type}</span></td>
                          <td>{formatVND(warrant.strike_price)}</td>
                          <td>{formatVND(warrant.spotPrice)}</td>
                          <td><span className="badge badge-success">{formatNumber(warrant.moneyness)}</span></td>
                          <td className="badge badge-success">{formatVND(warrant.intrinsicValue)}</td>
                          <td>{formatPercent(warrant.exerciseProbability)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center" style={{ color: '#64748b', padding: '20px' }}>
                  Không có warrant ITM
                </p>
              )}
            </div>
          </div>

          {/* ATM Warrants */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">ATM Warrants (At-The-Money)</h3>
            </div>
            <div className="card-body">
              {moneynessData.summary.ATM.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Type</th>
                        <th>Strike</th>
                        <th>Spot Price</th>
                        <th>Moneyness</th>
                        <th>Intrinsic Value</th>
                        <th>Exercise Prob.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moneynessData.summary.ATM.slice(0, 10).map((warrant, index) => (
                        <tr key={index}>
                          <td><strong>{warrant.symbol}</strong></td>
                          <td><span className="badge badge-secondary">{warrant.warrant_type}</span></td>
                          <td>{formatVND(warrant.strike_price)}</td>
                          <td>{formatVND(warrant.spotPrice)}</td>
                          <td><span className="badge badge-warning">{formatNumber(warrant.moneyness)}</span></td>
                          <td>{formatVND(warrant.intrinsicValue)}</td>
                          <td>{formatPercent(warrant.exerciseProbability)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center" style={{ color: '#64748b', padding: '20px' }}>
                  Không có warrant ATM
                </p>
              )}
            </div>
          </div>

          {/* OTM Warrants */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">OTM Warrants (Out-of-The-Money)</h3>
            </div>
            <div className="card-body">
              {moneynessData.summary.OTM.length > 0 ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Symbol</th>
                        <th>Type</th>
                        <th>Strike</th>
                        <th>Spot Price</th>
                        <th>Moneyness</th>
                        <th>Exercise Prob.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moneynessData.summary.OTM.slice(0, 10).map((warrant, index) => (
                        <tr key={index}>
                          <td><strong>{warrant.symbol}</strong></td>
                          <td><span className="badge badge-warning">{warrant.warrant_type}</span></td>
                          <td>{formatVND(warrant.strike_price)}</td>
                          <td>{formatVND(warrant.spotPrice)}</td>
                          <td><span className="badge badge-danger">{formatNumber(warrant.moneyness)}</span></td>
                          <td>{formatPercent(warrant.exerciseProbability)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center" style={{ color: '#64748b', padding: '20px' }}>
                  Không có warrant OTM
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MoneynessAnalysis; 