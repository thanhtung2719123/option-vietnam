import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
// import { useWebSocket } from '../../context/WebSocketContext';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  // const { connected } = useWebSocket();
  const connected = false; // Tạm thời disable WebSocket

  const navigation = [
    {
      name: 'Dashboard',
      items: [
        { name: 'Tổng quan', path: '/', icon: '📊' },
        { name: 'Giám sát trực tiếp', path: '/monitor', icon: '📡' },
        { name: 'Thị trường', path: '/market', icon: '🏢' },
        { name: 'Cảnh báo', path: '/alerts', icon: '🚨' },
      ]
    },
    {
      name: 'Phân tích Warrant',
      items: [
        { name: 'Greeks', path: '/warrants/greeks', icon: '📈' },
        { name: 'Volatility', path: '/warrants/volatility', icon: '📉' },
        { name: 'Moneyness', path: '/warrants/moneyness', icon: '💰' },
        { name: 'So sánh', path: '/warrants/comparison', icon: '🔄' },
      ]
    },
    {
      name: 'Hedging',
      items: [
        { name: 'Simulator', path: '/hedging/simulator', icon: '🎯' },
        { name: 'Optimizer', path: '/hedging/optimizer', icon: '⚙️' },
        { name: 'P&L', path: '/hedging/pnl', icon: '💵' },
        { name: 'Costs', path: '/hedging/costs', icon: '💸' },
        { name: 'Strategies', path: '/hedging/strategies', icon: '📋' },
      ]
    },
    {
      name: 'Quản lý Rủi ro',
      items: [
        { name: 'VaR Analysis', path: '/risk/var', icon: '⚠️' },
        { name: 'Stress Test', path: '/risk/stress', icon: '🔥' },
        { name: 'Monte Carlo', path: '/risk/montecarlo', icon: '🎲' },
        { name: 'Greeks Risk', path: '/risk/greeks', icon: '📊' },
        { name: 'Portfolio', path: '/risk/portfolio', icon: '💼' },
      ]
    },
    {
      name: 'Hệ thống',
      items: [
        { name: 'Cài đặt', path: '/settings', icon: '⚙️' },
        { name: 'Hướng dẫn', path: '/help', icon: '❓' },
      ]
    },
  ];

  return (
    <div className="main-layout">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1>🇻🇳 Vietnamese Options</h1>
          <p>Risk Management Engine</p>
          <div style={{
            marginTop: '12px',
            padding: '6px 12px',
            background: connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            borderRadius: '6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444'
            }}></span>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {navigation.map((section, idx) => (
          <div key={idx} className="nav-section">
            <div className="nav-section-title">{section.name}</div>
            {section.items.map((item, itemIdx) => (
              <Link
                key={itemIdx}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-item-icon">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default MainLayout;
