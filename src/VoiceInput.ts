import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type VoiceCallbacks = {
  onPartial: (text: string) => void;
  onResult: (text: string) => void;
  onError: () => void;
};

type Subscription = { remove: () => void };

let resultSub: Subscription | null = null;
let errorSub: Subscription | null = null;

function clearAll() {
  resultSub?.remove(); resultSub = null;
  errorSub?.remove();  errorSub = null;
}

export const VoiceInput = {
  isAvailable(): boolean {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  },

  async start(callbacks: VoiceCallbacks): Promise<void> {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      callbacks.onError();
      return;
    }

    clearAll();

    resultSub = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      const transcript = event.results[0]?.transcript ?? '';
      if (event.isFinal) {
        clearAll();
        callbacks.onResult(transcript);
      } else {
        callbacks.onPartial(transcript);
      }
    });

    errorSub = ExpoSpeechRecognitionModule.addListener('error', () => {
      clearAll();
      callbacks.onError();
    });

    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true });
  },

  stop(): void {
    // Drop the error listener so an end-of-speech error on intentional stop
    // doesn't fire onError. Keep resultSub alive to receive the final result.
    errorSub?.remove(); errorSub = null;
    ExpoSpeechRecognitionModule.stop();
  },

  cancel(): void {
    clearAll();
    ExpoSpeechRecognitionModule.abort();
  },

  destroy(): void {
    clearAll();
  },
};
