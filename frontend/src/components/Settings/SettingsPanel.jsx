import React, { useState, useEffect } from 'react';

const SettingsPanel = () => {
  const [settings, setSettings] = useState({
    // Display Settings
    language: 'vi',
    theme: 'light',
    currency: 'VND',
    dateFormat: 'DD/MM/YYYY',
    
    // Data Settings
    autoRefresh: true,
    refreshInterval: 30, // seconds
    cacheEnabled: true,
    cacheDuration: 300, // seconds
    
    // Risk Settings
    varConfidence: 0.95,
    stressTestEnabled: true,
    alertsEnabled: true,
    riskThresholds: {
      deltaLimit: 1000000,
      gammaLimit: 500000,
      vegaLimit: 100000
    },
    
    // Market Settings
    defaultVolatility: 0.30,
    riskFreeRate: 0.0376,
    transactionCost: 0.00156,
    
    // Advanced Settings
    monteCarloSims: 10000,
    hedgingFrequency: 1,
    priceModel: 'black_scholes'
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('appSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Bạn có chắc muốn đặt lại tất cả cài đặt về mặc định?')) {
      localStorage.removeItem('appSettings');
      window.location.reload();
    }
  };

  const updateSetting = (section, key, value) => {
    if (section) {
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [key]: value
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0' }}>
          ⚙️ Cài đặt Hệ thống
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          Tùy chỉnh giao diện, dữ liệu, và thông số rủi ro
        </p>
      </div>

      {/* Save Status */}
      {saved && (
        <div style={{
          background: '#dcfce7',
          border: '1px solid #10b981',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#166534'
        }}>
          <span>✅</span>
          <span style={{ fontWeight: '500' }}>Đã lưu cài đặt thành công!</span>
        </div>
      )}

      {/* Display Settings */}
      <SettingSection title="🎨 Hiển thị" icon="🎨">
        <SettingRow label="Ngôn ngữ">
          <select
            value={settings.language}
            onChange={(e) => updateSetting(null, 'language', e.target.value)}
            style={selectStyle}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
        </SettingRow>

        <SettingRow label="Giao diện">
          <select
            value={settings.theme}
            onChange={(e) => updateSetting(null, 'theme', e.target.value)}
            style={selectStyle}
          >
            <option value="light">Sáng</option>
            <option value="dark">Tối</option>
            <option value="auto">Tự động</option>
          </select>
        </SettingRow>

        <SettingRow label="Định dạng tiền tệ">
          <select
            value={settings.currency}
            onChange={(e) => updateSetting(null, 'currency', e.target.value)}
            style={selectStyle}
          >
            <option value="VND">VND (₫)</option>
            <option value="USD">USD ($)</option>
          </select>
        </SettingRow>

        <SettingRow label="Định dạng ngày">
          <select
            value={settings.dateFormat}
            onChange={(e) => updateSetting(null, 'dateFormat', e.target.value)}
            style={selectStyle}
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </SettingRow>
      </SettingSection>

      {/* Data Settings */}
      <SettingSection title="📊 Dữ liệu" icon="📊">
        <SettingRow label="Tự động làm mới">
          <input
            type="checkbox"
            checked={settings.autoRefresh}
            onChange={(e) => updateSetting(null, 'autoRefresh', e.target.checked)}
            style={checkboxStyle}
          />
        </SettingRow>

        <SettingRow label="Tần suất làm mới (giây)">
          <input
            type="number"
            value={settings.refreshInterval}
            onChange={(e) => updateSetting(null, 'refreshInterval', parseInt(e.target.value))}
            min="5"
            max="300"
            style={inputStyle}
          />
        </SettingRow>

        <SettingRow label="Bật cache">
          <input
            type="checkbox"
            checked={settings.cacheEnabled}
            onChange={(e) => updateSetting(null, 'cacheEnabled', e.target.checked)}
            style={checkboxStyle}
          />
        </SettingRow>

        <SettingRow label="Thời gian cache (giây)">
          <input
            type="number"
            value={settings.cacheDuration}
            onChange={(e) => updateSetting(null, 'cacheDuration', parseInt(e.target.value))}
            min="60"
            max="3600"
            style={inputStyle}
          />
        </SettingRow>
      </SettingSection>

      {/* Risk Settings */}
      <SettingSection title="⚠️ Rủi ro" icon="⚠️">
        <SettingRow label="VaR Confidence Level">
          <select
            value={settings.varConfidence}
            onChange={(e) => updateSetting(null, 'varConfidence', parseFloat(e.target.value))}
            style={selectStyle}
          >
            <option value="0.90">90%</option>
            <option value="0.95">95%</option>
            <option value="0.99">99%</option>
          </select>
        </SettingRow>

        <SettingRow label="Bật Stress Testing">
          <input
            type="checkbox"
            checked={settings.stressTestEnabled}
            onChange={(e) => updateSetting(null, 'stressTestEnabled', e.target.checked)}
            style={checkboxStyle}
          />
        </SettingRow>

        <SettingRow label="Bật cảnh báo">
          <input
            type="checkbox"
            checked={settings.alertsEnabled}
            onChange={(e) => updateSetting(null, 'alertsEnabled', e.target.checked)}
            style={checkboxStyle}
          />
        </SettingRow>

        <SettingRow label="Giới hạn Delta (VND)">
          <input
            type="number"
            value={settings.riskThresholds.deltaLimit}
            onChange={(e) => updateSetting('riskThresholds', 'deltaLimit', parseInt(e.target.value))}
            style={inputStyle}
          />
        </SettingRow>

        <SettingRow label="Giới hạn Gamma (VND)">
          <input
            type="number"
            value={settings.riskThresholds.gammaLimit}
            onChange={(e) => updateSetting('riskThresholds', 'gammaLimit', parseInt(e.target.value))}
            style={inputStyle}
          />
        </SettingRow>

        <SettingRow label="Giới hạn Vega (VND)">
          <input
            type="number"
            value={settings.riskThresholds.vegaLimit}
            onChange={(e) => updateSetting('riskThresholds', 'vegaLimit', parseInt(e.target.value))}
            style={inputStyle}
          />
        </SettingRow>
      </SettingSection>

      {/* Market Parameters */}
      <SettingSection title="📈 Thông số Thị trường" icon="📈">
        <SettingRow label="Biến động mặc định (%)">
          <input
            type="number"
            value={settings.defaultVolatility * 100}
            onChange={(e) => updateSetting(null, 'defaultVolatility', parseFloat(e.target.value) / 100)}
            step="0.01"
            min="0"
            max="100"
            style={inputStyle}
          />
        </SettingRow>

        <SettingRow label="Lãi suất phi rủi ro (%)">
          <input
            type="number"
            value={settings.riskFreeRate * 100}
            onChange={(e) => updateSetting(null, 'riskFreeRate', parseFloat(e.target.value) / 100)}
            step="0.01"
            min="0"
            max="20"
            style={inputStyle}
          />
        </SettingRow>

        <SettingRow label="Phí giao dịch (%)">
          <input
            type="number"
            value={settings.transactionCost * 100}
            onChange={(e) => updateSetting(null, 'transactionCost', parseFloat(e.target.value) / 100)}
            step="0.001"
            min="0"
            max="1"
            style={inputStyle}
          />
        </SettingRow>
      </SettingSection>

      {/* Advanced Settings */}
      <SettingSection title="🔬 Nâng cao" icon="🔬">
        <SettingRow label="Số mô phỏng Monte Carlo">
          <select
            value={settings.monteCarloSims}
            onChange={(e) => updateSetting(null, 'monteCarloSims', parseInt(e.target.value))}
            style={selectStyle}
          >
            <option value="1000">1,000</option>
            <option value="5000">5,000</option>
            <option value="10000">10,000</option>
            <option value="50000">50,000</option>
          </select>
        </SettingRow>

        <SettingRow label="Tần suất hedging (ngày)">
          <input
            type="number"
            value={settings.hedgingFrequency}
            onChange={(e) => updateSetting(null, 'hedgingFrequency', parseInt(e.target.value))}
            min="1"
            max="30"
            style={inputStyle}
          />
        </SettingRow>

        <SettingRow label="Mô hình định giá">
          <select
            value={settings.priceModel}
            onChange={(e) => updateSetting(null, 'priceModel', e.target.value)}
            style={selectStyle}
          >
            <option value="black_scholes">Black-Scholes</option>
            <option value="heston">Heston</option>
            <option value="monte_carlo">Monte Carlo</option>
          </select>
        </SettingRow>
      </SettingSection>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '14px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
        >
          💾 Lưu cài đặt
        </button>
        <button
          onClick={handleReset}
          style={{
            flex: 1,
            padding: '14px 24px',
            background: 'white',
            color: '#ef4444',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
        >
          🔄 Đặt lại mặc định
        </button>
      </div>

      {/* Info Box */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        borderRadius: '8px'
      }}>
        <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '500', marginBottom: '8px' }}>
          💡 Lưu ý:
        </div>
        <div style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
          • Cài đặt sẽ được lưu trên trình duyệt của bạn<br />
          • Một số thay đổi có thể yêu cầu làm mới trang<br />
          • Thông số thị trường nên được cập nhật định kỳ từ nguồn chính thức
        </div>
      </div>
    </div>
  );
};

const SettingSection = ({ title, icon, children }) => (
  <div style={{
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '20px'
  }}>
    <h2 style={{
      fontSize: '20px',
      fontWeight: '600',
      margin: '0 0 20px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span>{icon}</span>
      {title}
    </h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {children}
    </div>
  </div>
);

const SettingRow = ({ label, children }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6'
  }}>
    <label style={{
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      flex: 1
    }}>
      {label}
    </label>
    <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
      {children}
    </div>
  </div>
);

const selectStyle = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  minWidth: '180px',
  cursor: 'pointer'
};

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  width: '180px'
};

const checkboxStyle = {
  width: '20px',
  height: '20px',
  cursor: 'pointer'
};

export default SettingsPanel; 