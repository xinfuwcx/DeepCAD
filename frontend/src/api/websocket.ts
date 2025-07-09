// A basic WebSocket wrapper
// This can be expanded to include automatic reconnection, message queueing, etc.

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is already connected.');
      return;
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onmessage = (event) => {
      console.log('WebSocket message received:', event.data);
      // Here, you could use a store (like Zustand) to update the application state
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      // Optionally, implement reconnection logic here
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  public sendMessage(message: string | object): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const data = typeof message === 'string' ? message : JSON.stringify(message);
      this.socket.send(data);
    } else {
      console.error('WebSocket is not connected.');
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}

// Create a singleton instance
const websocketUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
const websocketService = new WebSocketService(websocketUrl);

export default websocketService; 