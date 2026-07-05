'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-provider';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user, activeOrg } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user || !activeOrg) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    const socketInstance = io(`${API_URL}/events`, {
      query: {
        token,
        orgSlug: activeOrg.slug,
      },
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('[WebSocket] Connected to events namespace');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('[WebSocket] Disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user, activeOrg?.slug]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
