import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

type Props = {
  inputText: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isRecording: boolean;
  onMicToggle: () => void;
  voiceAvailable: boolean;
};

export default function InputBar({
  inputText,
  onChangeText,
  onSend,
  isStreaming,
  isRecording,
  onMicToggle,
  voiceAvailable,
}: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

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

  const sendDisabled = !inputText.trim() || isStreaming;

  return (
    <View style={styles.inputBar}>
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={onChangeText}
        placeholder="Message..."
        placeholderTextColor={colors.mutedForeground}
        multiline
        onSubmitEditing={onSend}
        submitBehavior="newline"
      />
      {voiceAvailable && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonActive]}
            onPress={onMicToggle}
            disabled={isStreaming}
          >
            <Text style={styles.micIcon}>{isRecording ? '⏹' : '🎤'}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      <TouchableOpacity
        style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={sendDisabled}
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
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
});
