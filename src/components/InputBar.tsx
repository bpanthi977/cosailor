import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { VoiceInput } from '../VoiceInput';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  onSend: (text: string) => void;
  isStreaming: boolean;
  onLive?: () => void;
};

export default function InputBar({ onSend, isStreaming, onLive }: Props) {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const inputTextRef = useRef('');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    Promise.resolve(VoiceInput.isAvailable()).then(setVoiceAvailable);
    return () => VoiceInput.destroy();
  }, []);

  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => {
      pulseLoop.current?.stop();
    };
  }, [isRecording, pulseAnim]);

  const handleChangeText = (text: string) => {
    setInputText(text);
    inputTextRef.current = text;
  };

  const handleSend = () => {
    const text = inputTextRef.current.trim();
    if (!text || isStreaming) return;
    setInputText('');
    inputTextRef.current = '';
    onSend(text);
  };

  const handleMicToggle = async () => {
    if (isRecording) {
      VoiceInput.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      await VoiceInput.start({
        onPartial: (text) => {
          setInputText(text);
          inputTextRef.current = text;
        },
        onResult: (text) => {
          setIsRecording(false);
          setInputText('');
          inputTextRef.current = '';
          onSend(text);
        },
        onError: () => {
          setIsRecording(false);
        },
      });
    }
  };

  const sendDisabled = !inputText.trim() || isStreaming;
  const showLive = !inputText.trim() && !isRecording && voiceAvailable && !!onLive;

  return (
    <View style={styles.inputBar}>
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={handleChangeText}
        placeholder="Message..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        onSubmitEditing={handleSend}
        submitBehavior="newline"
      />
      {voiceAvailable && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            onPress={handleMicToggle}
            disabled={isStreaming}
          >
            <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      {showLive ? (
        <TouchableOpacity style={styles.liveButton} onPress={onLive} disabled={isStreaming}>
          <Text style={styles.liveButtonText}>◎</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sendDisabled}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#18181b',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: '#fafafa',
    ...typography.base,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: '#3f1f1f',
  },
  micIcon: {
    fontSize: 18,
  },
  sendButton: {
    height: 40,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    ...typography.base,
  },
  liveButton: {
    width: 40,
    height: 40,
    backgroundColor: '#18181b',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveButtonText: {
    color: '#22d3ee',
    fontSize: 22,
  },
});
