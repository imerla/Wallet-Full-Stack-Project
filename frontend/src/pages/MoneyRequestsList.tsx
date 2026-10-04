import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { MoneyRequest } from '../types/moneyRequest';
import Skeleton from '../components/Skeleton';

function MoneyRequestsList() {
  const [incoming, setIncoming] = useState<MoneyRequest[]>([]);
  const [outgoing, setOutgoing] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: 'accept' | 'reject' | 'cancel'; request: MoneyRequest } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        api.get<MoneyRequest[]>('/money-requests/incoming'),
        api.get<MoneyRequest[]>('/money-requests/outgoing'),
      ]);
      setIncoming(incomingRes.data);
      setOutgoing(outgoingRes.data);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to load money requests');
        }
      } else {
        setError('Failed to load money requests');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    setRespondingId(requestId);
    try {
      await api.patch(`/money-requests/${requestId}/respond`, { action: action.toUpperCase() });
      await fetchRequests();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to respond to request');
        }
      } else {
        setError('Failed to respond to request');
      }
    } finally {
      setRespondingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setCancellingId(requestId);
    try {
      await api.delete(`/money-requests/${requestId}`);
      await fetchRequests();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to cancel request');
        }
      } else {
        setError('Failed to cancel request');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleConfirmAction = (type: 'accept' | 'reject' | 'cancel', request: MoneyRequest) => {
    setConfirmAction({ type, request });
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setShowConfirm(false);
    
    if (confirmAction.type === 'cancel') {
      await handleCancel(confirmAction.request.id);
    } else {
      await handleRespond(confirmAction.request.id, confirmAction.type);
    }
    setConfirmAction(null);
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    setConfirmAction(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Money Requests</h1>
          <p className="page-subtitle">View and manage your money requests</p>
        </div>
        <div className="card">
          <div className="card-body">
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                <Skeleton variant="text" style={{ height: '20px', width: '60%', marginBottom: '8px' }} />
                <Skeleton variant="text" style={{ height: '16px', width: '40%' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Money Requests</h1>
          <p className="page-subtitle">View and manage your money requests</p>
        </div>
        <div className="alert alert-error">
          {error}
          <button onClick={fetchRequests} className="btn btn-secondary btn-sm" style={{ marginLeft: 'var(--space-2)' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentList = activeTab === 'incoming' ? incoming : outgoing;
  const isEmpty = currentList.length === 0;

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">Money Requests</h1>
        <p className="page-subtitle">View and manage your money requests</p>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`btn ${activeTab === 'incoming' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Incoming ({incoming.length})
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`btn ${activeTab === 'outgoing' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Outgoing ({outgoing.length})
            </button>
          </div>
        </div>
        <div className="card-body">
          {isEmpty ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <h3 className="empty-state-title">
                {activeTab === 'incoming' ? 'No incoming requests' : 'No outgoing requests'}
              </h3>
              <p className="empty-state-description">
                {activeTab === 'incoming'
                  ? 'You have no pending money requests from other users.'
                  : 'You have not sent any money requests.'}
              </p>
            </div>
          ) : (
            <div className="money-requests-list">
              {currentList.map((request) => (
                <div key={request.id} className="money-request-item">
                  <div className="money-request-info">
                    <div className="money-request-amount">${request.amount}</div>
                    <div className="money-request-description">{request.description || 'No description'}</div>
                    <div className="money-request-date">{formatDate(request.createdAt)}</div>
                  </div>
                  <div className="money-request-status">
                    <span className={`status-badge ${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="money-request-actions">
                    {activeTab === 'incoming' && request.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleConfirmAction('accept', request)}
                          disabled={respondingId === request.id}
                          className="btn btn-primary btn-sm"
                        >
                          {respondingId === request.id ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleConfirmAction('reject', request)}
                          disabled={respondingId === request.id}
                          className="btn btn-secondary btn-sm"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {activeTab === 'outgoing' && request.status === 'PENDING' && (
                      <button
                        onClick={() => handleConfirmAction('cancel', request)}
                        disabled={cancellingId === request.id}
                        className="btn btn-secondary btn-sm"
                      >
                        {cancellingId === request.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showConfirm && confirmAction && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>
              {confirmAction.type === 'accept' && 'Accept Request?'}
              {confirmAction.type === 'reject' && 'Reject Request?'}
              {confirmAction.type === 'cancel' && 'Cancel Request?'}
            </h2>
            <p>
              {confirmAction.type === 'accept' &&
                `Accepting this request will transfer $${confirmAction.request.amount} from your wallet.`}
              {confirmAction.type === 'reject' &&
                'Are you sure you want to reject this money request?'}
              {confirmAction.type === 'cancel' &&
                'Are you sure you want to cancel this money request?'}
            </p>
            <div className="modal-actions">
              <button onClick={handleCancelConfirm} className="btn btn-secondary">
                {confirmAction.type === 'accept' ? 'Keep' : 'Keep Request'}
              </button>
              <button onClick={handleConfirm} className="btn btn-primary">
                {confirmAction.type === 'accept' ? 'Accept' : confirmAction.type === 'reject' ? 'Reject' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MoneyRequestsList;
