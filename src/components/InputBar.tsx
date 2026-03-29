import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VoiceInput } from '../VoiceInput';
import { spacing } from '../theme';

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

  const hasText = !!inputText.trim();
  const showLive = !hasText && !isRecording && voiceAvailable && !!onLive;

  return (
    <View style={styles.container}>
      {voiceAvailable && (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={[styles.iconButton, isRecording && styles.micButtonActive]}
            onPress={handleMicToggle}
            disabled={isStreaming}
          >
            <Ionicons
              name={isRecording ? 'stop' : 'mic'}
              size={22}
              color={isRecording ? '#f87171' : 'rgba(195, 198, 215, 0.7)'}
            />
          </TouchableOpacity>
        </Animated.View>
      )}
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={handleChangeText}
        placeholder="Ask co-pilot or pick a skill..."
        placeholderTextColor="rgba(195, 198, 215, 0.4)"
        multiline
        onSubmitEditing={handleSend}
        submitBehavior="newline"
      />
      {showLive ? (
        <TouchableOpacity style={styles.actionButton} onPress={onLive} disabled={isStreaming}>
          <Ionicons name="radio" size={22} color="#002e6a" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.actionButton, (!hasText || isStreaming) && styles.actionButtonDisabled]}
          onPress={handleSend}
          disabled={!hasText || isStreaming}
        >
          <Ionicons name="arrow-up" size={22} color="#002e6a" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: 0,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    backgroundColor: 'rgba(42, 42, 44, 0.75)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(67, 70, 85, 0.25)',
    gap: spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: '#e5e1e4',
    fontSize: 15,
    lineHeight: 22,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#adc6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
});
