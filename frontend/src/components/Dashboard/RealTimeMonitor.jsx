import React, { useState, useEffect } from 'react';
// import { useWebSocket } from '../../context/WebSocketContext';
import { useMarketData } from '../../context/MarketDataContext';
import { formatVND, formatGreek, formatDateTime, formatPercent } from '../../utils/formatters';
// import './RealTimeMonitor.css'; // Temporarily disabled

const RealTimeMonitor = () => {
  // const { connected, liveGreeks, livePrices, subscribeToWarrant, unsubscribeFromWarrant } = useWebSocket();
  const connected = false; // Tạm thời disable WebSocket
  const liveGreeks = {};
  const livePrices = {};
  const subscribeToWarrant = () => {};
  const unsubscribeFromWarrant = () => {};
  
  const { warrants } = useMarketData();
  const [selectedWarrants, setSelectedWarrants] = useState(['CFPT2502', 'CHPG2502', 'CVHM2502']);
  const [updates, setUpdates] = useState([]);

  // useEffect(() => {
  //   // Subscribe to selected warrants
  //   selectedWarrants.forEach(symbol => {
  //     subscribeToWarrant(symbol);
  //   });

  //   return () => {
  //     // Unsubscribe on unmount
  //     selectedWarrants.forEach(symbol => {
  //       unsubscribeFromWarrant(symbol);
  //     });
  //   };
  // }, [selectedWarrants, subscribeToWarrant, unsubscribeFromWarrant]);

  // useEffect(() => {
  //   // Track updates
  //   if (Object.keys(liveGreeks).length > 0 || Object.keys(livePrices).length > 0) {
  //     const newUpdate = {
  //       time: new Date(),
  //       type: 'greeks_update',
  //       data: { ...liveGreeks, ...livePrices }
  //     };
  //     setUpdates(prev => [newUpdate, ...prev.slice(0, 19)]); // Keep last 20 updates
  //   }
  // }, [liveGreeks, livePrices]);

  const addWarrantToMonitor = (symbol) => {
    if (!selectedWarrants.includes(symbol)) {
      setSelectedWarrants([...selectedWarrants, symbol]);
    }
  };

  const removeWarrantFromMonitor = (symbol) => {
    setSelectedWarrants(selectedWarrants.filter(s => s !== symbol));
    unsubscribeFromWarrant(symbol);
  };

  return (
    <div className="realtime-monitor">
      <div className="monitor-header">
        <h1>Giám sát Trực tiếp</h1>
        <div className="connection-indicator">
          <span className={`indicator-dot ${connected ? 'active' : 'inactive'}`}></span>
          <span>{connected ? 'Đang kết nối' : 'Mất kết nối'}</span>
        </div>
      </div>

      {/* Warrant Selector */}
      <div className="warrant-selector">
        <h3>Chọn Warrant giám sát:</h3>
        <div className="selector-controls">
          <select 
            className="warrant-dropdown"
            onChange={(e) => addWarrantToMonitor(e.target.value)}
            value=""
          >
            <option value="">-- Chọn Warrant --</option>
            {warrants.slice(0, 20).map((w, idx) => (
              <option key={idx} value={w.symbol || `W${idx}`}>
                {w.symbol || `W${idx}`} - {w.underlying || 'Stock'}
              </option>
            ))}
          </select>
          <button className="refresh-btn" onClick={() => setUpdates([])}>
             Làm mới
          </button>
        </div>
      </div>

      {/* Monitored Warrants */}
      <div className="monitored-warrants">
        <h2 className="section-title">Warrant đang giám sát ({selectedWarrants.length})</h2>
        <div className="warrants-grid">
          {selectedWarrants.map(symbol => {
            const price = livePrices[symbol] || { price: 0, change: 0 };
            const greeks = liveGreeks[symbol] || {};

            return (
              <div key={symbol} className="warrant-card">
                <div className="card-header">
                  <h3 className="warrant-symbol">{symbol}</h3>
                  <button 
                    className="remove-btn"
                    onClick={() => removeWarrantFromMonitor(symbol)}
                  >
                    
                  </button>
                </div>

                <div className="card-body">
                  {/* Price Info */}
                  <div className="price-section">
                    <div className="price-main">
                      <span className="price-label">Giá:</span>
                      <span className="price-value">{formatVND(price.price || 1500)}</span>
                    </div>
                    <div className={`price-change ${price.change >= 0 ? 'positive' : 'negative'}`}>
                      {formatPercent((price.change || 0.025), 2)}
                    </div>
                  </div>

                  {/* Live Greeks */}
                  <div className="greeks-section">
                    <h4>Greeks Trực tiếp:</h4>
                    <div className="greeks-mini-grid">
                      <div className="greek-mini">
                        <span className="label">Δ</span>
                        <span className="value">{formatGreek('delta', greeks.delta || 0.45)}</span>
                      </div>
                      <div className="greek-mini">
                        <span className="label">Γ</span>
                        <span className="value">{formatGreek('gamma', greeks.gamma || 0.002)}</span>
                      </div>
                      <div className="greek-mini">
                        <span className="label">ν</span>
                        <span className="value">{formatGreek('vega', greeks.vega || 12.5)}</span>
                      </div>
                      <div className="greek-mini">
                        <span className="label">Θ</span>
                        <span className="value negative">{formatGreek('theta', greeks.theta || -5.2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Last Update */}
                  <div className="update-time">
                    <span className="update-icon"></span>
                    <span className="update-text">
                      Cập nhật: {formatDateTime(new Date())}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Update Feed */}
      <div className="update-feed">
        <h2 className="section-title">Luồng cập nhật ({updates.length})</h2>
        <div className="feed-container">
          {updates.length === 0 ? (
            <div className="feed-empty">
              <p>Chưa có cập nhật nào. Đang chờ dữ liệu trực tiếp...</p>
            </div>
          ) : (
            <ul className="feed-list">
              {updates.map((update, idx) => (
                <li key={idx} className="feed-item">
                  <span className="feed-time">{formatDateTime(update.time)}</span>
                  <span className="feed-type">{update.type}</span>
                  <span className="feed-icon"></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Performance Stats */}
      <div className="performance-stats">
        <div className="stat-card">
          <h4>Tần suất cập nhật</h4>
          <p className="stat-value">5 giây</p>
        </div>
        <div className="stat-card">
          <h4>Độ trễ trung bình</h4>
          <p className="stat-value">&lt; 50ms</p>
        </div>
        <div className="stat-card">
          <h4>Dữ liệu nhận được</h4>
          <p className="stat-value">{updates.length} cập nhật</p>
        </div>
        <div className="stat-card">
          <h4>Kết nối</h4>
          <p className={`stat-value ${connected ? 'positive' : 'negative'}`}>
            {connected ? 'Ổn định' : 'Mất kết nối'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RealTimeMonitor;
