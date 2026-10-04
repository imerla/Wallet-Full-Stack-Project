import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import type { CreateMoneyRequestDto } from '../types/moneyRequest';
import type { UserSearchResult } from '../types/user';
import UserSearch from '../components/UserSearch';

function MoneyRequest() {
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [formData, setFormData] = useState<Omit<CreateMoneyRequestDto, 'requested_from_email'>>({
    amount: 0,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedUser) {
      newErrors.recipient = 'Please select a recipient';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
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
    if (errors[name as keyof typeof formData]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const requestData: CreateMoneyRequestDto = {
        ...formData,
        requested_from_email: selectedUser!.email,
      };
      await api.post('/money-requests', requestData);
      setSuccess(true);
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
          setApiError('Failed to create money request. Please try again.');
        }
      } else {
        setApiError('Failed to create money request. Please try again.');
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
          <h1 className="page-title">Money Request Sent</h1>
          <p className="page-subtitle">Your request has been sent successfully</p>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <h3 className="empty-state-title">Request Sent</h3>
              <p className="empty-state-description">
                Your money request has been sent to the recipient. They will be notified and can accept or reject your request.
              </p>
            </div>
          </div>
          <div className="card-footer">
            <div className="flex gap-4">
              <Link to="/" className="btn btn-secondary" style={{ flex: 1 }}>
                Back to Dashboard
              </Link>
              <button
                onClick={() => setSuccess(false)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Request Another
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
        <h1 className="page-title">Request Money</h1>
        <p className="page-subtitle">Send a money request to another Wallet user</p>
      </div>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Request Details</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit} className="form">
            <UserSearch
              onUserSelect={setSelectedUser}
              selectedUser={selectedUser}
              onClearSelection={handleClearSelection}
              placeholder="Search user to request from"
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
              <label htmlFor="description" className="form-label">Description (Optional)</label>
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
            </div>

            {apiError && <div className="alert alert-error">{apiError}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
              {loading ? 'Sending Request...' : 'Send Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MoneyRequest;
