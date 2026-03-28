import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { LiveConversationController, type LiveState } from '../LiveConversationController';
import { ConversationSession, type ChatMessage } from '../ConversationSession';

const BAR_COUNT = 5;

function createBars(): Animated.Value[] {
  return Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15));
}

function animateBarsActive(bars: Animated.Value[]): Animated.CompositeAnimation {
  const animations = bars.map((bar, i) => {
    const peaks = [0.9, 0.4, 0.75, 0.3, 0.85];
    const troughs = [0.25, 0.7, 0.2, 0.6, 0.15];
    const duration = 180 + i * 45;
    return Animated.loop(
      Animated.sequence([
        Animated.timing(bar, { toValue: peaks[i], duration, useNativeDriver: true }),
        Animated.timing(bar, { toValue: troughs[i], duration, useNativeDriver: true }),
      ]),
    );
  });
  return Animated.parallel(animations);
}

function animateBarsIdle(bars: Animated.Value[]): void {
  bars.forEach(bar => {
    Animated.timing(bar, { toValue: 0.15, duration: 300, useNativeDriver: true }).start();
  });
}

function driveUserBars(bars: Animated.Value[], text: string): void {
  const energy = Math.min(1.0, text.length / 40);
  bars.forEach((bar, i) => {
    const offset = ((i % 3) - 1) * 0.15;
    const target = Math.max(0.15, Math.min(1.0, energy + offset));
    Animated.timing(bar, { toValue: target, duration: 120 + i * 20, useNativeDriver: true }).start();
  });
}

export type UseLiveConversationReturn = {
  phase: LiveState['phase'];
  partialText: string;
  messages: ChatMessage[];
  responseText: string;
  spokenCharIndex: number;
  userBars: Animated.Value[];
  aiBars: Animated.Value[];
  start: () => void;
  endConversation: () => void;
};

export function useLiveConversation(session: ConversationSession): UseLiveConversationReturn {
  const [liveState, setLiveState] = useState<LiveState>({ phase: 'idle' });
  const [messages, setMessages] = useState<ChatMessage[]>(session.getMessages());

  const controllerRef = useRef<LiveConversationController | null>(null);
  const userBars = useRef(createBars()).current;
  const aiBars = useRef(createBars()).current;
  const aiAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const prevPhaseRef = useRef<LiveState['phase']>('idle');

  // Register our own notify on the session; HomeScreen re-registers via useFocusEffect
  useEffect(() => {
    session.setCallbacks(setMessages, () => {});

    const controller = new LiveConversationController(session);
    controllerRef.current = controller;
    const unsub = controller.subscribe(setLiveState);

    return () => {
      unsub();
      controller.destroy();
    };
  }, [session]);

  // Drive waveform animations on phase change
  useEffect(() => {
    const phase = liveState.phase;
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === 'speaking_ai' && prevPhase !== 'speaking_ai') {
      aiAnimRef.current?.stop();
      const anim = animateBarsActive(aiBars);
      aiAnimRef.current = anim;
      anim.start();
    } else if (phase !== 'speaking_ai' && prevPhase === 'speaking_ai') {
      aiAnimRef.current?.stop();
      aiAnimRef.current = null;
      animateBarsIdle(aiBars);
    }

    if (phase === 'listening') {
      const partialText = (liveState as { phase: 'listening'; partialText: string }).partialText;
      driveUserBars(userBars, partialText);
    } else {
      animateBarsIdle(userBars);
    }
  }, [liveState, userBars, aiBars]);

  const phase = liveState.phase;
  const partialText = phase === 'listening'
    ? (liveState as { phase: 'listening'; partialText: string }).partialText
    : '';
  const responseText = phase === 'speaking_ai'
    ? (liveState as { phase: 'speaking_ai'; responseText: string; spokenCharIndex: number }).responseText
    : '';
  const spokenCharIndex = phase === 'speaking_ai'
    ? (liveState as { phase: 'speaking_ai'; responseText: string; spokenCharIndex: number }).spokenCharIndex
    : 0;

  return {
    phase,
    partialText,
    messages,
    responseText,
    spokenCharIndex,
    userBars,
    aiBars,
    start: () => controllerRef.current?.start(),
    endConversation: () => controllerRef.current?.stop(),
  };
}
