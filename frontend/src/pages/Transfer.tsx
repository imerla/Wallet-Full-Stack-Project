import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { TransferRequest, TransferResponse } from '../types/wallet';
import type { UserSearchResult } from '../types/user';
import UserSearch from '../components/UserSearch';

function Transfer() {
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [formData, setFormData] = useState<TransferRequest>({
    amount: 0,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState<TransferResponse | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedUser) {
      newErrors.recipient = 'Please select a recipient';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? (parseFloat(value) || 0) : value,
    }));
    if (errors[name as keyof TransferRequest]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSuccess(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const transferData: TransferRequest = {
        ...formData,
        receiver_user_id: selectedUser?.id,
      };
      const response = await api.post<TransferResponse>('/wallet/transfer', transferData);
      setSuccess(response.data);
      setSelectedUser(null);
      setFormData({
        amount: 0,
        description: '',
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setApiError(error.response.data.message);
        } else {
          setApiError('Transfer failed. Please try again.');
        }
      } else {
        setApiError('Transfer failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedUser(null);
    setErrors((prev) => ({ ...prev, recipient: '' }));
  };

  if (success) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Transfer Successful</h1>
          <p className="page-subtitle">Your transfer has been completed</p>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Transfer Details</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Amount Transferred</label>
              <div className="form-input" style={{ background: 'var(--background)' }}>
                ${success.amount}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Your Transaction ID</label>
              <div className="form-input" style={{ background: 'var(--background)' }}>
                {success.senderTransactionId}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Recipient Transaction ID</label>
              <div className="form-input" style={{ background: 'var(--background)' }}>
                {success.receiverTransactionId}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Your New Balance</label>
              <div className="form-input" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontWeight: '600' }}>
                ${success.senderBalance}
              </div>
            </div>
          </div>
          <div className="card-footer">
            <div className="flex gap-4">
              <Link to="/" className="btn btn-secondary" style={{ flex: 1 }}>
                Back to Dashboard
              </Link>
              <button
                onClick={() => setSuccess(null)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Make Another Transfer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">Send Money</h1>
        <p className="page-subtitle">Transfer funds securely to another Wallet user</p>
      </div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Transfer Details</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="form">
            <UserSearch
              onUserSelect={setSelectedUser}
              selectedUser={selectedUser}
              onClearSelection={handleClearSelection}
              placeholder="Search recipient by name or email"
              disabled={loading}
            />
            {errors.recipient && <span className="form-error">{errors.recipient}</span>}

            <div className="form-group">
              <label htmlFor="amount" className="form-label">Amount (USD)</label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount || ''}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
                placeholder="0.00"
                step="0.01"
                min="0.01"
              />
              {errors.amount && <span className="form-error">{errors.amount}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">Description</label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                className="form-input"
                placeholder="What is this for?"
              />
              {errors.description && <span className="form-error">{errors.description}</span>}
            </div>

            {apiError && <div className="alert alert-error">{apiError}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
              {loading ? 'Transferring...' : 'Transfer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Transfer;
