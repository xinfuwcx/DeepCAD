/**
 * This file centralizes the WebSocket logic by re-exporting functions from the UI store.
 * This approach keeps WebSocket management consistent and tied to the global state,
 * allowing any component to interact with the WebSocket via the `useUIStore` hooks.
 */
import { useUIStore } from '../stores/useUIStore';

/**
 * A hook to get the WebSocket connection status and control functions.
 * @returns An object with functions to connect, disconnect, and the current connection state.
 */
export const useWebSocket = () => {
  const { 
    connectWebSocket, 
    disconnectWebSocket, 
    websocket, 
    clientId,
    taskProgress,
    resetTaskProgress
  } = useUIStore((state) => ({
    connectWebSocket: state.connectWebSocket,
    disconnectWebSocket: state.disconnectWebSocket,
    websocket: state.websocket,
    clientId: state.clientId,
    taskProgress: state.taskProgress,
    resetTaskProgress: state.resetTaskProgress,
  }));

  return {
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    isConnected: websocket?.readyState === WebSocket.OPEN,
    clientId,
    taskProgress,
    resetTaskProgress
  };
}; 