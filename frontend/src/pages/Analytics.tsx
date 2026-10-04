import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Transaction } from '../types/transaction';
import Skeleton from '../components/Skeleton';

interface MonthlyStats {
  income: number;
  expense: number;
  transactions: number;
}

interface SpendingCategory {
  description: string;
  amount: number;
  percentage: number;
}

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [spendingCategories, setSpendingCategories] = useState<SpendingCategory[]>([]);
  const [hoveredSlice, setHoveredSlice] = useState<'income' | 'expense' | null>(null);
  const [filterType, setFilterType] = useState<'preset' | 'custom'>('preset');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('1M');
  const [customFromDate, setCustomFromDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [customToDate, setCustomToDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { from: firstDay, to: lastDay };
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const fromDate = filterType === 'custom' ? customFromDate : dateRange.from.toISOString().split('T')[0];
      const toDate = filterType === 'custom' ? customToDate : dateRange.to.toISOString().split('T')[0];

      const [monthlyResponse, transactionsResponse] = await Promise.all([
        api.get<MonthlyStats>(
          `/wallet/transactions/stats?fromDate=${fromDate}&toDate=${toDate}`
        ).catch(() => {
          return null;
        }),
        api.get<{ transactions: Transaction[] }>(
          `/wallet/transactions?from=${fromDate}&to=${toDate}&limit=100`
        ).catch(() => {
          return null;
        }),
      ]);

      if (monthlyResponse?.data) {
        setMonthlyStats(monthlyResponse.data);
      }

      if (transactionsResponse?.data) {
        const txns = transactionsResponse.data.transactions;
        setTransactions(txns);

        const expenseMap = new Map<string, number>();
        let totalExpenses = 0;
        txns.forEach((txn) => {
          if (txn.type === 'EXPENSE' && txn.status === 'COMPLETED') {
            const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
            const desc = txn.description || 'Other';
            expenseMap.set(desc, (expenseMap.get(desc) || 0) + amount);
            totalExpenses += amount;
          }
        });

        const categories = Array.from(expenseMap.entries())
          .map(([description, amount]) => ({
            description,
            amount,
            percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
          }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5);

        setSpendingCategories(categories);
      }

      if (!monthlyResponse?.data && !transactionsResponse?.data) {
        setError('Failed to load analytics data');
      }
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [filterType, dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const netCashFlow = monthlyStats ? monthlyStats.income - monthlyStats.expense : 0;
  const savingsRate = monthlyStats && monthlyStats.income > 0 
    ? ((monthlyStats.income - monthlyStats.expense) / monthlyStats.income) * 100 
    : 0;

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-header">
          <Skeleton variant="text" style={{ height: '40px', width: '200px' }} />
          <Skeleton variant="text" style={{ height: '20px', width: '300px' }} />
        </div>
        <div className="analytics-filters">
          <Skeleton variant="rectangular" style={{ height: '40px', width: '150px', borderRadius: 'var(--radius-md)' }} />
        </div>
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rectangular" style={{ height: '140px', borderRadius: 'var(--radius-xl)' }} />
          ))}
        </div>
        <div className="chart-section">
          <Skeleton variant="rectangular" style={{ height: '400px', borderRadius: 'var(--radius-xl)' }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-header">
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-subtitle">Track your financial performance</p>
        </div>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Analytics Unavailable</h3>
          <p className="error-message">{error}</p>
          <button onClick={fetchAnalytics} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!monthlyStats) {
    return (
      <div className="analytics-page">
        <div className="analytics-header">
          <h1 className="analytics-title">Analytics</h1>
          <p className="analytics-subtitle">Track your financial performance</p>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3 className="empty-title">No Data for Selected Period</h3>
          <p className="empty-message">
            There are no transactions for the selected month. 
            Try selecting a different period or make some transactions to see analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <h1 className="analytics-title">Analytics</h1>
        <p className="analytics-subtitle">Track your financial performance and spending patterns</p>
      </div>

      <div className="analytics-filters">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterType === 'preset' ? 'active' : ''}`}
            onClick={() => setFilterType('preset')}
          >
            Quick
          </button>
          <button
            className={`filter-tab ${filterType === 'custom' ? 'active' : ''}`}
            onClick={() => setFilterType('custom')}
          >
            Custom
          </button>
        </div>
        
        {filterType === 'preset' ? (
          <div className="preset-filters">
            {['7D', '30D', '3M', '6M', '1Y'].map((period) => (
              <button
                key={period}
                className={`filter-chip ${selectedPeriod === period ? 'active' : ''}`}
                onClick={() => {
                  const now = new Date();
                  let startDate: Date;
                  let endDate: Date;

                  switch (period) {
                    case '7D':
                      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      endDate = new Date();
                      break;
                    case '30D':
                      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      endDate = new Date();
                      break;
                    case '3M':
                      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                      endDate = new Date();
                      break;
                    case '6M':
                      startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                      endDate = new Date();
                      break;
                    case '1Y':
                      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
                      endDate = new Date();
                      break;
                    default:
                      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                      endDate = new Date();
                  }

                  setSelectedPeriod(period);
                  setDateRange({ from: startDate, to: endDate });
                }}
              >
                {period}
              </button>
            ))}
          </div>
        ) : (
          <div className="custom-filter">
            <div className="date-range-inputs">
              <div className="date-input-group">
                <label className="date-label">From:</label>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={(e) => setCustomFromDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="date-input-group">
                <label className="date-label">To:</label>
                <input
                  type="date"
                  value={customToDate}
                  onChange={(e) => setCustomToDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <button
                onClick={() => {
                  const from = new Date(customFromDate);
                  const to = new Date(customToDate);
                  to.setHours(23, 59, 59, 999);
                  setDateRange({ from, to });
                }}
                className="btn btn-primary"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon income">💰</div>
          <div className="kpi-content">
            <div className="kpi-label">Income</div>
            <div className="kpi-value income">{formatCurrency(monthlyStats.income)}</div>
            <div className="kpi-sub">{monthlyStats.transactions} transactions</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon expense">💸</div>
          <div className="kpi-content">
            <div className="kpi-label">Expenses</div>
            <div className="kpi-value expense">{formatCurrency(monthlyStats.expense)}</div>
            <div className="kpi-sub">{spendingCategories.length} categories</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon net">📈</div>
          <div className="kpi-content">
            <div className="kpi-label">Net Cash Flow</div>
            <div className={`kpi-value ${netCashFlow >= 0 ? 'income' : 'expense'}`}>
              {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
            </div>
            <div className="kpi-sub">{netCashFlow >= 0 ? 'Positive' : 'Negative'} flow</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon savings">🎯</div>
          <div className="kpi-content">
            <div className="kpi-label">Savings Rate</div>
            <div className={`kpi-value ${savingsRate >= 0 ? 'income' : 'expense'}`}>
              {formatPercentage(savingsRate)}
            </div>
            <div className="kpi-sub">of income saved</div>
          </div>
        </div>
      </div>

      {/* Cash Flow Overview */}
      <div className="chart-section">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Income vs Expenses</h3>
            <p className="card-subtitle">Monthly cash flow breakdown</p>
          </div>
          <div className="card-body">
            <div className="pie-chart-container">
              <svg viewBox="0 0 400 300" className="pie-chart">
                {(() => {
                  const total = monthlyStats.income + monthlyStats.expense;
                  const incomePercent = (monthlyStats.income / total) * 100;
                  
                  const incomeAngle = (incomePercent / 100) * 360;
                  
                  const centerX = 200;
                  const centerY = 150;
                  const radius = 100;
                  
                  const incomeEndX = centerX + radius * Math.cos((incomeAngle - 90) * Math.PI / 180);
                  const incomeEndY = centerY + radius * Math.sin((incomeAngle - 90) * Math.PI / 180);
                  
                  const largeArcFlag = incomePercent > 50 ? 1 : 0;
                  
                  const getCenterText = () => {
                    if (hoveredSlice === 'income') {
                      return {
                        label: 'Income',
                        value: formatCurrency(monthlyStats.income),
                        percent: formatPercentage(incomePercent)
                      };
                    } else if (hoveredSlice === 'expense') {
                      return {
                        label: 'Expenses',
                        value: formatCurrency(monthlyStats.expense),
                        percent: formatPercentage(100 - incomePercent)
                      };
                    }
                    return {
                      label: 'Total',
                      value: formatCurrency(total),
                      percent: ''
                    };
                  };
                  
                  const centerText = getCenterText();
                  
                  return (
                    <>
                      {/* Income slice */}
                      <path
                        d={`M ${centerX} ${centerY} L ${centerX} ${centerY - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${incomeEndX} ${incomeEndY} Z`}
                        fill="var(--success)"
                        stroke="var(--surface)"
                        strokeWidth="2"
                        style={{ cursor: 'pointer', opacity: hoveredSlice === 'income' ? 0.8 : hoveredSlice ? 0.4 : 1, transition: 'opacity 0.2s' }}
                        onMouseEnter={() => setHoveredSlice('income')}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                      {/* Expenses slice */}
                      <path
                        d={`M ${centerX} ${centerY} L ${incomeEndX} ${incomeEndY} A ${radius} ${radius} 0 ${largeArcFlag === 1 ? 0 : 1} 1 ${centerX} ${centerY - radius} Z`}
                        fill="var(--danger)"
                        stroke="var(--surface)"
                        strokeWidth="2"
                        style={{ cursor: 'pointer', opacity: hoveredSlice === 'expense' ? 0.8 : hoveredSlice ? 0.4 : 1, transition: 'opacity 0.2s' }}
                        onMouseEnter={() => setHoveredSlice('expense')}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                      {/* Center circle for donut effect */}
                      <circle
                        cx={centerX}
                        cy={centerY}
                        r={60}
                        fill="var(--surface)"
                      />
                      {/* Center text */}
                      <text
                        x={centerX}
                        y={centerY - 10}
                        textAnchor="middle"
                        fontSize="14"
                        fontWeight="bold"
                        fill="var(--text)"
                      >
                        {centerText.label}
                      </text>
                      <text
                        x={centerX}
                        y={centerY + 15}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="bold"
                        fill={hoveredSlice === 'income' ? 'var(--success)' : hoveredSlice === 'expense' ? 'var(--danger)' : 'var(--text)'}
                      >
                        {centerText.value}
                      </text>
                      {centerText.percent && (
                        <text
                          x={centerX}
                          y={centerY + 35}
                          textAnchor="middle"
                          fontSize="12"
                          fill="var(--text-secondary)"
                        >
                          {centerText.percent}
                        </text>
                      )}
                    </>
                  );
                })()}
              </svg>
              <div className="pie-chart-legend">
                <div className="legend-item">
                  <div className="legend-dot income"></div>
                  <div className="legend-info">
                    <span className="legend-label">Income</span>
                    <span className="legend-value">{formatCurrency(monthlyStats.income)}</span>
                    <span className="legend-percent">{formatPercentage((monthlyStats.income / (monthlyStats.income + monthlyStats.expense)) * 100)}</span>
                  </div>
                </div>
                <div className="legend-item">
                  <div className="legend-dot expense"></div>
                  <div className="legend-info">
                    <span className="legend-label">Expenses</span>
                    <span className="legend-value">{formatCurrency(monthlyStats.expense)}</span>
                    <span className="legend-percent">{formatPercentage((monthlyStats.expense / (monthlyStats.income + monthlyStats.expense)) * 100)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spending Analysis */}
      <div className="analytics-grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Spending by Description</h3>
            <p className="card-subtitle">Top expense categories</p>
          </div>
          <div className="card-body">
            {spendingCategories.length > 0 ? (
              <div className="spending-list">
                {spendingCategories.map((cat, index) => (
                  <div key={index} className="spending-item">
                    <div className="spending-info">
                      <div className="spending-name">{cat.description}</div>
                      <div className="spending-bar">
                        <div 
                          className="spending-bar-fill" 
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="spending-amount">
                      <div className="spending-value">{formatCurrency(cat.amount)}</div>
                      <div className="spending-percent">{formatPercentage(cat.percentage)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                <p>No expense data available</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Income vs Expenses</h3>
            <p className="card-subtitle">Monthly comparison</p>
          </div>
          <div className="card-body">
            <div className="comparison-chart">
              <div className="comparison-bar income">
                <div className="comparison-label">Income</div>
                <div className="comparison-track">
                  <div 
                    className="comparison-fill" 
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="comparison-value">{formatCurrency(monthlyStats.income)}</div>
              </div>
              <div className="comparison-bar expense">
                <div className="comparison-label">Expenses</div>
                <div className="comparison-track">
                  <div 
                    className="comparison-fill" 
                    style={{ width: `${(monthlyStats.expense / monthlyStats.income) * 100}%` }}
                  />
                </div>
                <div className="comparison-value">{formatCurrency(monthlyStats.expense)}</div>
              </div>
              <div className="comparison-bar net">
                <div className="comparison-label">Net</div>
                <div className="comparison-track">
                  <div 
                    className={`comparison-fill ${netCashFlow >= 0 ? 'income' : 'expense'}`}
                    style={{ width: `${Math.abs((netCashFlow / monthlyStats.income)) * 100}%` }}
                  />
                </div>
                <div className={`comparison-value ${netCashFlow >= 0 ? 'income' : 'expense'}`}>
                  {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Activity</h3>
          <p className="card-subtitle">Latest transactions</p>
        </div>
        <div className="card-body">
          {transactions.length > 0 ? (
            <div className="transactions-table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((txn) => (
                    <tr key={txn.transactionId}>
                      <td>{txn.description}</td>
                      <td>
                        <span className={`badge ${txn.type.toLowerCase()}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td>{formatDate(txn.createdAt)}</td>
                      <td className={`text-right ${txn.type.toLowerCase()}`}>
                        {txn.type === 'INCOME' ? '+' : '-'}{formatCurrency(parseFloat(txn.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state compact">
              <p>No transactions available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
