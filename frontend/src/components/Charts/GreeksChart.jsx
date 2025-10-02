import React from 'react';
import { LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatGreek, formatNumber } from '../../utils/formatters';

const GreeksChart = ({ data, type = 'line', greeks = ['delta', 'gamma', 'vega', 'theta', 'rho'], height = 300 }) => {
  const greekColors = {
    delta: '#3b82f6',
    gamma: '#8b5cf6',
    vega: '#10b981',
    theta: '#ef4444',
    rho: '#f59e0b'
  };

  const greekNames = {
    delta: 'Delta (Δ)',
    gamma: 'Gamma (Γ)',
    vega: 'Vega (ν)',
    theta: 'Theta (Θ)',
    rho: 'Rho (ρ)'
  };

  if (!data || data.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: height, 
        color: '#64748b',
        fontSize: '14px'
      }}>
        📊 No data available
      </div>
    );
  }

  // Line chart - Greeks evolution over time or price
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={data[0].time ? 'time' : data[0].price ? 'price' : data[0].day ? 'day' : 'x'}
            tickFormatter={(value) => typeof value === 'number' && value > 1000 ? formatNumber(value) : value}
          />
          <YAxis />
          <Tooltip formatter={(value) => formatGreek(value)} />
          <Legend />
          {greeks.map(greek => (
            <Line
              key={greek}
              type="monotone"
              dataKey={greek}
              stroke={greekColors[greek]}
              strokeWidth={2}
              name={greekNames[greek]}
              dot={data.length < 20}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Bar chart - Greeks comparison
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => formatGreek(value)} />
          <Legend />
          {greeks.map(greek => (
            <Bar
              key={greek}
              dataKey={greek}
              fill={greekColors[greek]}
              name={greekNames[greek]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Radar chart - Multi-dimensional Greeks view
  if (type === 'radar') {
    // Transform data for radar chart
    const radarData = greeks.map(greek => ({
      greek: greekNames[greek],
      value: Math.abs(data[0]?.[greek] || 0) * 100, // Scale for visibility
      fullMark: 100
    }));

    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={radarData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="greek" />
          <PolarRadiusAxis />
          <Radar
            name="Greeks Exposure"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.5}
          />
          <Tooltip formatter={(value) => formatNumber(value / 100)} />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  // Stacked bar - Greeks breakdown by position
  if (type === 'stacked') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="symbol" />
          <YAxis />
          <Tooltip formatter={(value) => formatGreek(value)} />
          <Legend />
          {greeks.map(greek => (
            <Bar
              key={greek}
              dataKey={greek}
              stackId="a"
              fill={greekColors[greek]}
              name={greekNames[greek]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
};

export default GreeksChart; 