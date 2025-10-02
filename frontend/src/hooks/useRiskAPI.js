/**
 * Custom Hook for Risk Management API Integration
 * Connects frontend components to backend risk APIs
 */

import { useState, useCallback } from 'react';
import apiService from '../services/apiService';

export const useRiskAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Calculate VaR using backend API
   * 
   * @param {Array<string>} symbols - Warrant symbols
   * @param {object} params - VaR parameters
   * @returns {object} VaR results
   */
  const calculateVaR = useCallback(async (symbols, params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.risk.calculateVar({
        portfolio_symbols: symbols,
        confidence_level: params.confidenceLevel || 0.95,
        time_horizon: params.timeHorizon || 1,
        method: params.method || 'historical',
        num_simulations: params.numSimulations || 10000
      });
      
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('VaR calculation error:', err);
      throw err;
    }
  }, []);

  /**
   * Run stress test using backend API
   * 
   * @param {Array<string>} symbols - Warrant symbols
   * @param {Array<object>} scenarios - Stress scenarios
   * @param {number} baseValue - Base portfolio value
   * @returns {object} Stress test results
   */
  const runStressTest = useCallback(async (symbols, scenarios, baseValue) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.risk.stressTest({
        portfolio_symbols: symbols,
        stress_scenarios: scenarios,
        base_portfolio_value: baseValue
      });
      
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Stress test error:', err);
      throw err;
    }
  }, []);

  /**
   * Analyze Taylor series (Greeks risk)
   * 
   * @param {string} symbol - Warrant symbol
   * @param {object} params - Analysis parameters
   * @returns {object} Taylor series analysis results
   */
  const analyzeTaylorSeries = useCallback(async (symbol, params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.risk.taylorSeries({
        warrant_symbol: symbol,
        spot_price: params.spotPrice,
        price_shock: params.priceShock || 0.10,
        volatility_shock: params.volatilityShock || 0.05,
        time_decay: params.timeDecay || 1.0
      });
      
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Taylor series error:', err);
      throw err;
    }
  }, []);

  /**
   * Get Greeks for a warrant (includes second-order Greeks)
   * 
   * @param {string} symbol - Warrant symbol
   * @param {number} spotPrice - Optional spot price
   * @returns {object} Greeks data
   */
  const getWarrantGreeks = useCallback(async (symbol, spotPrice = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.warrants.getGreeks(symbol, spotPrice);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Greeks calculation error:', err);
      throw err;
    }
  }, []);

  return {
    // State
    loading,
    error,
    
    // Methods
    calculateVaR,
    runStressTest,
    analyzeTaylorSeries,
    getWarrantGreeks,
  };
};

export default useRiskAPI; 