import React, { useState } from 'react';
import { formatVND, formatPercent, formatNumber } from '../../utils/formatters';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TransactionCosts = () => {
  const [params, setParams] = useState({
    tradeValue: 100000000, // 100 million VND
    numTrades: 50,
    brokerageRate: 0.0015, // 0.15%
    exchangeFee: 0.00003, // 0.003%
    clearingFee: 0.00003, // 0.003%
    taxRate: 0.001, // 0.1% securities transaction tax
    slippage: 0.0005 // 0.05%
  });

  const [analysis, setAnalysis] = useState(null);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const analyzeTransactionCosts = () => {
    const { tradeValue, numTrades, brokerageRate, exchangeFee, clearingFee, taxRate, slippage } = params;
    
    // Calculate per-trade costs
    const brokerageCost = tradeValue * brokerageRate;
    const exchangeCostPerTrade = tradeValue * exchangeFee;
    const clearingCostPerTrade = tradeValue * clearingFee;
    const taxCostPerTrade = tradeValue * taxRate;
    const slippageCost = tradeValue * slippage;
    
    const totalPerTrade = brokerageCost + exchangeCostPerTrade + clearingCostPerTrade + 
                          taxCostPerTrade + slippageCost;
    
    // Total costs for all trades
    const totalBrokerage = brokerageCost * numTrades;
    const totalExchange = exchangeCostPerTrade * numTrades;
    const totalClearing = clearingCostPerTrade * numTrades;
    const totalTax = taxCostPerTrade * numTrades;
    const totalSlippage = slippageCost * numTrades;
    const totalCost = totalPerTrade * numTrades;
    
    // Cost breakdown
    const costBreakdown = [
      { name: 'Brokerage', value: totalBrokerage, percent: totalBrokerage / totalCost },
      { name: 'Exchange Fee', value: totalExchange, percent: totalExchange / totalCost },
      { name: 'Clearing Fee', value: totalClearing, percent: totalClearing / totalCost },
      { name: 'Tax', value: totalTax, percent: totalTax / totalCost },
      { name: 'Slippage', value: totalSlippage, percent: totalSlippage / totalCost }
    ];
    
    // Sensitivity analysis
    const sensitivity = [];
    for (let i = 0; i <= 100; i += 10) {
      const trades = i;
      sensitivity.push({
        numTrades: trades,
        totalCost: totalPerTrade * trades,
        avgCost: trades > 0 ? (totalPerTrade * trades) / trades : 0
      });
    }
    
    // Optimization recommendations
    const recommendations = [];
    
    if (brokerageRate > 0.0012) {
      recommendations.push({
        type: 'warning',
        title: 'Brokerage rate cao',
        description: 'Phí môi giới cao hơn trung bình thị trường (0.12%). Nên đàm phán lại với công ty chứng khoán.'
      });
    }
    
    if (slippage > 0.001) {
      recommendations.push({
        type: 'danger',
        title: 'Slippage cao',
        description: 'Slippage >0.1% cho thấy thanh khoản kém. Nên giao dịch trong giờ cao điểm hoặc chia nhỏ lệnh.'
      });
    }
    
    if (numTrades > 100) {
      recommendations.push({
        type: 'warning',
        title: 'Tần suất giao dịch cao',
        description: `${numTrades} giao dịch có thể tốn nhiều phí. Xem xét tối ưu hóa rebalancing frequency.`
      });
    }
    
    if (totalCost / (tradeValue * numTrades) > 0.005) {
      recommendations.push({
        type: 'danger',
        title: 'Chi phí cao',
        description: `Tổng chi phí >0.5% giá trị giao dịch. Cần tối ưu hóa để cải thiện hiệu suất.`
      });
    } else {
      recommendations.push({
        type: 'success',
        title: 'Chi phí hợp lý',
        description: 'Tổng chi phí giao dịch nằm trong mức chấp nhận được cho thị trường Việt Nam.'
      });
    }
    
    setAnalysis({
      perTrade: {
        brokerage: brokerageCost,
        exchange: exchangeCostPerTrade,
        clearing: clearingCostPerTrade,
        tax: taxCostPerTrade,
        slippage: slippageCost,
        total: totalPerTrade
      },
      total: {
        brokerage: totalBrokerage,
        exchange: totalExchange,
        clearing: totalClearing,
        tax: totalTax,
        slippage: totalSlippage,
        total: totalCost
      },
      costBreakdown,
      sensitivity,
      recommendations,
      metrics: {
        costPercentage: totalCost / (tradeValue * numTrades),
        avgCostPerTrade: totalCost / numTrades
      }
    });
  };

  React.useEffect(() => {
    analyzeTransactionCosts();
  }, [params]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="transaction-costs">
      <div className="page-header">
        <h1>💸 Transaction Costs Analysis</h1>
        <p>Phân tích chi phí giao dịch thị trường Việt Nam</p>
      </div>

      {/* Parameters */}
      <div className="card mb-3">
        <div className="card-header">
          <h3 className="card-title">Tham số giao dịch</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label">Giá trị mỗi giao dịch (VND)</label>
              <input
                type="number"
                className="form-control"
                value={params.tradeValue}
                onChange={(e) => handleParamChange('tradeValue', e.target.value)}
                step="1000000"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số lượng giao dịch</label>
              <input
                type="number"
                className="form-control"
                value={params.numTrades}
                onChange={(e) => handleParamChange('numTrades', e.target.value)}
                step="1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phí môi giới (%)</label>
              <input
                type="number"
                className="form-control"
                value={params.brokerageRate * 100}
                onChange={(e) => handleParamChange('brokerageRate', e.target.value / 100)}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phí sàn (%)</label>
              <input
                type="number"
                className="form-control"
                value={params.exchangeFee * 100}
                onChange={(e) => handleParamChange('exchangeFee', e.target.value / 100)}
                step="0.001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phí lưu ký (%)</label>
              <input
                type="number"
                className="form-control"
                value={params.clearingFee * 100}
                onChange={(e) => handleParamChange('clearingFee', e.target.value / 100)}
                step="0.001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Thuế (%)</label>
              <input
                type="number"
                className="form-control"
                value={params.taxRate * 100}
                onChange={(e) => handleParamChange('taxRate', e.target.value / 100)}
                step="0.01"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Slippage (%)</label>
              <input
                type="number"
                className="form-control"
                value={params.slippage * 100}
                onChange={(e) => handleParamChange('slippage', e.target.value / 100)}
                step="0.01"
              />
            </div>
          </div>
        </div>
      </div>

      {analysis && (
        <>
          {/* Summary Cards */}
          <div className="dashboard-grid mb-3">
            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Total Cost</div>
                  <div className="stat-card-value">{formatVND(analysis.total.total)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                  💰
                </div>
              </div>
              <div className="badge badge-danger">
                {formatPercent(analysis.metrics.costPercentage)} of trade value
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Avg per Trade</div>
                  <div className="stat-card-value">{formatVND(analysis.metrics.avgCostPerTrade)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                  📊
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                Trung bình {params.numTrades} giao dịch
              </p>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Brokerage Cost</div>
                  <div className="stat-card-value">{formatVND(analysis.total.brokerage)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  🏦
                </div>
              </div>
              <div className="badge badge-warning">
                {formatPercent(analysis.costBreakdown[0].percent)} of total
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-header">
                <div>
                  <div className="stat-card-title">Slippage Cost</div>
                  <div className="stat-card-value">{formatVND(analysis.total.slippage)}</div>
                </div>
                <div className="stat-card-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                  📉
                </div>
              </div>
              <div className="badge badge-warning">
                {formatPercent(analysis.costBreakdown[4].percent)} of total
              </div>
            </div>
          </div>

          {/* Cost Breakdown Pie Chart */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Cost Breakdown</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysis.costBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analysis.costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatVND(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cost Sensitivity */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Sensitivity Analysis</h3>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysis.sensitivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="numTrades" label={{ value: 'Number of Trades', position: 'insideBottom', offset: -5 }} />
                  <YAxis label={{ value: 'Total Cost (VND)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => formatVND(value)} />
                  <Legend />
                  <Line type="monotone" dataKey="totalCost" stroke="#3b82f6" strokeWidth={2} name="Total Cost" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommendations */}
          <div className="card mb-3">
            <div className="card-header">
              <h3 className="card-title">Recommendations</h3>
            </div>
            <div className="card-body">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className={`alert alert-${rec.type}`} style={{ marginBottom: '12px' }}>
                  <strong>{rec.title}:</strong> {rec.description}
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Chi tiết chi phí</h3>
            </div>
            <div className="card-body">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Cost Component</th>
                      <th>Per Trade</th>
                      <th>Total ({params.numTrades} trades)</th>
                      <th>% of Total</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Brokerage Fee</strong></td>
                      <td>{formatVND(analysis.perTrade.brokerage)}</td>
                      <td>{formatVND(analysis.total.brokerage)}</td>
                      <td>{formatPercent(analysis.costBreakdown[0].percent)}</td>
                      <td>{formatPercent(params.brokerageRate)}</td>
                    </tr>
                    <tr>
                      <td><strong>Exchange Fee</strong></td>
                      <td>{formatVND(analysis.perTrade.exchange)}</td>
                      <td>{formatVND(analysis.total.exchange)}</td>
                      <td>{formatPercent(analysis.costBreakdown[1].percent)}</td>
                      <td>{formatPercent(params.exchangeFee)}</td>
                    </tr>
                    <tr>
                      <td><strong>Clearing Fee</strong></td>
                      <td>{formatVND(analysis.perTrade.clearing)}</td>
                      <td>{formatVND(analysis.total.clearing)}</td>
                      <td>{formatPercent(analysis.costBreakdown[2].percent)}</td>
                      <td>{formatPercent(params.clearingFee)}</td>
                    </tr>
                    <tr>
                      <td><strong>Tax</strong></td>
                      <td>{formatVND(analysis.perTrade.tax)}</td>
                      <td>{formatVND(analysis.total.tax)}</td>
                      <td>{formatPercent(analysis.costBreakdown[3].percent)}</td>
                      <td>{formatPercent(params.taxRate)}</td>
                    </tr>
                    <tr>
                      <td><strong>Slippage</strong></td>
                      <td>{formatVND(analysis.perTrade.slippage)}</td>
                      <td>{formatVND(analysis.total.slippage)}</td>
                      <td>{formatPercent(analysis.costBreakdown[4].percent)}</td>
                      <td>{formatPercent(params.slippage)}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>
                      <td><strong>TOTAL</strong></td>
                      <td>{formatVND(analysis.perTrade.total)}</td>
                      <td>{formatVND(analysis.total.total)}</td>
                      <td>100%</td>
                      <td>{formatPercent(analysis.metrics.costPercentage)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionCosts; 