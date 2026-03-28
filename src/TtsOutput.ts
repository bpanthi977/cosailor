import * as Speech from 'expo-speech';

export type TtsCallbacks = {
  onStart: () => void;
  onDone: () => void;
  onError: () => void;
  onBoundary?: (charIndex: number) => void;
};

export const TtsOutput = {
  isAvailable(): boolean {
    return true; // expo-speech is available on all supported platforms
  },

  speak(text: string, callbacks: TtsCallbacks): void {
    Speech.speak(text, {
      onStart: callbacks.onStart,
      onDone: callbacks.onDone,
      onError: callbacks.onError,
      onBoundary: callbacks.onBoundary
        ? (event: { charIndex?: number }) => callbacks.onBoundary!(event.charIndex ?? 0)
        : undefined,
    });
  },

  stop(): void {
    Speech.stop();
  },

  destroy(): void {
    Speech.stop();
  },
};
