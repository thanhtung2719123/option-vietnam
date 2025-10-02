import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [liveGreeks, setLiveGreeks] = useState({});
  const [livePrices, setLivePrices] = useState({});
  const [riskMetrics, setRiskMetrics] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to FastAPI WebSocket
    const socket = io('http://localhost:8000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    // Real-time Greeks updates
    socket.on('greeks_update', (data) => {
      setLiveGreeks((prev) => ({
        ...prev,
        [data.symbol]: data.greeks,
      }));
    });

    // Real-time pricing updates
    socket.on('price_update', (data) => {
      setLivePrices((prev) => ({
        ...prev,
        [data.symbol]: data.price,
      }));
    });

    // Risk metrics updates
    socket.on('risk_metrics', (data) => {
      setRiskMetrics(data);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Subscribe to specific warrant updates
  const subscribeToWarrant = (symbol) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('subscribe', { symbol });
    }
  };

  // Unsubscribe from warrant updates
  const unsubscribeFromWarrant = (symbol) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('unsubscribe', { symbol });
    }
  };

  // Request Greeks calculation
  const requestGreeksUpdate = (params) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('calculate_greeks', params);
    }
  };

  // Request risk metrics calculation
  const requestRiskMetrics = (params) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('calculate_risk', params);
    }
  };

  const value = {
    connected,
    liveGreeks,
    livePrices,
    riskMetrics,
    subscribeToWarrant,
    unsubscribeFromWarrant,
    requestGreeksUpdate,
    requestRiskMetrics,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}; 