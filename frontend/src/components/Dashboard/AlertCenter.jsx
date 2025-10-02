import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../context/MarketDataContext';
import { formatVND, formatPercent, formatDateTime } from '../../utils/formatters';

const AlertCenter = () => {
  const { warrants } = useMarketData();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all'); // all, critical, warning, info

  useEffect(() => {
    if (warrants && warrants.length > 0) {
      generateAlerts();
    }
  }, [warrants]);

  const generateAlerts = () => {
    const newAlerts = [];
    const now = new Date();

    warrants.forEach(warrant => {
      const maturityDate = new Date(warrant.maturity_date);
      const daysToMaturity = Math.floor((maturityDate - now) / (1000 * 60 * 60 * 24));

      // Expiry alerts
      if (daysToMaturity <= 7 && daysToMaturity > 0) {
        newAlerts.push({
          id: `expiry-${warrant.symbol}`,
          severity: 'critical',
          type: 'Đáo hạn sắp tới',
          symbol: warrant.symbol,
          message: `Chứng quyền ${warrant.symbol} sẽ đáo hạn trong ${daysToMaturity} ngày`,
          details: `Ngày đáo hạn: ${maturityDate.toLocaleDateString('vi-VN')}`,
          timestamp: new Date(),
          action: 'Xem xét đóng vị thế hoặc chuyển sang kỳ hạn khác'
        });
      } else if (daysToMaturity <= 30 && daysToMaturity > 7) {
        newAlerts.push({
          id: `expiry-warning-${warrant.symbol}`,
          severity: 'warning',
          type: 'Đáo hạn trong tháng',
          symbol: warrant.symbol,
          message: `Chứng quyền ${warrant.symbol} sẽ đáo hạn trong ${daysToMaturity} ngày`,
          details: `Ngày đáo hạn: ${maturityDate.toLocaleDateString('vi-VN')}`,
          timestamp: new Date(),
          action: 'Chuẩn bị kế hoạch quản lý vị thế'
        });
      }

      // Moneyness alerts (simulated - would use real pricing in production)
      const strikePrice = warrant.strike_price;
      if (strikePrice > 100000) {
        newAlerts.push({
          id: `strike-${warrant.symbol}`,
          severity: 'info',
          type: 'Giá thực hiện cao',
          symbol: warrant.symbol,
          message: `Giá thực hiện ${formatVND(strikePrice)} cao hơn trung bình`,
          details: `Cổ phiếu cơ sở: ${warrant.underlying_symbol}`,
          timestamp: new Date(),
          action: 'Kiểm tra moneyness và delta'
        });
      }
    });

    // Add general market alerts
    const callRatio = warrants.filter(w => w.warrant_type === 'Call').length / warrants.length;
    if (callRatio > 0.7) {
      newAlerts.push({
        id: 'market-bias-call',
        severity: 'info',
        type: 'Xu hướng thị trường',
        symbol: 'MARKET',
        message: `Thị trường thiên về chứng quyền Mua (${formatPercent(callRatio)})`,
        details: `Tỷ lệ Call/Put: ${formatPercent(callRatio)}/${formatPercent(1 - callRatio)}`,
        timestamp: new Date(),
        action: 'Nhà đầu tư kỳ vọng thị trường tăng'
      });
    }

    // Sort by severity and time
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    newAlerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp - a.timestamp;
    });

    setAlerts(newAlerts);
  };

  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(a => a.severity === filter);

  const alertCounts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    info: alerts.filter(a => a.severity === 'info').length
  };

  const getSeverityConfig = (severity) => {
    const configs = {
      critical: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', icon: '🔴' },
      warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: '⚠️' },
      info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'ℹ️' }
    };
    return configs[severity] || configs.info;
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          🚨 Trung tâm Cảnh báo
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Cảnh báo và thông báo quan trọng về rủi ro chứng quyền
        </p>
      </div>

      {/* Alert Summary */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <FilterButton 
            label="Tất cả"
            count={alerts.length}
            color="#6b7280"
            active={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <FilterButton 
            label="Nghiêm trọng"
            count={alertCounts.critical}
            color="#ef4444"
            active={filter === 'critical'}
            onClick={() => setFilter('critical')}
          />
          <FilterButton 
            label="Cảnh báo"
            count={alertCounts.warning}
            color="#f59e0b"
            active={filter === 'warning'}
            onClick={() => setFilter('warning')}
          />
          <FilterButton 
            label="Thông tin"
            count={alertCounts.info}
            color="#3b82f6"
            active={filter === 'info'}
            onClick={() => setFilter('info')}
          />
        </div>
      </div>

      {/* Alerts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredAlerts.length === 0 ? (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#10b981', marginBottom: '8px' }}>
              Không có cảnh báo
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Tất cả các chỉ số đều trong ngưỡng an toàn
            </div>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = getSeverityConfig(alert.severity);
            return (
              <div key={alert.id} style={{
                background: config.bg,
                borderLeft: `4px solid ${config.border}`,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{config.icon}</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '600', color: config.text, marginBottom: '4px' }}>
                        {alert.type}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280' }}>
                        {alert.symbol} • {formatDateTime(alert.timestamp)}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px',
                    background: config.border,
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {alert.severity === 'critical' ? 'Nghiêm trọng' : 
                     alert.severity === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                  </span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginBottom: '8px' }}>
                    {alert.message}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {alert.details}
                  </div>
                </div>

                <div style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: config.text,
                  fontWeight: '500'
                }}>
                  💡 Khuyến nghị: {alert.action}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const FilterButton = ({ label, count, color, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 16px',
      background: active ? color : 'white',
      color: active ? 'white' : color,
      border: `2px solid ${color}`,
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px'
    }}
  >
    <span>{label}</span>
    <span style={{
      padding: '2px 8px',
      background: active ? 'rgba(255,255,255,0.3)' : `${color}20`,
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '700'
    }}>
      {count}
    </span>
  </button>
);

export default AlertCenter; 