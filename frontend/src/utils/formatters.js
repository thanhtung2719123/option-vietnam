import numeral from 'numeral';
import { format, parseISO } from 'date-fns';

/**
 * Format Vietnamese Dong (VND) currency
 * @param {number} value - The value to format
 * @param {boolean} showSymbol - Whether to show VND symbol
 * @returns {string} Formatted currency string
 */
export const formatVND = (value, showSymbol = true) => {
  if (value === null || value === undefined) return 'N/A';
  
  const formatted = numeral(value).format('0,0');
  return showSymbol ? `${formatted} VND` : formatted;
};

/**
 * Format number with Vietnamese thousand separators
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  
  const format = decimals > 0 ? `0,0.${'0'.repeat(decimals)}` : '0,0';
  return numeral(value).format(format);
};

/**
 * Format percentage
 * @param {number} value - The value to format (0.05 = 5%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return 'N/A';
  
  const format = `0,0.${'0'.repeat(decimals)}%`;
  return numeral(value).format(format);
};

/**
 * Format date in Vietnamese format (DD/MM/YYYY)
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd/MM/yyyy');
  } catch {
    return 'Invalid Date';
  }
};

/**
 * Format datetime in Vietnamese format
 * @param {string|Date} date - The datetime to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, 'dd/MM/yyyy HH:mm:ss');
  } catch {
    return 'Invalid DateTime';
  }
};

/**
 * Format large numbers with K, M, B suffixes
 * @param {number} value - The value to format
 * @returns {string} Formatted compact number
 */
export const formatCompact = (value) => {
  if (value === null || value === undefined) return 'N/A';
  
  if (Math.abs(value) >= 1e9) {
    return numeral(value).format('0.0a').toUpperCase(); // B
  } else if (Math.abs(value) >= 1e6) {
    return numeral(value).format('0.0a').toUpperCase(); // M
  } else if (Math.abs(value) >= 1e3) {
    return numeral(value).format('0.0a').toUpperCase(); // K
  }
  return numeral(value).format('0,0');
};

/**
 * Format Greeks values with appropriate precision
 * @param {string} greekType - Type of Greek (delta, gamma, etc.)
 * @param {number} value - The value to format
 * @returns {string} Formatted Greek value
 */
export const formatGreek = (greekType, value) => {
  if (value === null || value === undefined) return 'N/A';
  
  const formats = {
    delta: '0.0000',
    gamma: '0.000000',
    vega: '0.00',
    theta: '0.00',
    rho: '0.0000',
    lambda: '0.00',
  };
  
  const format = formats[greekType.toLowerCase()] || '0.0000';
  return numeral(value).format(format);
};

/**
 * Format volatility as percentage
 * @param {number} value - The volatility value (0.3 = 30%)
 * @returns {string} Formatted volatility
 */
export const formatVolatility = (value) => {
  if (value === null || value === undefined) return 'N/A';
  return formatPercent(value, 2);
};

/**
 * Format time to maturity
 * @param {number} days - Days to maturity
 * @returns {string} Formatted time string
 */
export const formatTimeToMaturity = (days) => {
  if (days === null || days === undefined) return 'N/A';
  
  if (days < 1) {
    return `${Math.round(days * 24)} giờ`;
  } else if (days < 30) {
    return `${Math.round(days)} ngày`;
  } else if (days < 365) {
    return `${Math.round(days / 30)} tháng`;
  } else {
    return `${(days / 365).toFixed(1)} năm`;
  }
};

/**
 * Format P&L with color indication
 * @param {number} value - P&L value
 * @returns {object} Object with formatted value and color class
 */
export const formatPnL = (value) => {
  if (value === null || value === undefined) {
    return { text: 'N/A', className: '' };
  }
  
  const formatted = formatVND(value);
  const className = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral';
  
  return {
    text: value > 0 ? `+${formatted}` : formatted,
    className,
  };
};

/**
 * Format warrant symbol with color coding based on type
 * @param {string} symbol - Warrant symbol (e.g., CFPT2502)
 * @returns {object} Object with symbol and type
 */
export const formatWarrantSymbol = (symbol) => {
  if (!symbol) return { symbol: 'N/A', type: 'unknown' };
  
  const type = symbol.startsWith('C') ? 'call' : symbol.startsWith('P') ? 'put' : 'unknown';
  
  return {
    symbol,
    type,
    underlying: symbol.substring(1, symbol.search(/\d/)),
  };
};

/**
 * Get color for Greeks value based on magnitude
 * @param {string} greekType - Type of Greek
 * @param {number} value - The value
 * @returns {string} Color class name
 */
export const getGreekColor = (greekType, value) => {
  if (value === null || value === undefined) return '';
  
  switch (greekType.toLowerCase()) {
    case 'delta':
      return value > 0.5 ? 'high-delta' : value > 0.2 ? 'mid-delta' : 'low-delta';
    case 'gamma':
      return Math.abs(value) > 0.01 ? 'high-gamma' : 'low-gamma';
    case 'vega':
      return Math.abs(value) > 100 ? 'high-vega' : 'low-vega';
    case 'theta':
      return value < -50 ? 'high-decay' : 'low-decay';
    default:
      return '';
  }
};

/**
 * Format risk level
 * @param {string} level - Risk level (LOW, MEDIUM, HIGH, CRITICAL)
 * @returns {object} Formatted risk level with color
 */
export const formatRiskLevel = (level) => {
  const levels = {
    LOW: { text: 'Thấp', className: 'risk-low' },
    MEDIUM: { text: 'Trung bình', className: 'risk-medium' },
    HIGH: { text: 'Cao', className: 'risk-high' },
    CRITICAL: { text: 'Nghiêm trọng', className: 'risk-critical' },
  };
  
  return levels[level] || { text: level, className: '' };
}; 