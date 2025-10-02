import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatVND, formatNumber, formatDate } from '../../utils/formatters';

const PriceChart = ({ data, type = 'line', showVolume = false, height = 300 }) => {
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
        📈 No price data available
      </div>
    );
  }

  // Custom candlestick shape
  const Candlestick = (props) => {
    const { x, y, width, height, fill, payload } = props;
    const isPositive = payload.close >= payload.open;
    const color = isPositive ? '#10b981' : '#ef4444';
    const wickX = x + width / 2;
    
    const high = payload.high || payload.close;
    const low = payload.low || payload.open;
    const open = payload.open;
    const close = payload.close;
    
    // Calculate Y positions (note: Y increases downward)
    const yScale = height / (high - low);
    const highY = y;
    const lowY = y + height;
    const openY = y + (high - open) * yScale;
    const closeY = y + (high - close) * yScale;
    
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.abs(closeY - openY);
    
    return (
      <g>
        {/* Wick (High-Low line) */}
        <line
          x1={wickX}
          y1={highY}
          x2={wickX}
          y2={lowY}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body (Open-Close rectangle) */}
        <rect
          x={x}
          y={bodyTop}
          width={width}
          height={bodyHeight || 1}
          fill={isPositive ? color : 'white'}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  // Candlestick chart
  if (type === 'candlestick') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => formatDate(value)}
          />
          <YAxis 
            yAxisId="price"
            domain={['dataMin - 1000', 'dataMax + 1000']}
            tickFormatter={(value) => formatVND(value)}
          />
          {showVolume && (
            <YAxis 
              yAxisId="volume"
              orientation="right"
              tickFormatter={(value) => formatNumber(value)}
            />
          )}
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'Volume') return formatNumber(value);
              return formatVND(value);
            }}
            labelFormatter={(value) => formatDate(value)}
          />
          <Legend />
          
          {/* Candlesticks */}
          <Bar
            yAxisId="price"
            dataKey="close"
            shape={<Candlestick />}
            name="Price"
          />
          
          {/* Volume bars */}
          {showVolume && (
            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="#94a3b8"
              opacity={0.3}
              name="Volume"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  // Area chart - Filled price chart
  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={data[0].date ? 'date' : data[0].time ? 'time' : 'x'}
            tickFormatter={(value) => typeof value === 'string' ? value : formatDate(value)}
          />
          <YAxis tickFormatter={(value) => formatVND(value)} />
          <Tooltip 
            formatter={(value) => formatVND(value)}
            labelFormatter={(value) => formatDate(value)}
          />
          <Area
            type="monotone"
            dataKey={data[0].close ? 'close' : data[0].price ? 'price' : 'value'}
            stroke="#3b82f6"
            fillOpacity={1}
            fill="url(#colorPrice)"
            name="Price"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Line chart (default)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey={data[0].date ? 'date' : data[0].time ? 'time' : data[0].day ? 'day' : 'x'}
          tickFormatter={(value) => typeof value === 'string' ? value : formatDate(value)}
        />
        <YAxis tickFormatter={(value) => formatVND(value)} />
        <Tooltip 
          formatter={(value) => formatVND(value)}
          labelFormatter={(value) => formatDate(value)}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey={data[0].close ? 'close' : data[0].price ? 'price' : 'value'}
          stroke="#3b82f6"
          strokeWidth={2}
          name="Price"
          dot={data.length < 30}
        />
        {data[0].high && (
          <>
            <Line type="monotone" dataKey="high" stroke="#10b981" strokeWidth={1} name="High" dot={false} />
            <Line type="monotone" dataKey="low" stroke="#ef4444" strokeWidth={1} name="Low" dot={false} />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PriceChart; 