import axios from 'axios';

// Base URL for FastAPI backend - uses environment variable in production
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001';
const API_V1 = `${API_BASE_URL}/api/v1`;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Service Object
const apiService = {
  // Health & Status
  health: () => api.get('/health'),
  status: () => api.get(`${API_V1}/status`),

  // Warrant Pricing
  warrants: {
    list: () => api.get(`${API_V1}/warrants/`),
    price: (data) => api.post(`${API_V1}/warrants/price`, data),
    getGreeks: (symbol, spotPrice = null) => {
      const params = spotPrice ? { spot_price: spotPrice } : {};
      return api.get(`${API_V1}/warrants/${symbol}/greeks`, { params });
    },
    getMarketPrice: (underlyingSymbol) => api.get(`${API_V1}/warrants/market-price/${underlyingSymbol}`),
    getVolatilityMetrics: (underlyingSymbol) => api.get(`${API_V1}/warrants/volatility-metrics/${underlyingSymbol}`),
  },

  // Hedging
  hedging: {
    simulate: (data) => api.post(`${API_V1}/hedging/simulate`, data),
    optimizeRebalancing: (data) => api.post(`${API_V1}/hedging/optimize-rebalancing`, data),
    getResults: (symbol) => api.get(`${API_V1}/hedging/results/${symbol}`),
  },

  // Risk Management
  risk: {
    calculateVar: (data) => api.post(`${API_V1}/risk/var`, data),
    stressTest: (data) => api.post(`${API_V1}/risk/stress-test`, data),
    taylorSeries: (data) => api.post(`${API_V1}/risk/taylor-series`, data),
    getMetrics: (portfolioId) => api.get(`${API_V1}/risk/metrics/${portfolioId}`),
  },
};

export default apiService; 