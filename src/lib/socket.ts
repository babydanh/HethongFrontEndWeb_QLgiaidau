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

const getSocketAccessToken = (): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const bearerCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('accessToken='));

  if (bearerCookie) {
    const tokenValue = bearerCookie.slice('accessToken='.length);
    if (tokenValue) return decodeURIComponent(tokenValue);
  }

  try {
    const localToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
    if (localToken) return localToken;
  } catch {
    // Ignore storage error in SSR / restricted iframe
  }

  return null;
};

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
        auth: (cb) => {
          cb(this.getNotificationAuthPayload());
        },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
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
        auth: (cb) => {
          cb(this.getNotificationAuthPayload());
        },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
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
        auth: (cb) => {
          cb(this.getNotificationAuthPayload());
        },
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        timeout: 6000,
      });

      this.notificationSocket.on('connect_error', (err: Error) => {
        this.logConnectError('Notification', err);
      });
    }
    return this.notificationSocket;
  }

  public setNotificationAuthToken(token?: string | null) {
    const previousToken = this.getNotificationAuthPayload().token ?? null;
    this.notificationAuthToken = token ?? null;
    const nextAuth = this.getNotificationAuthPayload();
    const tokenChanged = previousToken !== (nextAuth.token ?? null);

    const refreshSocketAuth = (socket: Socket | null) => {
      if (!socket) return;
      socket.auth = nextAuth;
      if (tokenChanged && socket.connected) {
        // Socket.IO only sends auth during the handshake. Reconnect so a token
        // refresh or logout cannot leave an anonymous/stale identity attached.
        socket.disconnect();
        socket.connect();
      }
    };

    refreshSocketAuth(this.chatSocket);
    refreshSocketAuth(this.matchSocket);
    refreshSocketAuth(this.notificationSocket);
  }

  public refreshChatAuthentication(): Socket {
    const socket = this.getChatSocket();
    socket.auth = this.getNotificationAuthPayload();

    if (!socket.connected) {
      socket.connect();
    }

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
    const token = this.notificationAuthToken || getSocketAccessToken();
    if (!token) {
      return {};
    }

    return {
      token: token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`,
    };
  }
}

export const socketClient = SocketClient.getInstance();


