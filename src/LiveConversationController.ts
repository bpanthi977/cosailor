import { VoiceInput } from './VoiceInput';
import { TtsOutput } from './TtsOutput';
import { ConversationSession } from './ConversationSession';

const SILENCE_TIMEOUT_MS = 1500;

export type LiveState =
  | { phase: 'idle' }
  | { phase: 'listening'; partialText: string }
  | { phase: 'processing_ai' }
  | { phase: 'speaking_ai'; responseText: string; spokenCharIndex: number }
  | { phase: 'error'; message: string };

type Listener = (state: LiveState) => void;

export class LiveConversationController {
  private state: LiveState = { phase: 'idle' };
  private readonly listeners = new Set<Listener>();
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private interruptActive = false;
  private stopped = false;

  constructor(private readonly session: ConversationSession) {}

  getState(): LiveState {
    return this.state;
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  start(): void {
    if (this.state.phase !== 'idle') return;
    this._startListening('');
  }

  stop(): void {
    this.stopped = true;
    this._clearSilenceTimer();
    TtsOutput.stop();
    VoiceInput.cancel();
    this.interruptActive = false;
    this._setState({ phase: 'idle' });
  }

  destroy(): void {
    this.stop();
    this.listeners.clear();
  }

  private _setState(state: LiveState) {
    this.state = state;
    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private _clearSilenceTimer() {
    if (this.silenceTimer !== null) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private _resetSilenceTimer() {
    this._clearSilenceTimer();
    this.silenceTimer = setTimeout(() => this._onSilenceTimeout(), SILENCE_TIMEOUT_MS);
  }

  private _startListening(initialText: string): void {
    this.stopped = false;
    // Cancel any running recognition before starting fresh
    VoiceInput.cancel();
    this.interruptActive = false;
    this._setState({ phase: 'listening', partialText: initialText });

    VoiceInput.start({
      onPartial: (text) => this._onPartial(text),
      onResult: (text) => void this._onResult(text),
      onError: () => {
        if (!this.stopped && this.state.phase === 'listening') {
          setTimeout(() => {
            if (!this.stopped) this._startListening('');
          }, 500);
        }
      },
    });

    this._resetSilenceTimer();
  }

  private _onPartial(text: string): void {
    if (this.stopped || this.state.phase !== 'listening') return;
    this._setState({ phase: 'listening', partialText: text });
    this._resetSilenceTimer();
  }

  private _onSilenceTimeout(): void {
    if (this.stopped || this.state.phase !== 'listening') return;
    const partialText = (this.state as { phase: 'listening'; partialText: string }).partialText;
    if (!partialText.trim()) {
      // Nothing spoken yet — keep waiting
      this._resetSilenceTimer();
      return;
    }
    VoiceInput.stop(); // fires final onResult; errorSub cleared inside stop()
    this._setState({ phase: 'processing_ai' });
  }

  private async _onResult(text: string): Promise<void> {
    this._clearSilenceTimer();
    if (this.stopped) return;
    if (!text.trim()) {
      if (!this.stopped) this._startListening('');
      return;
    }
    this._setState({ phase: 'processing_ai' });
    try {
      await this.session.sendMessage(text);
      if (this.stopped) return;
      const msgs = this.session.getMessages();
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant' && last.status === 'ok' && last.content) {
        this._startSpeaking(last.content);
      } else {
        // AI returned empty or failed — loop back
        if (!this.stopped) this._startListening('');
      }
    } catch {
      if (!this.stopped) this._startListening('');
    }
  }

  private _startSpeaking(text: string): void {
    if (this.stopped) return;
    this._setState({ phase: 'speaking_ai', responseText: text, spokenCharIndex: 0 });
    this._startInterruptListener();

    TtsOutput.speak(text, {
      onStart: () => {},
      onDone: () => {
        if (this.stopped) return;
        this._stopInterruptListener();
        if (!this.stopped) this._startListening('');
      },
      onError: () => {
        if (this.stopped) return;
        this._stopInterruptListener();
        if (!this.stopped) this._startListening('');
      },
      onBoundary: (charIndex) => {
        if (!this.stopped && this.state.phase === 'speaking_ai') {
          this._setState({
            phase: 'speaking_ai',
            responseText: text,
            spokenCharIndex: charIndex,
          });
        }
      },
    });
  }

  private _startInterruptListener(): void {
    this.interruptActive = true;
    VoiceInput.start({
      onPartial: (text) => {
        if (text.length > 3 && !this.stopped && this.state.phase === 'speaking_ai') {
          this._onInterrupt(text);
        }
      },
      onResult: (text) => {
        if (!this.stopped && this.state.phase === 'speaking_ai') {
          this._onInterrupt(text);
        }
      },
      onError: () => {
        this.interruptActive = false;
        // TTS continues uninterrupted
      },
    });
  }

  private _stopInterruptListener(): void {
    if (this.interruptActive) {
      VoiceInput.cancel();
      this.interruptActive = false;
    }
  }

  private _onInterrupt(partialText: string): void {
    if (this.stopped || this.state.phase !== 'speaking_ai') return;
    this.interruptActive = false;
    TtsOutput.stop();
    this._startListening(partialText);
  }
}
