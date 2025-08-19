import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/contexts/SocketContext';

export interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useSocketEvents(options: UseSocketOptions = {}) {
  const { socket, isConnected } = useSocket();
  const { onConnect, onDisconnect, onError } = options;

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log('Socket connected');
      onConnect?.();
    };

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      onDisconnect?.();
    };

    const handleError = (error: Error) => {
      console.error('Socket error:', error);
      onError?.(error);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);
    };
  }, [socket, onConnect, onDisconnect, onError]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  }, [socket, isConnected]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (!socket) return () => {};

    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, [socket]);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socket) {
      socket.off(event, callback);
    }
  }, [socket]);

  return { emit, on, off, isConnected };
}

export function useSocketSubscription<T = any>(
  event: string,
  callback: (data: T) => void,
  deps: React.DependencyList = []
) {
  const { socket } = useSocket();
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: T) => {
      callbackRef.current(data);
    };

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, ...deps]);
}

export function useSocketRoom(roomType: 'group' | 'challenge' | 'leaderboard', roomId: string) {
  const { joinGroup, leaveGroup, joinChallenge, leaveChallenge, subscribeLeaderboard, unsubscribeLeaderboard } = useSocket();

  const joinRoom = useCallback(() => {
    if (roomType === 'group') {
      joinGroup(roomId);
    } else if (roomType === 'challenge') {
      joinChallenge(roomId);
    } else if (roomType === 'leaderboard') {
      subscribeLeaderboard(roomId);
    }
  }, [roomType, roomId, joinGroup, joinChallenge, subscribeLeaderboard]);

  const leaveRoom = useCallback(() => {
    if (roomType === 'group') {
      leaveGroup(roomId);
    } else if (roomType === 'challenge') {
      leaveChallenge(roomId);
    } else if (roomType === 'leaderboard') {
      unsubscribeLeaderboard(roomId);
    }
  }, [roomType, roomId, leaveGroup, leaveChallenge, unsubscribeLeaderboard]);

  useEffect(() => {
    joinRoom();
    return () => {
      leaveRoom();
    };
  }, [joinRoom, leaveRoom]);

  return { joinRoom, leaveRoom };
}
