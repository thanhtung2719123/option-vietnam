import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../context/MarketDataContext';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';

const MainDashboard = () => {
  const { warrants, portfolioGreeks, loading } = useMarketData();
  const [stats, setStats] = useState({
    totalWarrants: 0,
    totalValue: 0,
    avgVolatility: 0,
    topMovers: []
  });

  useEffect(() => {
    if (warrants && warrants.length > 0) {
      const totalWarrants = warrants.length;
      const totalValue = warrants.reduce((sum, w) => sum + (w.current_price || 0) * (w.volume || 0), 0);
      const avgVolatility = warrants.reduce((sum, w) => sum + (w.volatility || 0), 0) / totalWarrants;
      
      const topMovers = warrants
        .sort((a, b) => Math.abs(b.price_change || 0) - Math.abs(a.price_change || 0))
        .slice(0, 5);

      setStats({ totalWarrants, totalValue, avgVolatility, topMovers });
    }
  }, [warrants]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p className="loading-text">Đang tải dữ liệu thị trường...</p>
      </div>
    );
  }

  return (
    <div className="main-dashboard">
      {/* Page Header */}
      <div className="page-header">
        <h1>🇻🇳 Vietnamese Options Dashboard</h1>
        <p>Hệ thống quản lý rủi ro quyền chọn Việt Nam</p>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Tổng số Warrants</div>
            <div className="stat-card-icon primary">📊</div>
          </div>
          <div className="stat-card-value">{stats.totalWarrants}</div>
          <div className="stat-card-change positive">
            ↑ {warrants.length} Active
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Giá trị tổng</div>
            <div className="stat-card-icon success">💰</div>
          </div>
          <div className="stat-card-value">{formatVND(stats.totalValue)}</div>
          <div className="stat-card-change positive">
            ↑ +5.2% hôm nay
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Volatility TB</div>
            <div className="stat-card-icon warning">📈</div>
          </div>
          <div className="stat-card-value">{formatPercent(stats.avgVolatility)}</div>
          <div className="stat-card-change negative">
            ↓ -2.1% so với hôm qua
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <div className="stat-card-title">Portfolio Delta</div>
            <div className="stat-card-icon primary">Δ</div>
          </div>
          <div className="stat-card-value">
            {portfolioGreeks?.delta ? formatNumber(portfolioGreeks.delta, 4) : '0.0000'}
          </div>
          <div className="stat-card-change">
            Net exposure: {portfolioGreeks?.delta > 0 ? 'Long' : 'Short'}
          </div>
        </div>
      </div>

      {/* Warrants Table */}
      <div className="data-table">
        <div className="table-header">
          <h2 className="table-title">Danh sách Warrants</h2>
          <div className="table-actions">
            <button className="btn btn-outline">
              🔄 Refresh
            </button>
            <button className="btn btn-primary">
              ➕ Add Warrant
            </button>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Underlying</th>
              <th>Type</th>
              <th>Strike</th>
              <th>Maturity</th>
              <th>Exercise Ratio</th>
              <th>Issuer</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {warrants && warrants.length > 0 ? (
              warrants.map((warrant, idx) => (
                <tr key={idx}>
                  <td>
                    <strong style={{ color: 'var(--primary)' }}>{warrant.symbol}</strong>
                  </td>
                  <td>{warrant.underlying_symbol}</td>
                  <td>
                    <span className={`badge badge-${warrant.warrant_type === 'Call' ? 'success' : 'danger'}`}>
                      {warrant.warrant_type}
                    </span>
                  </td>
                  <td>{formatVND(warrant.strike_price)}</td>
                  <td>
                    {warrant.maturity_date 
                      ? new Date(warrant.maturity_date).toLocaleDateString('vi-VN')
                      : 'N/A'}
                  </td>
                  <td>{warrant.exercise_ratio || 'N/A'}</td>
                  <td>{warrant.issuer}</td>
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: 'var(--gray)' }}>
                  Không có dữ liệu warrant
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
          <h3 style={{ marginBottom: '8px' }}>Warrant Pricing</h3>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>Định giá warrant với Black-Scholes & Heston</p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📈</div>
          <h3 style={{ marginBottom: '8px' }}>Greeks Analysis</h3>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>Phân tích Delta, Gamma, Vega, Theta, Rho</p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
          <h3 style={{ marginBottom: '8px' }}>Delta Hedging</h3>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>Mô phỏng & tối ưu hóa delta hedging</p>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ marginBottom: '8px' }}>Risk Management</h3>
          <p style={{ fontSize: '13px', opacity: 0.9 }}>VaR, Stress Testing, Monte Carlo</p>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;
