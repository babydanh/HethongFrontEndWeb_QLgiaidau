import { io, Socket } from 'socket.io-client';

interface SocketAuthPayload {
  token?: string;
}

const getSocketUrl = () => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_WS_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    // Production: OLS proxies to backend on standard port
    return `${window.location.protocol}//${window.location.hostname}`;
  }
  return 'http://localhost:3000';
};

const SOCKET_URL = getSocketUrl();
const isSocketDebugEnabled = process.env.NEXT_PUBLIC_SOCKET_DEBUG === 'true';

class SocketClient {
  private static instance: SocketClient;
  private chatSocket: Socket | null = null;
  private matchSocket: Socket | null = null;
  private notificationSocket: Socket | null = null;
  private loggedSocketErrors = new Set<string>();
  private notificationAuthToken: string | null = null;

  private constructor() {}

  public static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }

  private logConnectError(scope: string, err: Error) {
    if (!isSocketDebugEnabled || this.loggedSocketErrors.has(scope)) return;

    this.loggedSocketErrors.add(scope);
    console.warn(`${scope} Socket connect_error:`, err.message);
  }

  public getChatSocket(): Socket {
    if (!this.chatSocket) {
      this.chatSocket = io(`${SOCKET_URL}/chat`, {
        autoConnect: false,
        auth: this.getNotificationAuthPayload(),
        withCredentials: true,
        // Polling first works behind the current reverse proxy; Socket.IO can
        // upgrade later when websocket support is available.
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3,
        reconnectionDelay: 3000,
      });

      this.chatSocket.on('connect_error', (err: Error) => {
        this.logConnectError('Chat', err);
      });
    }
    return this.chatSocket;
  }

  public getMatchSocket(): Socket {
    if (!this.matchSocket) {
      this.matchSocket = io(`${SOCKET_URL}/live`, {
        autoConnect: false,
        withCredentials: true,
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 3,
        reconnectionDelay: 3000,
      });

      this.matchSocket.on('connect_error', (err: Error) => {
        this.logConnectError('Match', err);
      });
    }
    return this.matchSocket;
  }

  public getNotificationSocket(): Socket {
    if (!this.notificationSocket) {
      this.notificationSocket = io(`${SOCKET_URL}/notifications`, {
        autoConnect: false,
        auth: this.getNotificationAuthPayload(),
        withCredentials: true,
        transports: ['polling', 'websocket'],
        reconnectionAttempts: 2,
        timeout: 5000,
      });

      this.notificationSocket.on('connect_error', (err: Error) => {
        this.logConnectError('Notification', err);
      });
    }
    return this.notificationSocket;
  }

  public setNotificationAuthToken(token?: string | null) {
    this.notificationAuthToken = token ?? null;

    if (this.chatSocket) {
      this.chatSocket.auth = this.getNotificationAuthPayload();
    }

    if (this.notificationSocket) {
      this.notificationSocket.auth = this.getNotificationAuthPayload();
    }
  }

  public refreshChatAuthentication(): Socket {
    const socket = this.getChatSocket();
    socket.auth = this.getNotificationAuthPayload();

    // A socket opened before login keeps the old handshake cookies until it
    // reconnects. Reconnect once when entering an authenticated chat surface.
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();

    return socket;
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

  private getNotificationAuthPayload(): SocketAuthPayload {
    if (!this.notificationAuthToken) {
      return {};
    }

    return {
      token: this.notificationAuthToken.startsWith('Bearer ')
        ? this.notificationAuthToken
        : `Bearer ${this.notificationAuthToken}`,
    };
  }
}

export const socketClient = SocketClient.getInstance();

