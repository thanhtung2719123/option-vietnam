import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';

const RiskChart = ({ data, type = 'var', height = 300, confidenceLevel = 0.95 }) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: height, 
        color: '#64748b',
        fontSize: '14px'
      }}>
        ⚠️ No risk data available
      </div>
    );
  }

  // VaR evolution chart
  if (type === 'var') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorVar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorES" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={data[0].date ? 'date' : data[0].days ? 'days' : 'period'}
            label={{ value: data[0].days ? 'Time Horizon (days)' : 'Date', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'VaR (VND)', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => formatVND(value)}
          />
          <Tooltip formatter={(value) => formatVND(value)} />
          <Legend />
          <Area
            type="monotone"
            dataKey="var"
            stroke="#ef4444"
            fill="url(#colorVar)"
            name={`VaR (${formatPercent(confidenceLevel)})`}
          />
          {data[0].es && (
            <Area
              type="monotone"
              dataKey="es"
              stroke="#f59e0b"
              fill="url(#colorES)"
              name="Expected Shortfall"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Distribution histogram
  if (type === 'distribution') {
    const varThreshold = data[0].varThreshold || null;
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={data[0].return !== undefined ? 'return' : data[0].value !== undefined ? 'value' : 'bin'}
            tickFormatter={(value) => typeof value === 'number' ? formatPercent(value) : value}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis 
            label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            formatter={(value) => formatNumber(value)}
            labelFormatter={(value) => typeof value === 'number' ? formatPercent(value) : value}
          />
          <Bar dataKey="count" name="Frequency">
            {data.map((entry, index) => {
              const value = entry.return || entry.value || 0;
              let color = '#3b82f6';
              
              if (varThreshold !== null) {
                color = value < varThreshold ? '#ef4444' : '#3b82f6';
              }
              
              return <Cell key={`cell-${index}`} fill={color} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Heatmap - Risk matrix (Price shock × Vol shock)
  if (type === 'heatmap' && data.matrix) {
    // Transform matrix data for scatter plot
    const scatterData = [];
    data.matrix.forEach((row, i) => {
      row.forEach((value, j) => {
        scatterData.push({
          x: data.xLabels[j],
          y: data.yLabels[i],
          z: value
        });
      });
    });

    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number"
            dataKey="x"
            name={data.xLabel || 'Price Shock (%)'}
            label={{ value: data.xLabel || 'Price Shock (%)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            type="number"
            dataKey="y"
            name={data.yLabel || 'Vol Shock (%)'}
            label={{ value: data.yLabel || 'Vol Shock (%)', angle: -90, position: 'insideLeft' }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} />
          <Tooltip 
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value) => formatVND(value)}
          />
          <Scatter data={scatterData} fill="#3b82f6">
            {scatterData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.z < 0 ? '#ef4444' : '#10b981'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Drawdown chart
  if (type === 'drawdown') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data[0].date ? 'date' : 'period'} />
          <YAxis 
            tickFormatter={(value) => formatPercent(value)}
            domain={['dataMin', 0]}
          />
          <Tooltip 
            formatter={(value) => formatPercent(value)}
            labelFormatter={(value) => formatNumber(value)}
          />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            fill="url(#colorDD)"
            name="Drawdown"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Confidence intervals
  if (type === 'confidence') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data[0].date ? 'date' : data[0].day ? 'day' : 'period'} />
          <YAxis tickFormatter={(value) => formatVND(value)} />
          <Tooltip formatter={(value) => formatVND(value)} />
          <Legend />
          {data[0].p95 && <Area type="monotone" dataKey="p95" stroke="#10b981" fill="transparent" name="95th %ile" />}
          {data[0].p75 && <Area type="monotone" dataKey="p75" stroke="#3b82f6" fill="url(#colorConf)" name="75th %ile" />}
          {data[0].p50 && <Area type="monotone" dataKey="p50" stroke="#3b82f6" strokeWidth={3} fill="transparent" name="Median" />}
          {data[0].p25 && <Area type="monotone" dataKey="p25" stroke="#f59e0b" fill="transparent" name="25th %ile" />}
          {data[0].p5 && <Area type="monotone" dataKey="p5" stroke="#ef4444" fill="transparent" name="5th %ile" />}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default - Risk metric line chart
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={data[0].date ? 'date' : data[0].day ? 'day' : 'period'} />
        <YAxis tickFormatter={(value) => formatVND(value)} />
        <Tooltip formatter={(value) => formatVND(value)} />
        <Legend />
        <Line
          type="monotone"
          dataKey={data[0].risk ? 'risk' : data[0].var ? 'var' : 'value'}
          stroke="#ef4444"
          strokeWidth={2}
          name="Risk Metric"
          dot={data.length < 30}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default RiskChart; 