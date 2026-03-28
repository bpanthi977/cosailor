import { useEffect, useRef, useState } from 'react';

export default function useCursorBlink(isStreaming: boolean): boolean {
  const [cursorVisible, setCursorVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isStreaming) {
      intervalRef.current = setInterval(() => {
        setCursorVisible(v => !v);
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setCursorVisible(true);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming]);

  return cursorVisible;
}
