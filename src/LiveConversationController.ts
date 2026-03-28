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
  private _hadPartialSpeech = false;

  // Streaming TTS state
  private _generation = 0;
  private _streamBuffer = '';
  private _accumulatedText = '';
  private _ttsQueue: Array<{ text: string; offset: number }> = [];
  private _ttsSpeaking = false;
  private _streamDone = false;

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
    this._generation++;
    this._ttsQueue = [];
    this._ttsSpeaking = false;
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
    this._hadPartialSpeech = false;
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
    if (text.trim()) this._hadPartialSpeech = true;
    this._setState({ phase: 'listening', partialText: text });
    this._resetSilenceTimer();
  }

  private _onSilenceTimeout(): void {
    if (this.stopped || this.state.phase !== 'listening') return;
    if (!this._hadPartialSpeech) {
      // No speech detected yet in this session — keep waiting
      this._resetSilenceTimer();
      return;
    }
    VoiceInput.stop(); // fires final onResult; errorSub cleared inside stop()
    this._setState({ phase: 'processing_ai' });
  }

  private async _onResult(text: string): Promise<void> {
    this._clearSilenceTimer();
    if (this.stopped) return;
    if (this.state.phase !== 'listening' && this.state.phase !== 'processing_ai') return;
    if (!text.trim()) {
      if (!this.stopped) this._startListening('');
      return;
    }
    this._setState({ phase: 'processing_ai' });

    const generation = ++this._generation;
    this._streamBuffer = '';
    this._accumulatedText = '';
    this._ttsQueue = [];
    this._ttsSpeaking = false;
    this._streamDone = false;

    try {
      await this.session.sendMessage(text, {
        onTextChunk: (chunk) => {
          if (this._generation !== generation || this.stopped) return;
          this._onStreamChunk(chunk);
        },
      });
      if (this._generation !== generation || this.stopped) return;
      // Speak any remaining partial sentence that didn't end with punctuation
      if (this._streamBuffer.trim()) {
        const offset = this._accumulatedText.length - this._streamBuffer.length;
        this._enqueueForTts(this._streamBuffer.trim(), offset);
        this._streamBuffer = '';
      }
      this._streamDone = true;
      this._tryDequeue();
    } catch {
      if (this._generation !== generation || this.stopped) return;
      if (!this.stopped) this._startListening('');
    }
  }

  private _onStreamChunk(chunk: string): void {
    this._streamBuffer += chunk;
    this._accumulatedText += chunk;

    // Live-update responseText while already speaking
    if (this.state.phase === 'speaking_ai') {
      this._setState({ ...this.state, responseText: this._accumulatedText });
    }

    this._extractSentences();
  }

  private _extractSentences(): void {
    // Match text ending with sentence-boundary punctuation followed by optional whitespace
    const regex = /[^.!?\n]*[.!?\n]+\s*/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    const bufferStart = this._accumulatedText.length - this._streamBuffer.length;
    while ((match = regex.exec(this._streamBuffer)) !== null) {
      const sentence = match[0].trim();
      if (sentence) this._enqueueForTts(sentence, bufferStart + match.index);
      lastIndex = regex.lastIndex;
    }
    this._streamBuffer = this._streamBuffer.slice(lastIndex);
  }

  private _enqueueForTts(text: string, offset: number): void {
    this._ttsQueue.push({ text, offset });
    this._tryDequeue();
  }

  private _tryDequeue(): void {
    if (this._ttsSpeaking || this.stopped) return;

    if (this._ttsQueue.length === 0) {
      if (this._streamDone) {
        // Nothing left to say — return to listening
        this._stopInterruptListener();
        if (!this.stopped) this._startListening('');
      }
      return;
    }

    const { text: sentence, offset: sentenceOffset } = this._ttsQueue.shift()!;
    this._ttsSpeaking = true;

    // Transition to speaking_ai on first sentence
    if (this.state.phase === 'processing_ai') {
      this._setState({ phase: 'speaking_ai', responseText: this._accumulatedText, spokenCharIndex: sentenceOffset });
      this._startInterruptListener();
    }

    TtsOutput.speak(sentence, {
      onStart: () => {},
      onDone: () => {
        if (this.stopped) return;
        this._ttsSpeaking = false;
        this._tryDequeue();
      },
      onError: () => {
        if (this.stopped) return;
        this._ttsSpeaking = false;
        this._tryDequeue();
      },
      onBoundary: (charIndex) => {
        if (!this.stopped && this.state.phase === 'speaking_ai') {
          this._setState({
            phase: 'speaking_ai',
            responseText: this._accumulatedText,
            spokenCharIndex: sentenceOffset + charIndex,
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
    this._generation++;
    this._ttsQueue = [];
    this._ttsSpeaking = false;
    this._streamDone = false;
    this.interruptActive = false;
    TtsOutput.stop();
    this._startListening(partialText);
  }
}
