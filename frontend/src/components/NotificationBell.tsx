import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../services/api';
import type { Notification } from '../types/notification';
import Skeleton from './Skeleton';

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isMountedRef = useRef(true);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      if (isMountedRef.current) {
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getNotifications();
      if (isMountedRef.current) {
        setNotifications(data);
        const count = await getUnreadCount();
        setUnreadCount(count);
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      if (isMountedRef.current) {
        const errorMessage = err?.response?.data?.message || err?.message || 'Unable to load notifications';
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    
    const fetchCount = async () => {
      if (isActive) {
        await fetchUnreadCount();
      }
    };
    
    fetchCount();
    const interval = setInterval(fetchCount, 10000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const toggleNotifications = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      fetchNotifications();
      fetchUnreadCount();
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      if (isMountedRef.current) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      if (isMountedRef.current) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDeleteNotification = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await deleteNotification(notificationId);
      if (isMountedRef.current) {
        const notification = notifications.find(n => n._id === notificationId);
        setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotifications();
      if (isMountedRef.current) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification._id);
    }

    const navigateToRoute = (type: string) => {
      switch (type) {
        case 'MONEY_RECEIVED':
        case 'MONEY_SENT':
        case 'TRANSFER_CANCELLED':
          navigate('/transactions');
          break;
        case 'MONEY_REQUEST_RECEIVED':
        case 'MONEY_REQUEST_ACCEPTED':
        case 'MONEY_REQUEST_REJECTED':
        case 'MONEY_REQUEST_CANCELLED':
          navigate('/request-money');
          break;
        case 'SUPPORT_MESSAGE':
          navigate('/chat');
          break;
        default:
          break;
      }
    };

    navigateToRoute(notification.type);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'MONEY_RECEIVED':
        return '↓';
      case 'MONEY_SENT':
        return '↑';
      case 'MONEY_REQUEST_RECEIVED':
        return '💰';
      case 'MONEY_REQUEST_ACCEPTED':
        return '✓';
      case 'MONEY_REQUEST_REJECTED':
        return '✕';
      case 'MONEY_REQUEST_CANCELLED':
        return '↩';
      case 'TRANSFER_CANCELLED':
        return '↩';
      case 'SUPPORT_MESSAGE':
        return '💬';
      case 'TOP_UP_SUCCESS':
        return '💵';
      case 'TOP_UP_REJECTED':
        return '✕';
      case 'TOP_UP_PENDING':
        return '⏳';
      default:
        return '🔔';
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const displayUnreadCount = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div className="notification-bell-container" ref={containerRef}>
      <button
        onClick={toggleNotifications}
        className="notification-bell"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        type="button"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{displayUnreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-header-actions">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="mark-all-read-btn"
                  type="button"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAllNotifications}
                  className="clear-all-btn"
                  type="button"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="notification-loading">
              {[1, 2, 3].map((i) => (
                <div key={i} className="notification-item">
                  <div className="notification-icon">
                    <Skeleton variant="circular" style={{ width: '40px', height: '40px' }} />
                  </div>
                  <div className="notification-content">
                    <Skeleton variant="text" style={{ height: '16px', width: '80%', marginBottom: '8px' }} />
                    <Skeleton variant="text" style={{ height: '14px', width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="notification-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button onClick={fetchNotifications} className="retry-btn" type="button">
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <span className="empty-icon">🔔</span>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatTime(notification.createdAt)}
                    </div>
                  </div>
                  <button
                    className="notification-delete-btn"
                    onClick={(e) => handleDeleteNotification(notification._id, e)}
                    type="button"
                    aria-label="Delete notification"
                  >
                    ✕
                  </button>
                  {!notification.read && <div className="unread-indicator" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
