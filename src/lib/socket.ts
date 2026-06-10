import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
};

const SOCKET_URL = getSocketUrl();

class SocketClient {
  private static instance: SocketClient;
  private chatSocket: Socket | null = null;
  private matchSocket: Socket | null = null;
  private notificationSocket: Socket | null = null;

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  public getChatSocket(): Socket {
    if (!this.chatSocket) {
      this.chatSocket = io(`${SOCKET_URL}/chat`, {
        autoConnect: false,
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      this.chatSocket.on('connect_error', (err) => {
        console.error('Chat Socket connect_error:', err);
      });
    }
    return this.chatSocket;
  }

  public getMatchSocket(): Socket {
    if (!this.matchSocket) {
      this.matchSocket = io(`${SOCKET_URL}/live`, {
        autoConnect: false,
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      this.matchSocket.on('connect_error', (err) => {
        console.error('Match Socket connect_error:', err);
      });
    }
    return this.matchSocket;
  }

  public getNotificationSocket(): Socket {
    if (!this.notificationSocket) {
      this.notificationSocket = io(`${SOCKET_URL}/notifications`, {
        autoConnect: false,
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      this.notificationSocket.on('connect_error', (err) => {
        console.error('Notification Socket connect_error:', err);
      });
    }
    return this.notificationSocket;
  }

  public connectAll() {
    this.getChatSocket().connect();
    this.getMatchSocket().connect();
    this.getNotificationSocket().connect();
  }

  public disconnectAll() {
    if (this.chatSocket) this.chatSocket.disconnect();
    if (this.matchSocket) this.matchSocket.disconnect();
    if (this.notificationSocket) this.notificationSocket.disconnect();
  }
}

export const socketClient = SocketClient.getInstance();
