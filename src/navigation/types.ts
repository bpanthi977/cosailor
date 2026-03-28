import type { ConversationSession } from '../ConversationSession';

export type RootStackParamList = {
  Home: { customerId?: number; customerName?: string; sessionId?: number } | undefined;
  LiveConversation: { session: ConversationSession };
  Customers: undefined;
  Skills: undefined;
  CustomerDetail: { customerId: number; customerName: string };
};
