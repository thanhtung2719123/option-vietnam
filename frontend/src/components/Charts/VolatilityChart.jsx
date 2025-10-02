import React from 'react';
import { LineChart, Line, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Plot from 'react-plotly.js';
import { formatPercent, formatNumber } from '../../utils/formatters';

const VolatilityChart = ({ data, type = 'line', height = 300 }) => {
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
        📉 No volatility data available
      </div>
    );
  }

  // 3D Surface - Volatility surface visualization
  if (type === 'surface' && data.strikes && data.maturities && data.z) {
    return (
      <Plot
        data={[{
          type: 'surface',
          x: data.strikes,
          y: data.maturities,
          z: data.z,
          colorscale: [
            [0, 'rgb(16, 185, 129)'],
            [0.5, 'rgb(245, 158, 11)'],
            [1, 'rgb(239, 68, 68)']
          ],
          contours: {
            z: {
              show: true,
              usecolormap: true,
              highlightcolor: "#42f462",
              project: { z: true }
            }
          }
        }]}
        layout={{
          autosize: true,
          width: undefined,
          height: height,
          scene: {
            xaxis: { title: 'Strike (%)' },
            yaxis: { title: 'Time to Maturity (years)' },
            zaxis: { title: 'Implied Volatility' },
            camera: {
              eye: { x: 1.5, y: 1.5, z: 1.3 }
            }
          },
          margin: { l: 0, r: 0, b: 0, t: 30 }
        }}
        config={{ responsive: true }}
        style={{ width: '100%' }}
      />
    );
  }

  // Volatility smile - IV vs Strike/Moneyness
  if (type === 'smile') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={data[0].moneyness ? 'moneyness' : 'strike'}
            label={{ 
              value: data[0].moneyness ? 'Moneyness (S/K)' : 'Strike', 
              position: 'insideBottom', 
              offset: -5 
            }}
            tickFormatter={(value) => formatNumber(value)}
          />
          <YAxis 
            label={{ value: 'Implied Volatility', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => formatPercent(value)}
          />
          <Tooltip 
            formatter={(value, name) => formatPercent(value)}
            labelFormatter={(value) => `Strike: ${formatNumber(value)}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="impliedVol"
            stroke="#3b82f6"
            strokeWidth={3}
            name="Implied Volatility"
            dot={{ r: 5 }}
          />
          {data[0].historicalVol && (
            <Line
              type="monotone"
              dataKey="historicalVol"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Historical Volatility"
              dot={{ r: 3 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Term structure - Volatility vs Time to maturity
  if (type === 'term') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="maturity"
            label={{ value: 'Time to Maturity', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'Volatility', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => formatPercent(value)}
          />
          <Tooltip formatter={(value) => formatPercent(value)} />
          <Legend />
          <Line
            type="monotone"
            dataKey="impliedVol"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Implied Vol"
          />
          {data[0].historicalVol && (
            <Line
              type="monotone"
              dataKey="historicalVol"
              stroke="#10b981"
              strokeWidth={2}
              name="Historical Vol"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Volatility cone - Historical volatility ranges
  if (type === 'cone') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorVolCone" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="period"
            label={{ value: 'Period', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            label={{ value: 'Volatility', angle: -90, position: 'insideLeft' }}
            tickFormatter={(value) => formatPercent(value)}
          />
          <Tooltip formatter={(value) => formatPercent(value)} />
          <Legend />
          <Area
            type="monotone"
            dataKey="max"
            stroke="#ef4444"
            fill="transparent"
            name="Max"
          />
          <Area
            type="monotone"
            dataKey="p75"
            stroke="#f59e0b"
            fill="url(#colorVolCone)"
            name="75th %ile"
          />
          <Area
            type="monotone"
            dataKey="median"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="transparent"
            name="Median"
          />
          <Area
            type="monotone"
            dataKey="p25"
            stroke="#10b981"
            fill="transparent"
            name="25th %ile"
          />
          <Area
            type="monotone"
            dataKey="min"
            stroke="#10b981"
            fill="transparent"
            name="Min"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default - Simple line chart
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={data[0].date ? 'date' : data[0].day ? 'day' : 'x'} />
        <YAxis tickFormatter={(value) => formatPercent(value)} />
        <Tooltip formatter={(value) => formatPercent(value)} />
        <Legend />
        <Line
          type="monotone"
          dataKey={data[0].volatility ? 'volatility' : data[0].vol ? 'vol' : 'value'}
          stroke="#3b82f6"
          strokeWidth={2}
          name="Volatility"
          dot={data.length < 30}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default VolatilityChart; 