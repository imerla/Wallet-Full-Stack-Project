import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { Wallet } from '../types/wallet';
import type { Transaction } from '../types/transaction';
import Skeleton from '../components/Skeleton';

function Home() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<{ income: number; expense: number; transactions: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState('');
  const [transactionsError, setTransactionsError] = useState('');
  const [statsError, setStatsError] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setWalletError('');
    setTransactionsError('');
    setStatsError('');

    try {
      const walletResponse = await api.get<Wallet>('/wallet');
      setWallet(walletResponse.data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setWalletError(error.response.data.message);
        } else {
          setWalletError('Failed to load wallet data');
        }
      } else {
        setWalletError('Failed to load wallet data');
      }
    }

    try {
      const transactionsResponse = await api.get<{ transactions: Transaction[] }>('/wallet/transactions?page=1&limit=5');
      setRecentTransactions(transactionsResponse.data.transactions);
    } catch {
      setTransactionsError('Failed to load recent transactions');
    }

    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const fromDate = firstDay.toISOString().split('T')[0];
      const toDate = lastDay.toISOString().split('T')[0];
      const statsResponse = await api.get<{ income: number; expense: number; transactions: number }>(
        `/wallet/transactions/stats?fromDate=${fromDate}&toDate=${toDate}`
      );
      setMonthlyStats(statsResponse.data);
    } catch {
      setStatsError('Failed to load monthly stats');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="home">
        <div className="welcome-section">
          <Skeleton variant="text" className="welcome-title" style={{ height: '32px', width: '200px' }} />
          <Skeleton variant="text" className="welcome-subtitle" style={{ height: '20px', width: '250px' }} />
        </div>
        
        <div className="balance-card">
          <div className="balance-label">Available Balance</div>
          <Skeleton variant="text" className="balance-amount" style={{ height: '48px', width: '200px' }} />
          <Skeleton variant="text" className="balance-id" style={{ height: '16px', width: '150px' }} />
        </div>

        <div className="recent-transactions">
          <h3>Recent Transactions</h3>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" style={{ height: '60px', width: '100%', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (walletError && !wallet) {
    return (
      <div className="home">
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome back</h1>
          <p className="welcome-subtitle">Here's your financial overview</p>
        </div>
        <div className="alert alert-error">
          {walletError}
          <button onClick={fetchData} className="btn btn-secondary btn-sm" style={{ marginLeft: 'var(--space-2)' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="welcome-section">
        <h1 className="welcome-title">{getGreeting()}, {wallet?.username || 'User'}</h1>
        <p className="welcome-subtitle">Here's your financial overview</p>
      </div>
      
      {wallet ? (
        <>
          <div className="balance-card">
            <div className="balance-label">Available Balance</div>
            <div className="balance-amount">${wallet.balance}</div>
            <div className="balance-id">Wallet ID: {wallet.id}</div>
          </div>

          <div className="monthly-report">
            <div className="section-header">
              <h3>This Month</h3>
              <Link to="/analytics" className="view-all-link">View details</Link>
            </div>
            {statsError ? (
              <button onClick={fetchData} className="btn btn-secondary btn-sm">Retry</button>
            ) : monthlyStats ? (
              <div className="kpi-grid">
                <div className="kpi-card">
                  <div className="kpi-icon income">💰</div>
                  <div className="kpi-content">
                    <div className="kpi-label">Income</div>
                    <div className="kpi-value income">${monthlyStats.income.toFixed(2)}</div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon expense">💸</div>
                  <div className="kpi-content">
                    <div className="kpi-label">Expenses</div>
                    <div className="kpi-value expense">${monthlyStats.expense.toFixed(2)}</div>
                  </div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-icon net">📈</div>
                  <div className="kpi-content">
                    <div className="kpi-label">Net Flow</div>
                    <div className={`kpi-value ${monthlyStats.income - monthlyStats.expense >= 0 ? 'income' : 'expense'}`}>
                      {monthlyStats.income - monthlyStats.expense >= 0 ? '+' : ''}${(monthlyStats.income - monthlyStats.expense).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state compact">
                <p>No data for this month</p>
              </div>
            )}
          </div>

          <div className="recent-transactions">
            <div className="section-header">
              <h3>Recent Transactions</h3>
              {transactionsError && <span className="error-text">{transactionsError}</span>}
              <Link to="/transactions" className="view-all-link">View all</Link>
            </div>
            {transactionsError ? (
              <button onClick={fetchData} className="btn btn-secondary btn-sm">Retry</button>
            ) : recentTransactions.length > 0 ? (
              <div className="recent-transactions-list">
                {recentTransactions.map((txn) => (
                  <div key={txn.transactionId} className="recent-transaction-item">
                    <div className="txn-info">
                      <div className="txn-counterparty">
                        {txn.type === 'INCOME' && txn.sender?.username ? `From: ${txn.sender.username}` : ''}
                        {txn.type === 'EXPENSE' && txn.receiver?.username ? `To: ${txn.receiver.username}` : ''}
                        {!txn.sender?.username && !txn.receiver?.username && txn.description}
                      </div>
                      <div className="txn-date">{new Date(txn.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className={`txn-amount ${txn.status === 'REJECTED' ? 'rejected' : txn.status === 'CANCELLED' ? 'cancelled' : txn.type.toLowerCase()}`}>
                      {txn.status === 'REJECTED' ? (
                        <span>${txn.amount} (Rejected)</span>
                      ) : txn.status === 'CANCELLED' ? (
                        <span>${txn.amount} (Cancelled)</span>
                      ) : (
                        <span>{txn.type === 'INCOME' ? '+' : '-'}${txn.amount}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state compact">
                <p>No recent transactions</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">�</div>
          <h3 className="empty-state-title">Wallet not found</h3>
          <p className="empty-state-description">Please contact support if this issue persists.</p>
        </div>
      )}
    </div>
  );
}

export default Home;
