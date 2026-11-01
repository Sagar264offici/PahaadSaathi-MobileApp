import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export type ConnectionState = 'online' | 'offline' | 'unknown';

export function useConnectivity() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isInternetReachable ?? state.isConnected);
      if (state.isInternetReachable === true) {
        setConnectionState('online');
      } else if (state.isConnected === true && state.isInternetReachable === false) {
        setConnectionState('offline');
      } else {
        setConnectionState('unknown');
      }
    });

    // Initial check
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isInternetReachable ?? state.isConnected);
      if (state.isInternetReachable === true) {
        setConnectionState('online');
      } else if (state.isConnected === true && state.isInternetReachable === false) {
        setConnectionState('offline');
      } else {
        setConnectionState('unknown');
      }
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, connectionState, isOnline: connectionState === 'online' };
}
