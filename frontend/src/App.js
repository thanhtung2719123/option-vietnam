import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MarketDataProvider } from './context/MarketDataContext';
import { WebSocketProvider } from './context/WebSocketContext';

// Layout
import MainLayout from './components/Dashboard/MainLayout';

// AI Chatbot
import AIChatbot from './components/AI/AIChatbot';

// Dashboard
import MainDashboard from './components/Dashboard/MainDashboard';
import RealTimeMonitor from './components/Dashboard/RealTimeMonitor';
import MarketOverview from './components/Dashboard/MarketOverview';
import AlertCenter from './components/Dashboard/AlertCenter';

// Settings & Help
import SettingsPanel from './components/Settings/SettingsPanel';
import HelpDocumentation from './components/Help/HelpDocumentation';

// Warrant Analysis
import GreeksAnalysis from './components/WarrantAnalysis/GreeksAnalysis';
import VolatilityAnalysis from './components/WarrantAnalysis/VolatilityAnalysis';
import MoneynessAnalysis from './components/WarrantAnalysis/MoneynessAnalysis';
import WarrantComparison from './components/WarrantAnalysis/WarrantComparison';

// Hedging
import HedgingSimulator from './components/Hedging/HedgingSimulator';
import RebalancingOptimizer from './components/Hedging/RebalancingOptimizer';
import PnLAnalysis from './components/Hedging/PnLAnalysis';
import TransactionCosts from './components/Hedging/TransactionCosts';
import HedgingStrategies from './components/Hedging/HedgingStrategies';

// Risk Management
import VaRAnalysisEnhanced from './components/RiskManagement/VaRAnalysisEnhanced';
import StressTesting from './components/RiskManagement/StressTesting';
import MonteCarloViz from './components/RiskManagement/MonteCarloViz';
import GreeksRisk from './components/RiskManagement/GreeksRisk';
import PortfolioRisk from './components/RiskManagement/PortfolioRisk';

// Connection Test
import BackendConnectionTest from './components/BackendConnectionTest';

// Styles
import './styles/App.css';

function App() {
  return (
    <Router>
      {/* <WebSocketProvider> */}
        <MarketDataProvider>
          <div className="App">
            {/* AI Chatbot - Floating button */}
            <AIChatbot />
            
            <Routes>
              {/* Connection Test (Standalone) */}
              <Route path="/test-connection" element={<BackendConnectionTest />} />
              
              <Route path="/" element={<MainLayout />}>
                {/* Dashboard Routes */}
                <Route index element={<MainDashboard />} />
                <Route path="monitor" element={<RealTimeMonitor />} />
                <Route path="market" element={<MarketOverview />} />
                <Route path="alerts" element={<AlertCenter />} />
                
                {/* Warrant Analysis Routes */}
                <Route path="warrants">
                  <Route path="greeks" element={<GreeksAnalysis />} />
                  <Route path="volatility" element={<VolatilityAnalysis />} />
                  <Route path="moneyness" element={<MoneynessAnalysis />} />
                  <Route path="comparison" element={<WarrantComparison />} />
                </Route>
                
                {/* Hedging Routes */}
                <Route path="hedging">
                  <Route path="simulator" element={<HedgingSimulator />} />
                  <Route path="optimizer" element={<RebalancingOptimizer />} />
                  <Route path="pnl" element={<PnLAnalysis />} />
                  <Route path="costs" element={<TransactionCosts />} />
                  <Route path="strategies" element={<HedgingStrategies />} />
                </Route>
                
                {/* Risk Management Routes */}
                <Route path="risk">
                  <Route path="var" element={<VaRAnalysisEnhanced />} />
                  <Route path="stress" element={<StressTesting />} />
                  <Route path="montecarlo" element={<MonteCarloViz />} />
                  <Route path="greeks" element={<GreeksRisk />} />
                  <Route path="portfolio" element={<PortfolioRisk />} />
                </Route>
                
                {/* Settings & Help Routes */}
                <Route path="settings" element={<SettingsPanel />} />
                <Route path="help" element={<HelpDocumentation />} />
                
                {/* Redirect unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </div>
        </MarketDataProvider>
      {/* </WebSocketProvider> */}
    </Router>
  );
}

export default App; 