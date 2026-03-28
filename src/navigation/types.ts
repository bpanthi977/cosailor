import type { ConversationSession } from '../ConversationSession';

export type RootStackParamList = {
  Home: undefined;
  LiveConversation: { session: ConversationSession };
};
