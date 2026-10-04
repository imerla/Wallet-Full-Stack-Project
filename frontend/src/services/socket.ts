import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let socketAuthToken: string | null = null;

export function getSocket(token: string | null): Socket {
  if (!token) {
    throw new Error('Cannot create socket without token');
  }

  if (socket && socketAuthToken !== token) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketAuthToken = null;
  }

  if (socket) {
    return socket;
  }

  socketAuthToken = token;
  socket = io(SOCKET_URL, {
    auth: {
      token,
    },
    transports: ['websocket'],
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    socketAuthToken = null;
  }
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
