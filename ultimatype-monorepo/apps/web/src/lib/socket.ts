import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api-client';
import { getGuestId, getGuestName } from './guest';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io('/', {
      autoConnect: false,
      auth: (cb) => {
        const token = getAccessToken();
        if (token) {
          cb({ token });
        } else {
          cb({ guestId: getGuestId(), guestDisplayName: getGuestName() });
        }
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.3,
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
