import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
// import '../styles/App.css'; // Temporarily disabled

const BackendConnectionTest = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [warrants, setWarrants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Test health endpoint
  const testHealth = async () => {
    try {
      const response = await apiService.health();
      setHealthStatus(response.data);
      console.log(' Health check:', response.data);
    } catch (err) {
      setError('Health check failed: ' + err.message);
      console.error(' Health check failed:', err);
    }
  };

  // Test status endpoint
  const testStatus = async () => {
    try {
      const response = await apiService.status();
      setApiStatus(response.data);
      console.log(' API status:', response.data);
    } catch (err) {
      setError('Status check failed: ' + err.message);
      console.error(' Status check failed:', err);
    }
  };

  // Test warrants endpoint
  const testWarrants = async () => {
    setLoading(true);
    try {
      const response = await apiService.warrants.list();
      setWarrants(response.data);
      console.log(' Warrants:', response.data);
      setError(null);
    } catch (err) {
      setError('Warrants fetch failed: ' + err.message);
      console.error(' Warrants fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run tests on mount
  useEffect(() => {
    testHealth();
    testStatus();
    testWarrants();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6"> Backend Connection Test</h1>

      {/* Health Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <h2 className="text-xl font-bold mb-3"> Health Check</h2>
        {healthStatus ? (
          <div className="bg-green-50 p-4 rounded">
            <p className="text-green-800"> Backend is healthy!</p>
            <pre className="mt-2 text-sm">{JSON.stringify(healthStatus, null, 2)}</pre>
          </div>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </div>

      {/* API Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <h2 className="text-xl font-bold mb-3"> API Status</h2>
        {apiStatus ? (
          <div className="bg-blue-50 p-4 rounded">
            <p className="text-blue-800"> API Version: {apiStatus.api_version}</p>
            <div className="mt-2">
              <p className="font-semibold">Available Models:</p>
              <ul className="list-disc list-inside">
                {apiStatus.models_available?.map((model, idx) => (
                  <li key={idx}>{model}</li>
                ))}
              </ul>
            </div>
            <div className="mt-2">
              <p className="font-semibold">Capabilities:</p>
              <pre className="text-sm mt-1">{JSON.stringify(apiStatus.capabilities, null, 2)}</pre>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading...</p>
        )}
      </div>

      {/* Warrants */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <h2 className="text-xl font-bold mb-3"> Vietnamese Warrants</h2>
        {loading ? (
          <p className="text-gray-500">Loading warrants...</p>
        ) : warrants.length > 0 ? (
          <div className="bg-purple-50 p-4 rounded">
            <p className="text-purple-800 font-semibold"> Found {warrants.length} warrants</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {warrants.map((warrant, idx) => (
                <div key={idx} className="border border-purple-200 rounded p-3">
                  <p className="font-bold text-lg">{warrant.symbol}</p>
                  <p className="text-sm text-gray-600">Underlying: {warrant.underlying_symbol}</p>
                  <p className="text-sm text-gray-600">Type: {warrant.warrant_type}</p>
                  <p className="text-sm text-gray-600">
                    Strike: {warrant.strike_price?.toLocaleString()} VND
                  </p>
                  <p className="text-sm text-gray-600">Issuer: {warrant.issuer}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No warrants found</p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-semibold"> Error:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Test Buttons */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-3"> Manual Tests</h2>
        <div className="flex gap-3">
          <button
            onClick={testHealth}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Test Health
          </button>
          <button
            onClick={testStatus}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Test Status
          </button>
          <button
            onClick={testWarrants}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Test Warrants
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackendConnectionTest;
