import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { WebhookResponse } from '../types/payment';

interface TopUpRequest {
  _id: string;
  transactionId: string;
  amount: string;
  status: string;
  createdAt: string;
  rejectionReason?: string;
  userId?: {
    username: string;
    email: string;
  };
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function PaymentWebhook() {
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<WebhookResponse | null>(null);
  const [topUpRequests, setTopUpRequests] = useState<TopUpRequest[]>([]);
  const [loadingTopUps, setLoadingTopUps] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch top-up requests whenever dependencies change
  useEffect(() => {
    fetchTopUpRequests();
  }, [page, statusFilter, debouncedSearch]);

  const fetchTopUpRequests = async () => {
    setLoadingTopUps(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (statusFilter) params.append('status', statusFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const response = await api.get<{ topUps: TopUpRequest[]; pagination: PaginationState }>(
        `/payments/all-topups?${params.toString()}`
      );
      setTopUpRequests(response.data.topUps || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (err) {
      console.error('Failed to fetch top-up requests:', err);
    } finally {
      setLoadingTopUps(false);
    }
  };

  const handleWebhook = async (status: 'SUCCESS' | 'REJECTED') => {
    setError('');
    setResult(null);

    if (!transactionId.trim()) {
      setError('Transaction ID is required');
      return;
    }

    if (status === 'REJECTED' && !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<WebhookResponse>('/payments/webhook', {
        transaction_id: transactionId,
        status,
        rejection_reason: status === 'REJECTED' ? rejectionReason : undefined,
      });
      setResult(response.data);
      await fetchTopUpRequests();
      setRejectionReason('');
    } catch (err: unknown) {
      console.error('Webhook error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setError(apiError.response?.data?.message || 'Failed to process webhook');
      } else {
        setError('Failed to process webhook');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTopUp = (topUp: TopUpRequest) => {
    setTransactionId(topUp.transactionId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'var(--success)';
      case 'REJECTED':
        return 'var(--danger)';
      case 'CANCELLED':
        return 'var(--warning)';
      case 'PENDING':
      default:
        return 'var(--primary)';
    }
  };

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">Top-Up Management</h1>
        <p className="page-subtitle">Manage all top-up requests</p>
      </div>

      {/* Webhook Test Card */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-header">
          <h2 className="card-title">Webhook</h2>
        </div>
        <div className="card-body">
          <form onSubmit={(e) => e.preventDefault()} className="form">
            <div className="form-group">
              <label htmlFor="transactionId" className="form-label">
                Transaction ID
              </label>
              <input
                type="text"
                id="transactionId"
                name="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                disabled={loading}
                className="form-input"
                placeholder="Enter transaction ID from Top Up"
              />
            </div>

            <div className="form-group">
              <label htmlFor="rejectionReason" className="form-label">
                Rejection Reason
              </label>
              <input
                type="text"
                id="rejectionReason"
                name="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                disabled={loading}
                className="form-input"
                placeholder="Reason for rejection (required when rejecting)"
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="webhook-buttons" style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => handleWebhook('SUCCESS')}
                disabled={loading}
                className="btn webhook-success"
                style={{ flex: 1, minWidth: '120px' }}
              >
                {loading ? 'Processing...' : 'SUCCESS'}
              </button>
              <button
                type="button"
                onClick={() => handleWebhook('REJECTED')}
                disabled={loading}
                className="btn webhook-reject"
                style={{ flex: 1, minWidth: '120px' }}
              >
                {loading ? 'Processing...' : 'REJECTED'}
              </button>
            </div>
          </form>

          {result && (
            <div className="card" style={{ marginTop: 'var(--space-6)' }}>
              <div className="card-header">
                <h3 className="card-title">Webhook Result</h3>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Transaction ID</label>
                  <div className="form-input" style={{ background: 'var(--background)' }}>
                    {result.transactionId}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <div className={`alert ${result.status === 'COMPLETED' ? 'alert-success' : 'alert-warning'}`}>
                    {result.status}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <div className="form-input" style={{ background: 'var(--background)' }}>
                    ${result.amount}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <div className="form-input" style={{ background: 'var(--background)' }}>
                    {result.type}
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button
                  onClick={() => {
                    setResult(null);
                    setTransactionId('');
                  }}
                  className="btn btn-secondary btn-block"
                >
                  Test Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Up Requests List Card */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">All Top-Up Requests</h2>
        </div>
        <div className="card-body">
          <div className="filters-container" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="filter-group" style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Search by User or Transaction ID"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="form-input"
                style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
              />
            </div>
            <div className="filter-group" style={{ flex: 1 }}>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="form-select"
                style={{ width: '100%', height: '42px', padding: '0 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {loadingTopUps ? (
            <div className="text-secondary">Loading...</div>
          ) : topUpRequests.length === 0 ? (
            <div className="empty-state compact">
              <p>No top-up requests found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {topUpRequests.map((topUp) => (
                <div
                  key={topUp._id}
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onClick={() => handleSelectTopUp(topUp)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--background)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-md)' }}>
                        {topUp.userId?.username || 'Unknown User'}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                        {topUp.userId?.email}
                      </div>
                      {topUp.rejectionReason && (
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--danger)', marginTop: 'var(--space-2)' }}>
                          Rejected: {topUp.rejectionReason}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'var(--font-weight-semibold)', color: getStatusColor(topUp.status), fontSize: 'var(--font-size-lg)' }}>
                        ${topUp.amount}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
                        {topUp.transactionId}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: getStatusColor(topUp.status), marginTop: 'var(--space-1)' }}>
                        {topUp.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="pagination" style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: 'var(--font-size-sm)' }}>
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentWebhook;
