import { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { getAdminAvailability, updateAdminAvailability } from '../services/api';
import type { ChatMessage } from '../types/chat';

export default function Chat() {
  const {
    connected,
    connecting,
    conversations,
    currentConversation,
    messages,
    error,
    joinConversation,
    leaveConversation,
    sendMessage,
    createConversation,
    loadConversations,
    closeConversation,
  } = useChat();
  const { token, userId, role } = useAuth();
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadConvos = async () => {
      if (isActive) {
        setLoadingConversations(true);
        await loadConversations();
        if (isActive) {
          setLoadingConversations(false);
        }
      }
    };

    if (token) {
      loadConvos();
    }

    return () => {
      isActive = false;
    };
  }, [token, loadConversations]);

  useEffect(() => {
    if (role === 'ADMIN' && token) {
      const fetchAvailability = async () => {
        try {
          setLoadingAvailability(true);
          const data = await getAdminAvailability();
          setIsAvailable(data.isOnline);
        } catch (err) {
          console.error('Failed to fetch availability:', err);
        } finally {
          setLoadingAvailability(false);
        }
      };
      fetchAvailability();
    }
  }, [role, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending || !connected) return;

    setSending(true);
    try {
      await sendMessage(messageInput.trim());
      setMessageInput('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const newConversation = await createConversation('General Support', 'I need help with my account');
      if (newConversation) {
        await joinConversation(newConversation._id);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
      // The error is already set in the context, so we don't need to do anything here
    }
  };

  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const [newConvName, setNewConvName] = useState('');
  const [newConvDescription, setNewConvDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateNewConversation = async () => {
    if (!newConvName.trim() || !newConvDescription.trim()) return;

    setCreating(true);
    try {
      const newConversation = await createConversation(newConvName.trim(), newConvDescription.trim());
      if (newConversation) {
        await joinConversation(newConversation._id);
        setShowNewConversationForm(false);
        setNewConvName('');
        setNewConvDescription('');
        setShowChatOnMobile(true);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCloseConversation = async () => {
    if (currentConversation) {
      await closeConversation(currentConversation._id);
    }
  };

  const handleToggleAvailability = async () => {
    try {
      setLoadingAvailability(true);
      await updateAdminAvailability(!isAvailable);
      setIsAvailable(!isAvailable);
    } catch (err) {
      console.error('Failed to update availability:', err);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isCurrentUser = (message: ChatMessage) => {
    return message.senderId === userId;
  };

  const getStatusColor = (status: string) => {
    return status === 'OPEN' ? 'conversation-status-open' : 'conversation-status-closed';
  };

  const getConnectionStatus = () => {
    if (connecting) return 'Connecting...';
    if (connected) return 'Connected';
    return 'Disconnected';
  };

  const getConnectionStatusColor = () => {
    if (connecting) return 'connection-status-connecting';
    if (connected) return 'connection-status-connected';
    return 'connection-status-disconnected';
  };

  return (
    <div className="chat-container">
      <div className="chat-layout">
        <div className={`chat-sidebar ${showChatOnMobile ? 'mobile-hidden' : ''}`}>
          <div className="chat-sidebar-header">
            <h2 className="chat-title">
              {role === 'ADMIN' ? 'Support Chats' : 'Support'}
            </h2>
            <div className="chat-sidebar-status">
              <div className={`connection-status ${getConnectionStatusColor()}`}>
                {getConnectionStatus()}
              </div>
              {role === 'ADMIN' && (
                <button
                  className={`availability-toggle ${isAvailable ? 'available' : 'unavailable'}`}
                  onClick={handleToggleAvailability}
                  disabled={loadingAvailability}
                  aria-label={isAvailable ? 'Set unavailable' : 'Set available'}
                  type="button"
                >
                  {loadingAvailability ? '...' : isAvailable ? 'Available' : 'Unavailable'}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="chat-error-banner">
              {error}
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {role === 'USER' && !showNewConversationForm && conversations.length === 0 && (
            <button
              className="contact-support-btn"
              onClick={handleCreateConversation}
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Contact Support'}
            </button>
          )}

          {role === 'USER' && !showNewConversationForm && conversations.length > 0 && (
            <button
              className="contact-support-btn"
              onClick={() => setShowNewConversationForm(true)}
              disabled={connecting}
            >
              Start New Conversation
            </button>
          )}

          {showNewConversationForm && (
            <div className="new-conversation-form">
              <input
                type="text"
                className="new-conversation-input"
                value={newConvName}
                onChange={(e) => setNewConvName(e.target.value)}
                placeholder="Name (e.g., Payment Issue)"
                disabled={creating}
              />
              <textarea
                className="new-conversation-textarea"
                value={newConvDescription}
                onChange={(e) => setNewConvDescription(e.target.value)}
                placeholder="Describe your problem..."
                disabled={creating}
                rows={3}
              />
              <div className="new-conversation-actions">
                <button
                  className="new-conversation-cancel"
                  onClick={() => {
                    setShowNewConversationForm(false);
                    setNewConvName('');
                    setNewConvDescription('');
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  className="new-conversation-submit"
                  onClick={handleCreateNewConversation}
                  disabled={!newConvName.trim() || !newConvDescription.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Start Chat'}
                </button>
              </div>
            </div>
          )}

          <div className="conversation-list">
            {loadingConversations ? (
              <div className="chat-skeleton">
                <div className="chat-skeleton-item" />
                <div className="chat-skeleton-item" />
                <div className="chat-skeleton-item" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-conversations">
                {role === 'USER' 
                  ? 'No support conversations yet. Click "Contact Support" to start.'
                  : 'No assigned conversations.'
                }
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv._id}
                  className={`conversation-item ${
                    currentConversation?._id === conv._id ? 'active' : ''
                  }`}
                  onClick={() => {
                    joinConversation(conv._id);
                    setShowChatOnMobile(true);
                  }}
                >
                  <div className="conversation-info">
                    <span className="conversation-id">
                      {role === 'USER' ? `Support #${conv._id.slice(-6)}` : `User #${conv.userId.slice(-6)}`}
                    </span>
                    <span className={`conversation-status ${getStatusColor(conv.status)}`}>
                      {conv.status}
                    </span>
                  </div>
                  <div className="conversation-subject">
                    {conv.name}
                  </div>
                  <div className="conversation-time">
                    {formatTimestamp(conv.updatedAt)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={`chat-main ${showChatOnMobile ? 'mobile-visible' : ''}`}>
          {!currentConversation ? (
            <div className="no-conversation-selected">
              <div className="no-conversation-icon">💬</div>
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                {showChatOnMobile && (
                  <button
                    className="back-to-list-btn"
                    onClick={() => setShowChatOnMobile(false)}
                    type="button"
                  >
                    ← Back
                  </button>
                )}
                <div className="chat-header-info">
                  <h3>
                    {role === 'USER' 
                      ? `Support #${currentConversation._id.slice(-6)}`
                      : `User #${currentConversation.userId.slice(-6)}`
                    }
                  </h3>
                  <span className={`chat-status ${getStatusColor(currentConversation.status)}`}>
                    {currentConversation.status}
                  </span>
                </div>
                <div className="chat-header-actions">
                  {currentConversation.status === 'OPEN' && (
                    <button
                      className="close-conversation-btn"
                      onClick={handleCloseConversation}
                    >
                      Close Conversation
                    </button>
                  )}
                  <button className="leave-conversation-btn" onClick={leaveConversation}>
                    Leave
                  </button>
                </div>
              </div>

              <div className="chat-conversation-details">
                <div className="conversation-detail-item">
                  <span className="conversation-detail-label">Name:</span>
                  <span className="conversation-detail-value">{currentConversation.name}</span>
                </div>
                <div className="conversation-detail-item">
                  <span className="conversation-detail-label">Description:</span>
                  <span className="conversation-detail-value">{currentConversation.description}</span>
                </div>
              </div>

              {currentConversation.status === 'CLOSED' && (
                <div className="conversation-closed-banner">
                  This conversation has been closed.
                </div>
              )}

              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    {currentConversation.status === 'OPEN'
                      ? 'Start the conversation by sending a message!'
                      : 'This conversation has been closed.'}
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <div
                        key={message._id}
                        className={`message ${isCurrentUser(message) ? 'current-user' : 'other-user'}`}
                      >
                        <div className="message-content">
                          <div className="message-text">{message.content}</div>
                          <div className="message-meta">
                            <span className="message-role">{message.senderRole}</span>
                            <span className="message-time">{formatTimestamp(message.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              <div className="message-input-container">
                <textarea
                  className="message-input"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    currentConversation.status === 'CLOSED'
                      ? 'Conversation is closed'
                      : 'Type your message...'
                  }
                  disabled={currentConversation.status === 'CLOSED' || sending || !connected}
                  rows={1}
                />
                <button
                  className="send-message-btn"
                  onClick={handleSendMessage}
                  disabled={
                    !messageInput.trim() ||
                    sending ||
                    currentConversation.status === 'CLOSED' ||
                    !connected
                  }
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
