import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';

const PnLChart = ({ data, type = 'line', height = 300, showComponents = false }) => {
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
        💵 No P&L data available
      </div>
    );
  }

  // Waterfall chart - P&L breakdown
  if (type === 'waterfall') {
    // Transform data for waterfall
    const waterfallData = data.map((item, index) => {
      const prevValue = index > 0 ? data[index - 1].cumulative || 0 : 0;
      const currentValue = item.value || 0;
      const isPositive = currentValue >= 0;
      
      return {
        ...item,
        start: prevValue,
        end: prevValue + currentValue,
        value: currentValue,
        isPositive,
        cumulative: prevValue + currentValue
      };
    });

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={waterfallData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
          <YAxis tickFormatter={(value) => formatVND(value)} />
          <Tooltip formatter={(value) => formatVND(value)} />
          <Bar dataKey="value" name="P&L">
            {waterfallData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.isPositive ? '#10b981' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Cumulative area chart
  if (type === 'cumulative') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey={data[0].date ? 'date' : data[0].day ? 'day' : 'period'}
          />
          <YAxis tickFormatter={(value) => formatVND(value)} />
          <Tooltip formatter={(value) => formatVND(value)} />
          <Area
            type="monotone"
            dataKey={data[0].pnl ? 'pnl' : data[0].netPnL ? 'netPnL' : 'value'}
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorPnL)"
            name="Cumulative P&L"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Components chart - P&L breakdown by component
  if (type === 'components' || showComponents) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data[0].date ? 'date' : data[0].day ? 'day' : 'period'} />
          <YAxis tickFormatter={(value) => formatVND(value)} />
          <Tooltip formatter={(value) => formatVND(value)} />
          <Legend />
          {data[0].optionPnL && (
            <Line
              type="monotone"
              dataKey="optionPnL"
              stroke="#10b981"
              strokeWidth={2}
              name="Option P&L"
            />
          )}
          {data[0].hedgePnL && (
            <Line
              type="monotone"
              dataKey="hedgePnL"
              stroke="#8b5cf6"
              strokeWidth={2}
              name="Hedge P&L"
            />
          )}
          {data[0].transactionCost && (
            <Line
              type="monotone"
              dataKey="transactionCost"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Transaction Cost"
            />
          )}
          <Line
            type="monotone"
            dataKey={data[0].netPnL ? 'netPnL' : 'pnl'}
            stroke="#3b82f6"
            strokeWidth={3}
            name="Net P&L"
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // Daily P&L bar chart
  if (type === 'daily') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={data[0].date ? 'date' : data[0].day ? 'day' : 'period'} />
          <YAxis tickFormatter={(value) => formatVND(value)} />
          <Tooltip formatter={(value) => formatVND(value)} />
          <Bar dataKey={data[0].dailyPnL ? 'dailyPnL' : data[0].pnl ? 'pnl' : 'value'} name="Daily P&L">
            {data.map((entry, index) => {
              const value = entry.dailyPnL || entry.pnl || entry.value || 0;
              return <Cell key={`cell-${index}`} fill={value >= 0 ? '#10b981' : '#ef4444'} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // Default - Line chart
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={data[0].date ? 'date' : data[0].day ? 'day' : data[0].time ? 'time' : 'x'} />
        <YAxis tickFormatter={(value) => formatVND(value)} />
        <Tooltip formatter={(value) => formatVND(value)} />
        <Legend />
        <Line
          type="monotone"
          dataKey={data[0].pnl ? 'pnl' : data[0].netPnL ? 'netPnL' : 'value'}
          stroke="#3b82f6"
          strokeWidth={2}
          name="P&L"
          dot={data.length < 30}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PnLChart; 