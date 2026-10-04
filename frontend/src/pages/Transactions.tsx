import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import type { TransactionsResponse, Transaction } from '../types/transaction';
import { useDebounce } from '../hooks/useDebounce';

function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  const buildQueryParams = useCallback((): string => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', '10');

    if (typeFilter) {
      params.append('type', typeFilter);
    }

    if (statusFilter) {
      params.append('status', statusFilter);
    }

    if (fromDate) {
      params.append('from', fromDate);
    }

    if (toDate) {
      params.append('to', toDate);
    }

    if (debouncedSearchQuery) {
      params.append('search', debouncedSearchQuery);
    }

    return params.toString();
  }, [page, typeFilter, statusFilter, fromDate, toDate, debouncedSearchQuery]);

  const fetchTransactions = useCallback(async () => {
    const wasSearchFocused = searchInputRef.current === document.activeElement;
    setIsTableLoading(true);
    try {
      const queryParams = buildQueryParams();
      const response = await api.get<TransactionsResponse>(`/wallet/transactions?${queryParams}`);
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to load transactions');
        }
      } else {
        setError('Failed to load transactions');
      }
    } finally {
      setIsTableLoading(false);
      if (wasSearchFocused && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
    }
  }, [buildQueryParams]);

  useEffect(() => {
    fetchTransactions(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [page, typeFilter, statusFilter, fromDate, toDate, debouncedSearchQuery]);

  const handlePrevious = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNext = () => {
    if (page < pagination.totalPages) {
      setPage(page + 1);
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromDate(e.target.value);
    setPage(1);
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToDate(e.target.value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleExport = async () => {
    setExportError('');
    setExporting(true);

    try {
      const response = await api.get('/wallet/transactions/export', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'wallet-transactions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setExportError('Failed to export transactions. Please try again.');
    } finally {
      setExporting(false);
    }
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

  const canCancelTransaction = (txn: Transaction): boolean => {
    if (txn.status !== 'COMPLETED') return false;
    if (!txn.cancellableUntil) return false;
    const now = new Date();
    const cancelUntil = new Date(txn.cancellableUntil);
    return now < cancelUntil;
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedTransaction) return;

    setShowCancelConfirm(false);
    setCancellingId(selectedTransaction.transactionId);

    try {
      await api.post(`/payments/transactions/${selectedTransaction.transactionId}/cancel`);
      await fetchTransactions();
      handleCloseDetails();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { message?: string } } };
        if (error.response?.data?.message) {
          setError(error.response.data.message);
        } else {
          setError('Failed to cancel transaction');
        }
      } else {
        setError('Failed to cancel transaction');
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelCancel = () => {
    setShowCancelConfirm(false);
  };

  const handleViewDetails = (txn: Transaction) => {
    setSelectedTransaction(txn);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedTransaction(null);
  };


  if (error) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">View your transaction history</p>
        </div>
        <div className="alert alert-error">
          {error}
          <button onClick={fetchTransactions} className="btn btn-secondary btn-sm" style={{ marginLeft: 'var(--space-2)' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">Transactions</h1>
        <p className="page-subtitle">View your transaction history</p>
      </div>
      
      <div className="filters-container">
        <div className="filter-group" style={{ width: '100%' }}>
          <label htmlFor="searchQuery">Search</label>
          <input
            ref={searchInputRef}
            type="text"
            id="searchQuery"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by Transaction ID, Username or Email"
            className="filter-input"
            style={{ width: '100%' }}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="typeFilter">Type</label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={handleTypeChange}
            className="filter-select"
          >
            <option value="">All</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="statusFilter">Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={handleStatusChange}
            className="filter-select"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="fromDate">From</label>
          <input
            type="date"
            id="fromDate"
            value={fromDate}
            onChange={handleFromDateChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="toDate">To</label>
          <input
            type="date"
            id="toDate"
            value={toDate}
            onChange={handleToDateChange}
            className="filter-input"
          />
        </div>

        <button onClick={handleClearFilters} className="btn btn-secondary btn-sm">
          Clear Filters
        </button>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="btn btn-secondary btn-sm"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {exportError && <div className="alert alert-error">{exportError}</div>}

      {isTableLoading ? (
        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>From</th>
                <th>To</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td><div className="skeleton" style={{ height: '20px', width: '100px' }} /></td>
                  <td><div className="skeleton" style={{ height: '20px', width: '120px' }} /></td>
                  <td><div className="skeleton" style={{ height: '20px', width: '100px' }} /></td>
                  <td><div className="skeleton" style={{ height: '20px', width: '100px' }} /></td>
                  <td><div className="skeleton" style={{ height: '20px', width: '80px' }} /></td>
                  <td><div className="skeleton" style={{ height: '20px', width: '80px' }} /></td>
                  <td><div className="skeleton" style={{ height: '20px', width: '80px' }} /></td>
                  <td><div className="skeleton" style={{ height: '20px', width: '150px' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">
            {typeFilter || fromDate || toDate || searchQuery ? 'No transactions match your filters' : 'No transactions yet'}
          </h3>
          <p className="empty-state-description">
            {typeFilter || fromDate || toDate || searchQuery
              ? 'Try adjusting your filters or clearing them to see more transactions.'
              : 'Your transactions will appear here after you send or receive money.'}
          </p>
        </div>
      ) : (
        <>
          <div className="transactions-table-container">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Transaction ID</th>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr
                    key={txn.transactionId}
                    onClick={() => handleViewDetails(txn)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-sm)' }}>{txn.transactionId}</td>
                    <td>{formatDate(txn.createdAt)}</td>
                    <td>{txn.sender?.username || '-'}</td>
                    <td>{txn.receiver?.username || '-'}</td>
                    <td>
                      <span
                        className={`transaction-type ${txn.type}`}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td className="transaction-amount">
                      {txn.status === 'REJECTED' ? (
                        <span style={{ color: 'var(--danger)' }}>
                          ${txn.amount} (Rejected)
                        </span>
                      ) : txn.status === 'CANCELLED' ? (
                        <span style={{ color: 'var(--text-tertiary)' }}>
                          ${txn.amount} (Cancelled)
                        </span>
                      ) : (
                        <span>
                          {txn.type === 'INCOME' ? '+' : '-'}${txn.amount}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`transaction-status ${txn.status}`}
                      >
                        {txn.status}
                      </span>
                    </td>
                    <td>
                      {txn.description}
                      {txn.status === 'REJECTED' && txn.rejectionReason && (
                        <div style={{ marginTop: 'var(--space-1)', fontSize: 'var(--font-size-xs)', color: 'var(--danger)' }}>
                          Reason: {txn.rejectionReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-container">
            <button
              onClick={handlePrevious}
              disabled={page === 1}
              className="btn btn-secondary btn-sm"
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={page === pagination.totalPages}
              className="btn btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        </>
      )}

      {showDetailsModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <h2>Transaction Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Transaction ID:</div>
              <div style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>{selectedTransaction.transactionId}</div>

              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Date:</div>
              <div>{formatDate(selectedTransaction.createdAt)}</div>

              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Type:</div>
              <div>
                <span className={`transaction-type ${selectedTransaction.type}`}>
                  {selectedTransaction.type}
                </span>
              </div>

              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Amount:</div>
              <div className="transaction-amount">
                {selectedTransaction.status === 'REJECTED' ? (
                  <span style={{ color: 'var(--danger)' }}>
                    ${selectedTransaction.amount} (Rejected)
                  </span>
                ) : selectedTransaction.status === 'CANCELLED' ? (
                  <span style={{ color: 'var(--text-tertiary)' }}>
                    ${selectedTransaction.amount} (Cancelled)
                  </span>
                ) : (
                  <span>
                    {selectedTransaction.type === 'INCOME' ? '+' : '-'}${selectedTransaction.amount}
                  </span>
                )}
              </div>

              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Status:</div>
              <div>
                <span className={`transaction-status ${selectedTransaction.status}`}>
                  {selectedTransaction.status}
                </span>
              </div>

              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>From:</div>
              <div>{selectedTransaction.sender?.username || selectedTransaction.sender?.email || '-'}</div>

              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>To:</div>
              <div>{selectedTransaction.receiver?.username || selectedTransaction.receiver?.email || '-'}</div>

              <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Description:</div>
              <div>{selectedTransaction.description || '-'}</div>

              {selectedTransaction.status === 'REJECTED' && selectedTransaction.rejectionReason && (
                <>
                  <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Rejection Reason:</div>
                  <div style={{ color: 'var(--danger)' }}>{selectedTransaction.rejectionReason}</div>
                </>
              )}

              {selectedTransaction.cancellableUntil && (
                <>
                  <div style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>Cancellable Until:</div>
                  <div>{formatDate(selectedTransaction.cancellableUntil)}</div>
                </>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: 'var(--space-6)' }}>
              {canCancelTransaction(selectedTransaction) && (
                <button
                  onClick={handleCancelClick}
                  disabled={cancellingId === selectedTransaction.transactionId}
                  className="btn btn-secondary"
                >
                  Cancel Transaction
                </button>
              )}
              <button onClick={handleCloseDetails} className="btn btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelConfirm && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Cancel Transaction?</h2>
            <p>You are about to cancel this transfer of ${selectedTransaction.amount}</p>
            <p><strong>From:</strong> {selectedTransaction.sender?.username || selectedTransaction.sender?.email || '-'}</p>
            <p><strong>To:</strong> {selectedTransaction.receiver?.username || selectedTransaction.receiver?.email || '-'}</p>
            <p>This action will reverse the transfer.</p>
            <div className="modal-actions">
              <button onClick={handleCancelCancel} className="btn btn-secondary">
                Keep Transfer
              </button>
              <button onClick={handleCancelConfirm} className="btn btn-primary">
                Cancel Transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;
