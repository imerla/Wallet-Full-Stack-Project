import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { AdminUser } from '../types/admin';
import Skeleton from '../components/Skeleton';

function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await api.get<AdminUser[]>('/admin/users');
        setUsers(response.data);
        setFilteredUsers(response.data);
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const error = err as { response?: { data?: { message?: string } } };
          if (error.response?.data?.message) {
            setError(error.response.data.message);
          } else {
            setError('Failed to load users');
          }
        } else {
          setError('Failed to load users');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(
      user =>
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">View and manage registered users</p>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="form-group">
              <Skeleton variant="text" style={{ height: '16px', width: '100px', marginBottom: '8px' }} />
              <Skeleton variant="text" style={{ height: '40px', width: '100%' }} />
            </div>
            <Skeleton variant="text" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
            <Skeleton variant="text" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
            <Skeleton variant="text" style={{ height: '40px', width: '100%', marginBottom: '12px' }} />
            <Skeleton variant="text" style={{ height: '40px', width: '100%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <div className="page-header">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">View and manage registered users</p>
        </div>
        <div className="alert alert-error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">View and manage registered users</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Users ({filteredUsers.length})</h2>
        </div>
        <div className="card-body">
          <div className="form-group" style={{ marginBottom: 'var(--space-6)' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              placeholder="Search by username or email..."
            />
          </div>

          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>
              No users found
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: '600' }}>Username</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: '600' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: '600' }}>Role</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: '600' }}>Balance</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: '600' }}>Joined</th>
                    <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => setSelectedUser(user)}
                    >
                      <td style={{ padding: 'var(--space-3)' }}>{user.username}</td>
                      <td style={{ padding: 'var(--space-3)' }}>{user.email}</td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: user.role === 'ADMIN' ? 'var(--primary-bg)' : 'var(--background)',
                            color: user.role === 'ADMIN' ? 'var(--primary)' : 'var(--text-secondary)',
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>${user.balance}</td>
                      <td style={{ padding: 'var(--space-3)' }}>{formatDate(user.createdAt)}</td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser(user);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ margin: 0 }}>User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="btn btn-ghost"
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="form-input" style={{ background: 'var(--background)' }}>
                  {selectedUser.username}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div className="form-input" style={{ background: 'var(--background)' }}>
                  {selectedUser.email}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <div className="form-input" style={{ background: 'var(--background)' }}>
                  {selectedUser.role}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Wallet ID</label>
                <div className="form-input" style={{ background: 'var(--background)' }}>
                  {selectedUser.walletId || 'N/A'}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Balance</label>
                <div className="form-input" style={{ background: 'var(--success-bg)', color: 'var(--success)', fontWeight: '600' }}>
                  ${selectedUser.balance}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Joined Date</label>
                <div className="form-input" style={{ background: 'var(--background)' }}>
                  {formatDate(selectedUser.createdAt)}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                onClick={() => setSelectedUser(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
