import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Socket } from 'socket.io-client';
import { api } from '../services/api';
import { getSocket, disconnectSocket } from '../services/socket';
import { useAuth } from './AuthContext';
import type {
  ChatMessage,
  Conversation,
  ChatError,
  ConversationClosedPayload,
} from '../types/chat';

interface ChatContextType {
  connected: boolean;
  connecting: boolean;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  error: string | null;
  joinConversation: (conversationId: string) => Promise<void>;
  leaveConversation: () => void;
  sendMessage: (content: string) => Promise<void>;
  createConversation: (name: string, description: string) => Promise<Conversation | null>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  closeConversation: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: unknown }).response === 'object'
  ) {
    const data = (err as { response: { data?: { message?: string } } })
      .response.data;
    if (data?.message) {
      return data.message;
    }
  }
  return fallback;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const currentConversationRef = useRef<Conversation | null>(null);
  const joinedConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        disconnectSocket();
        socketRef.current = null;
      }
      setConnected(false);
      setConnecting(false);
      setCurrentConversation(null);
      setMessages([]);
      joinedConversationIdRef.current = null;
      return;
    }

    setConnecting(true);
    let activeSocket: Socket;
    try {
      activeSocket = getSocket(token);
    } catch {
      setConnecting(false);
      setError('Failed to connect to chat server.');
      return;
    }
    socketRef.current = activeSocket;

    const rejoinCurrentRoom = () => {
      const conversationId =
        joinedConversationIdRef.current ??
        currentConversationRef.current?._id;
      if (conversationId) {
        activeSocket.emit('joinConversation', { conversationId });
        joinedConversationIdRef.current = conversationId;
      }
    };

    const onConnect = () => {
      setConnected(true);
      setConnecting(false);
      setError(null);
      rejoinCurrentRoom();
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onConnectError = () => {
      setConnected(false);
      setConnecting(false);
      setError('Connection failed. Please try again.');
    };

    const onChatError = (chatError: ChatError) => {
      setError(chatError.message);
    };

    const onNewMessage = (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });
    };

    const onConversationClosed = (payload: ConversationClosedPayload) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === payload.conversationId
            ? { ...conv, status: 'CLOSED', closedAt: payload.closedAt }
            : conv,
        ),
      );
      if (currentConversationRef.current?._id === payload.conversationId) {
        setCurrentConversation((prev) =>
          prev
            ? { ...prev, status: 'CLOSED', closedAt: payload.closedAt }
            : null,
        );
      }
    };

    activeSocket.off('connect').on('connect', onConnect);
    activeSocket.off('disconnect').on('disconnect', onDisconnect);
    activeSocket.off('connect_error').on('connect_error', onConnectError);
    activeSocket.off('chatError').on('chatError', onChatError);
    activeSocket.off('newMessage').on('newMessage', onNewMessage);
    activeSocket
      .off('conversationClosed')
      .on('conversationClosed', onConversationClosed);

    if (activeSocket.connected) {
      onConnect();
    }

    return () => {
      activeSocket.off('connect', onConnect);
      activeSocket.off('disconnect', onDisconnect);
      activeSocket.off('connect_error', onConnectError);
      activeSocket.off('chatError', onChatError);
      activeSocket.off('newMessage', onNewMessage);
      activeSocket.off('conversationClosed', onConversationClosed);
      activeSocket.removeAllListeners();
      disconnectSocket();
      socketRef.current = null;
      joinedConversationIdRef.current = null;
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !currentConversation) {
      return;
    }

    const newId = currentConversation._id;
    const previousId = joinedConversationIdRef.current;

    if (previousId === newId) {
      return;
    }

    if (previousId) {
      socket.emit('leaveConversation', { conversationId: previousId });
    }

    socket.emit('joinConversation', { conversationId: newId });
    joinedConversationIdRef.current = newId;
  }, [connected, currentConversation?._id]);

  const loadConversations = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load conversations.'));
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setError(null);
      const response = await api.get(
        `/chat/conversations/${conversationId}/messages`,
      );
      setMessages(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load messages.'));
    }
  }, []);

  const joinConversation = useCallback(
    async (conversationId: string) => {
      if (!socketRef.current || !connected) {
        setError('Not connected to chat server.');
        return;
      }

      try {
        setError(null);
        let conversation = conversations.find((c) => c._id === conversationId);
        
        // If conversation not found in list, fetch it directly
        if (!conversation) {
          const response = await api.get(`/chat/conversations/${conversationId}`);
          conversation = response.data;
          setConversations((prev) => {
            const exists = prev.some(c => c._id === conversationId);
            if (!exists && conversation) {
              return [conversation, ...prev];
            }
            return prev;
          });
        }

        if (conversation) {
          setCurrentConversation(conversation);
        }
        await loadMessages(conversationId);
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to join conversation.'));
      }
    },
    [connected, conversations, loadMessages],
  );

  const leaveConversation = useCallback(() => {
    const socket = socketRef.current;
    const joinedId = joinedConversationIdRef.current;
    if (socket && joinedId) {
      socket.emit('leaveConversation', { conversationId: joinedId });
      joinedConversationIdRef.current = null;
    }
    setCurrentConversation(null);
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      const socket = socketRef.current;
      if (!socket || !connected || !currentConversation) {
        setError('Not connected to conversation.');
        return;
      }

      if (currentConversation.status === 'CLOSED') {
        setError('This conversation has been closed.');
        return;
      }

      try {
        setError(null);
        socket.emit('sendMessage', {
          conversationId: currentConversation._id,
          content,
        });
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to send message.'));
      }
    },
    [connected, currentConversation],
  );

  const createConversation = useCallback(
    async (name: string, description: string) => {
      try {
        setError(null);
        const response = await api.post('/chat/conversations', {
          name,
          description,
        });
        const newConversation = response.data;
        setConversations((prev) => [newConversation, ...prev]);
        return newConversation;
      } catch (err: unknown) {
        const errorMessage = getApiErrorMessage(
          err,
          'Failed to create conversation.',
        );
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [],
  );

  const closeConversation = useCallback(
    async (conversationId: string) => {
      try {
        setError(null);
        await api.patch(`/chat/conversations/${conversationId}/close`);
        setConversations((prev) =>
          prev.map((conv) =>
            conv._id === conversationId
              ? { ...conv, status: 'CLOSED', closedAt: new Date().toISOString() }
              : conv,
          ),
        );
        if (currentConversationRef.current?._id === conversationId) {
          setCurrentConversation((prev) =>
            prev
              ? { ...prev, status: 'CLOSED', closedAt: new Date().toISOString() }
              : null,
          );
        }
      } catch (err: unknown) {
        setError(getApiErrorMessage(err, 'Failed to close conversation.'));
      }
    },
    [],
  );

  const value: ChatContextType = {
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
    loadMessages,
    closeConversation,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
