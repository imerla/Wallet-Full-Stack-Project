import { useState } from 'react';
import { api } from '../services/api';
import type { CheckoutResponse } from '../types/payment';

function TopUp() {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckoutResponse | null>(null);

  const validateAmount = (value: string): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!amount.trim()) {
      setError('Amount is required');
      return;
    }

    if (!validateAmount(amount)) {
      setError('Amount must be a positive number');
      return;
    }

    const numAmount = parseFloat(amount);
    if (numAmount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<CheckoutResponse>('/payments/checkout', {
        amount: numAmount,
      });
      setResult(response.data);
      setAmount('');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to create top-up payment');
        }
      } else {
        setError('Failed to create top-up payment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">Top Up Wallet</h1>
        <p className="page-subtitle">Add funds to your wallet securely</p>
      </div>
      {result ? (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Payment Created</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Transaction ID</label>
              <div className="form-input" style={{ background: 'var(--background)' }}>
                {result.transactionId}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Amount</label>
              <div className="form-input" style={{ background: 'var(--background)' }}>
                ${result.amount}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <div className={`alert ${result.status === 'COMPLETED' ? 'alert-success' : 'alert-warning'}`}>
                {result.status}
              </div>
            </div>
          </div>
          <div className="card-footer">
            <button onClick={() => setResult(null)} className="btn btn-primary btn-block">
              Create Another
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Top Up Amount</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="form">
              <div className="form-group">
                <label htmlFor="amount" className="form-label">Amount (USD)</label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                  className="form-input"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                />
                {error && <span className="form-error">{error}</span>}
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
                {loading ? 'Processing...' : 'Top Up'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TopUp;
