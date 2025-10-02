import React from 'react';
import { LineChart, Line, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatVND, formatPercent, formatNumber, formatGreek } from '../../utils/formatters';

const ComparisonChart = ({ data, items = [], type = 'radar', metrics = [], height = 300 }) => {
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

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
        🔄 No comparison data available
      </div>
    );
  }

  // Radar chart - Multi-dimensional comparison
  if (type === 'radar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="metric" />
          <PolarRadiusAxis />
          {items.map((item, index) => (
            <Radar
              key={item}
              name={item}
              dataKey={item}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.3}
            />
          ))}
          <Legend />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  // Grouped bar chart - Side-by-side comparison
  if (type === 'grouped-bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="category"
            angle={-15}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          {items.map((item, index) => (
            <Bar
              key={item}
              dataKey={item}
              fill={colors[index % colors.length]}
              name={item}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Stacked bar chart
  if (type === 'stacked-bar') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Legend />
          {items.map((item, index) => (
            <Bar
              key={item}
              dataKey={item}
              stackId="a"
              fill={colors[index % colors.length]}
              name={item}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Multi-line chart - Compare trends
  if (type === 'multi-line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data[0].date ? 'date' : data[0].day ? 'day' : data[0].period ? 'period' : 'x'} />
          <YAxis />
          <Tooltip />
          <Legend />
          {items.map((item, index) => (
            <Line
              key={item}
              type="monotone"
              dataKey={item}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              name={item}
              dot={data.length < 20}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Scatter plot - Two-variable comparison
  if (type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            dataKey="x"
            name={data[0].xLabel || 'X'}
            label={{ value: data[0].xLabel || 'X-Axis', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            type="number"
            dataKey="y"
            name={data[0].yLabel || 'Y'}
            label={{ value: data[0].yLabel || 'Y-Axis', angle: -90, position: 'insideLeft' }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} name={data[0].zLabel || 'Size'} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          {items.map((item, index) => (
            <Scatter
              key={item}
              name={item}
              data={data.filter(d => d.category === item)}
              fill={colors[index % colors.length]}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Performance comparison - Returns vs Risk
  if (type === 'performance') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            dataKey="risk"
            name="Risk"
            label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -5 }}
            tickFormatter={(value) => formatPercent(value)}
          />
          <YAxis 
            type="number"
            dataKey="return"
            name="Return"
            label={{ value: 'Expected Return', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => formatPercent(value)}
          />
          <ZAxis type="number" dataKey="sharpe" range={[50, 400]} name="Sharpe Ratio" />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'Sharpe Ratio') return formatNumber(value);
              return formatPercent(value);
            }}
          />
          <Legend />
          <Scatter data={data} fill="#3b82f6">
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]} 
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Greeks comparison (special handling)
  if (type === 'greeks') {
    const greekColors = {
      delta: '#3b82f6',
      gamma: '#8b5cf6',
      vega: '#10b981',
      theta: '#ef4444',
      rho: '#f59e0b'
    };

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="symbol" />
          <YAxis />
          <Tooltip formatter={(value) => formatGreek(value)} />
          <Legend />
          {metrics.map((metric, index) => (
            <Bar
              key={metric}
              dataKey={metric}
              fill={greekColors[metric] || colors[index % colors.length]}
              name={metric.charAt(0).toUpperCase() + metric.slice(1)}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default - Radar comparison
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="metric" />
        <PolarRadiusAxis />
        {items.map((item, index) => (
          <Radar
            key={item}
            name={item}
            dataKey={item}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.3}
          />
        ))}
        <Legend />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
};

export default ComparisonChart; 