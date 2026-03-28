import { useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export function useNetworkState(): boolean {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsub;
  }, []);

  return isConnected;
}

type NetworkRestoreCallback = () => void;

/**
 * Register a callback to fire once when network transitions from offline to online.
 * Returns an unsubscribe function.
 */
export function onNetworkRestore(cb: NetworkRestoreCallback): () => void {
  let wasOffline = false;

  const unsub = NetInfo.addEventListener((state: NetInfoState) => {
    const online = state.isConnected ?? true;
    if (!online) {
      wasOffline = true;
    } else if (wasOffline) {
      wasOffline = false;
      cb();
    }
  });

  return unsub;
}

/**
 * Hook that calls `cb` whenever network transitions from offline to online.
 * Stable across renders — cb is captured via ref.
 */
export function useNetworkRestore(cb: NetworkRestoreCallback): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    return onNetworkRestore(() => cbRef.current());
  }, []);
}
