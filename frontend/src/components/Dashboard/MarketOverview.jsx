import React, { useState, useEffect } from 'react';
import { useMarketData } from '../../context/MarketDataContext';
// import { useWebSocket } from '../../context/WebSocketContext';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';

const MarketOverview = () => {
  const { warrants, loading } = useMarketData();
  // const { connected } = useWebSocket();
  const connected = false; // Tạm thời disable WebSocket
  const [marketStats, setMarketStats] = useState(null);
  const [vn30Data, setVN30Data] = useState(null);

  useEffect(() => {
    calculateMarketStats();
  }, [warrants]);

  const calculateMarketStats = () => {
    if (!warrants || warrants.length === 0) return;

    // Calculate comprehensive market statistics
    const stats = {
      totalWarrants: warrants.length,
      activeWarrants: warrants.filter(w => w.is_active !== false).length,
      callWarrants: warrants.filter(w => w.warrant_type === 'Call').length,
      putWarrants: warrants.filter(w => w.warrant_type === 'Put').length,
      
      // Underlying analysis
      uniqueUnderlyings: new Set(warrants.map(w => w.underlying_symbol)).size,
      topUnderlyings: getTopUnderlyings(warrants),
      
      // Issuer analysis
      uniqueIssuers: new Set(warrants.map(w => w.issuer)).size,
      topIssuers: getTopIssuers(warrants),
      
      // Maturity analysis
      expiringThisMonth: warrants.filter(w => isExpiringThisMonth(w.maturity_date)).length,
      expiringThisQuarter: warrants.filter(w => isExpiringThisQuarter(w.maturity_date)).length,
      
      // Price statistics
      avgStrikePrice: calculateAverage(warrants.map(w => w.strike_price)),
      minStrikePrice: Math.min(...warrants.map(w => w.strike_price)),
      maxStrikePrice: Math.max(...warrants.map(w => w.strike_price)),
    };

    setMarketStats(stats);
  };

  const getTopUnderlyings = (warrants) => {
    const counts = {};
    warrants.forEach(w => {
      counts[w.underlying_symbol] = (counts[w.underlying_symbol] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([symbol, count]) => ({ symbol, count }));
  };

  const getTopIssuers = (warrants) => {
    const counts = {};
    warrants.forEach(w => {
      counts[w.issuer] = (counts[w.issuer] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issuer, count]) => ({ issuer, count }));
  };

  const isExpiringThisMonth = (maturityDate) => {
    const now = new Date();
    const maturity = new Date(maturityDate);
    return maturity.getMonth() === now.getMonth() && 
           maturity.getFullYear() === now.getFullYear();
  };

  const isExpiringThisQuarter = (maturityDate) => {
    const now = new Date();
    const maturity = new Date(maturityDate);
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const maturityQuarter = Math.floor(maturity.getMonth() / 3);
    return maturityQuarter === currentQuarter && 
           maturity.getFullYear() === now.getFullYear();
  };

  const calculateAverage = (numbers) => {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div>Đang tải dữ liệu thị trường...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          📊 Tổng quan Thị trường
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Thống kê và phân tích toàn bộ thị trường chứng quyền Việt Nam
        </p>
      </div>

      {/* Market Status Bar */}
      <div style={{
        background: connected ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                               'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        padding: '16px 24px',
        borderRadius: '12px',
        color: 'white',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>
            {connected ? '🟢' : '🔴'}
          </span>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {connected ? 'Thị trường đang hoạt động' : 'Kết nối bị gián đoạn'}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              {new Date().toLocaleString('vi-VN')}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>Giờ giao dịch</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            09:00 - 11:30 | 13:00 - 14:45
          </div>
        </div>
      </div>

      {/* Main Statistics */}
      {marketStats && (
        <>
          {/* Overview Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px',
            marginBottom: '24px'
          }}>
            <StatCard 
              title="Tổng số Chứng quyền"
              value={marketStats.totalWarrants}
              subtitle={`${marketStats.activeWarrants} đang hoạt động`}
              color="#3b82f6"
              icon="📊"
            />
            <StatCard 
              title="Chứng quyền Mua"
              value={marketStats.callWarrants}
              subtitle={`${formatPercent(marketStats.callWarrants / marketStats.totalWarrants)} tổng số`}
              color="#10b981"
              icon="📈"
            />
            <StatCard 
              title="Chứng quyền Bán"
              value={marketStats.putWarrants}
              subtitle={`${formatPercent(marketStats.putWarrants / marketStats.totalWarrants)} tổng số`}
              color="#ef4444"
              icon="📉"
            />
            <StatCard 
              title="Cổ phiếu cơ sở"
              value={marketStats.uniqueUnderlyings}
              subtitle={`${marketStats.uniqueIssuers} nhà phát hành`}
              color="#8b5cf6"
              icon="🏢"
            />
          </div>

          {/* Expiry Analysis */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '24px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              ⏰ Phân tích thời gian đáo hạn
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#fef3c7', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>Đáo hạn tháng này</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#92400e' }}>
                  {marketStats.expiringThisMonth}
                </div>
              </div>
              <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#1e3a8a', marginBottom: '4px' }}>Đáo hạn quý này</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#1e3a8a' }}>
                  {marketStats.expiringThisQuarter}
                </div>
              </div>
              <div style={{ padding: '16px', background: '#dcfce7', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#14532d', marginBottom: '4px' }}>Giá thực hiện TB</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#14532d' }}>
                  {formatVND(marketStats.avgStrikePrice)}
                </div>
              </div>
            </div>
          </div>

          {/* Top Underlyings */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                🏆 Top Cổ phiếu cơ sở
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {marketStats.topUnderlyings.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#6b7280',
                        width: '24px'
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        {item.symbol}
                      </span>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {item.count} CW
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Issuers */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                🏢 Top Nhà phát hành
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {marketStats.topIssuers.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#6b7280',
                        width: '24px'
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        {item.issuer}
                      </span>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      background: '#8b5cf6',
                      color: 'white',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {item.count} CW
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Strike Price Distribution */}
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
              💰 Phân phối Giá thực hiện
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: '#f0fdf4', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#166534', marginBottom: '8px' }}>Thấp nhất</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#166534' }}>
                  {formatVND(marketStats.minStrikePrice)}
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: '#dbeafe', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '8px' }}>Trung bình</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#1e40af' }}>
                  {formatVND(marketStats.avgStrikePrice)}
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: '#fef2f2', borderRadius: '8px' }}>
                <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '8px' }}>Cao nhất</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#991b1b' }}>
                  {formatVND(marketStats.maxStrikePrice)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const StatCard = ({ title, value, subtitle, color, icon }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
      <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>{title}</div>
      <span style={{ fontSize: '24px' }}>{icon}</span>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
      {typeof value === 'number' ? formatNumber(value) : value}
    </div>
    <div style={{ fontSize: '13px', color: '#6b7280' }}>{subtitle}</div>
  </div>
);

export default MarketOverview; 