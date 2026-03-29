import type { NavigatorScreenParams } from '@react-navigation/native';
import type { ConversationSession } from '../ConversationSession';

export type TabParamList = {
  Home: { customerId?: number; customerName?: string; sessionId?: number } | undefined;
  Customers: undefined;
  Skills: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList> | undefined;
  LiveConversation: { session: ConversationSession };
  CustomerDetail: { customerId: number; customerName: string };
};
