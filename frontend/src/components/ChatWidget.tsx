import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import type { ChatMessage } from '../types/chat';

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [widgetConversationId, setWidgetConversationId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    connected,
    conversations,
    messages,
    joinConversation,
    sendMessage,
    createConversation,
  } = useChat();
  
  const { userId } = useAuth();

  const widgetConversation = widgetConversationId 
    ? conversations.find(c => c._id === widgetConversationId)
    : conversations.find(c => c.status === 'OPEN');

  const handleCreateConversation = async () => {
    if (!subject.trim() || !description.trim()) return;
    
    setCreating(true);
    setCreateError(null);
    try {
      const newConversation = await createConversation(subject.trim(), description.trim());
      if (newConversation) {
        setWidgetConversationId(newConversation._id);
        await joinConversation(newConversation._id);
        setShowNewConversationForm(false);
        setSubject('');
        setDescription('');
      }
    } catch (err: any) {
      console.error('Failed to create conversation:', err);
      setCreateError(err?.response?.data?.message || err?.message || 'Failed to create conversation. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending || !connected || !widgetConversation) return;

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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isCurrentUser = (message: ChatMessage) => {
    return message.senderId === userId;
  };

  return (
    <div className="chat-widget">
      {isOpen && (
        <div className="chat-widget-window">
          <div className="chat-widget-header">
            <h3>Customer Service</h3>
            <div className="chat-widget-header-actions">
              {widgetConversation && (
                <button
                  className="chat-widget-new-btn"
                  onClick={() => setShowNewConversationForm(true)}
                  title="Start new conversation"
                >
                  +
                </button>
              )}
              <button 
                className="chat-widget-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="chat-widget-body">
            {showNewConversationForm ? (
              <div className="chat-widget-new-conversation-form">
                {createError && (
                  <div className="chat-widget-error">{createError}</div>
                )}
                <input
                  type="text"
                  className="chat-widget-input"
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="Name (e.g., Payment Issue)"
                  disabled={creating}
                />
                <textarea
                  className="chat-widget-textarea"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="Describe your problem..."
                  disabled={creating}
                  rows={3}
                />
                <div className="chat-widget-form-actions">
                  <button
                    className="chat-widget-cancel-btn"
                    onClick={() => {
                      setShowNewConversationForm(false);
                      setSubject('');
                      setDescription('');
                      setCreateError(null);
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    className="chat-widget-submit-btn"
                    onClick={handleCreateConversation}
                    disabled={!subject.trim() || !description.trim() || creating}
                  >
                    {creating ? 'Creating...' : 'Start Chat'}
                  </button>
                </div>
              </div>
            ) : !connected ? (
              <div className="chat-widget-loading">Connecting...</div>
            ) : !widgetConversation ? (
              <div className="chat-widget-message">
                <div className="chat-widget-avatar">CS</div>
                <div className="chat-widget-bubble">
                  <p>Hello! How can I help you today?</p>
                </div>
              </div>
            ) : widgetConversation.status === 'CLOSED' ? (
              <div className="chat-widget-message system">
                <div className="chat-widget-bubble">
                  <p>This conversation has been closed.</p>
                </div>
              </div>
            ) : messages.length === 0 && creating ? (
              <div className="chat-widget-loading">Waiting for support agent...</div>
            ) : messages.length === 0 ? (
              <>
                <div className="chat-widget-message system">
                  <div className="chat-widget-bubble">
                    <p>Support agent has joined the chat</p>
                  </div>
                </div>
                <div className="chat-widget-message">
                  <div className="chat-widget-avatar">CS</div>
                  <div className="chat-widget-bubble">
                    <p>Hello! I'm here to help with: {widgetConversation.name}</p>
                  </div>
                </div>
              </>
            ) : (
              messages.map((message) => (
                <div
                  key={message._id}
                  className={`chat-widget-message ${isCurrentUser(message) ? 'user' : 'support'}`}
                >
                  <div className={`chat-widget-avatar ${isCurrentUser(message) ? 'user-avatar' : ''}`}>
                    {isCurrentUser(message) ? 'U' : 'CS'}
                  </div>
                  <div className="chat-widget-bubble">
                    <p>{message.content}</p>
                    <span className="chat-widget-time">{formatTimestamp(message.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          {widgetConversation && !showNewConversationForm && widgetConversation.status !== 'CLOSED' && (
            <div className="chat-widget-footer">
              <div className="chat-widget-input-container">
                <input
                  type="text"
                  className="chat-widget-input"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  disabled={!connected || sending}
                />
                <button
                  className="chat-widget-send"
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() || !connected || sending}
                >
                  {sending ? '...' : '→'}
                </button>
              </div>
              <Link to="/chat" className="chat-widget-link">
                View Full History
              </Link>
            </div>
          )}
          {widgetConversation && widgetConversation.status === 'CLOSED' && !showNewConversationForm && (
            <div className="chat-widget-footer">
              <button
                className="chat-widget-link"
                onClick={() => setShowNewConversationForm(true)}
              >
                Start New Conversation
              </button>
            </div>
          )}
          {!widgetConversation && !showNewConversationForm && (
            <div className="chat-widget-footer">
              <button
                className="chat-widget-link"
                onClick={() => setShowNewConversationForm(true)}
              >
                Start New Conversation
              </button>
            </div>
          )}
        </div>
      )}
      <button
        className="chat-widget-bubble-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle chat"
        aria-expanded={isOpen}
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}

export default ChatWidget;
