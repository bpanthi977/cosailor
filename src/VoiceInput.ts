import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

type VoiceCallbacks = {
  onPartial: (text: string) => void;
  onResult: (text: string) => void;
  onError: () => void;
};

const noop = () => {};

export const VoiceInput = {
  async isAvailable(): Promise<boolean> {
    try {
      return (await Voice.isAvailable()) === 1;
    } catch {
      return false;
    }
  },

  async start(callbacks: VoiceCallbacks): Promise<void> {
    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      callbacks.onPartial(e.value?.[0] ?? '');
    };
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      callbacks.onResult(e.value?.[0] ?? '');
    };
    Voice.onSpeechError = async (_e: SpeechErrorEvent) => {
      await VoiceInput.cancel();
      callbacks.onError();
    };
    await Voice.start('en-US');
  },

  async stop(): Promise<void> {
    await Voice.stop();
  },

  async cancel(): Promise<void> {
    Voice.onSpeechResults = noop;
    Voice.onSpeechPartialResults = noop;
    Voice.onSpeechError = noop;
    await Voice.cancel();
  },

  destroy(): void {
    Voice.onSpeechResults = noop;
    Voice.onSpeechPartialResults = noop;
    Voice.onSpeechError = noop;
    Voice.destroy();
  },
};
