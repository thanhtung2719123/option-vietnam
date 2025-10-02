import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../services/apiService';

const MarketDataContext = createContext();

export const useMarketData = () => {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error('useMarketData must be used within MarketDataProvider');
  }
  return context;
};

export const MarketDataProvider = ({ children }) => {
  const [warrants, setWarrants] = useState([]);
  const [selectedWarrant, setSelectedWarrant] = useState(null);
  const [portfolioGreeks, setPortfolioGreeks] = useState(null);
  const [vn30Data, setVN30Data] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all Vietnamese warrants
  const fetchWarrants = async () => {
    setLoading(true);
    try {
      const response = await apiService.warrants.list();
      setWarrants(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch warrants: ' + err.message);
      console.error('Error fetching warrants:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch portfolio Greeks
  const fetchPortfolioGreeks = async (positions) => {
    try {
      // Aggregate Greeks from individual warrants
      const greeksPromises = positions.map(pos => 
        apiService.warrants.getGreeks(pos.symbol)
      );
      const greeksResults = await Promise.all(greeksPromises);
      
      // Calculate portfolio Greeks
      const portfolioGreeks = greeksResults.reduce((acc, greeks, idx) => {
        const quantity = positions[idx].quantity;
        return {
          delta: (acc.delta || 0) + greeks.data.delta * quantity,
          gamma: (acc.gamma || 0) + greeks.data.gamma * quantity,
          vega: (acc.vega || 0) + greeks.data.vega * quantity,
          theta: (acc.theta || 0) + greeks.data.theta * quantity,
          rho: (acc.rho || 0) + greeks.data.rho * quantity,
        };
      }, {});
      
      setPortfolioGreeks(portfolioGreeks);
    } catch (err) {
      console.error('Error fetching portfolio Greeks:', err);
    }
  };

  // Fetch VN30 index data (mock for now since backend doesn't have this endpoint yet)
  const fetchVN30Data = async () => {
    try {
      // Mock VN30 data for now
      setVN30Data({
        index: 'VN30',
        value: 1234.56,
        change: 12.34,
        changePercent: 1.01,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error fetching VN30 data:', err);
    }
  };

  // Price a warrant using Black-Scholes or Heston
  const priceWarrant = async (params) => {
    try {
      const result = await apiService.warrants.price(params);
      return result;
    } catch (err) {
      console.error('Error pricing warrant:', err);
      throw err;
    }
  };

  // Get Greeks for a warrant
  const getGreeks = async (symbol) => {
    try {
      const result = await apiService.warrants.getGreeks(symbol);
      return result.data;
    } catch (err) {
      console.error('Error getting Greeks:', err);
      throw err;
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchWarrants();
    fetchVN30Data();
  }, []);

  const value = {
    // State
    warrants,
    selectedWarrant,
    portfolioGreeks,
    vn30Data,
    loading,
    error,
    
    // Actions
    setSelectedWarrant,
    fetchWarrants,
    fetchPortfolioGreeks,
    fetchVN30Data,
    priceWarrant,
    getGreeks,
  };

  return (
    <MarketDataContext.Provider value={value}>
      {children}
    </MarketDataContext.Provider>
  );
}; 