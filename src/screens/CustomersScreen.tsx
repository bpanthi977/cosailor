import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { listCustomers, getSessionsForCustomer } from '../db';
import type { Customer, Session } from '../db';
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Customers'>;

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function CustomersScreen() {
  const navigation = useNavigation<Nav>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sessions, setSessions] = useState<Record<number, Session[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listCustomers().then(setCustomers);
  }, []);

  const handleExpand = useCallback(async (customer: Customer) => {
    if (expanded === customer.id) {
      setExpanded(null);
      return;
    }
    setExpanded(customer.id);
    if (!sessions[customer.id]) {
      const s = await getSessionsForCustomer(customer.id);
      setSessions(prev => ({ ...prev, [customer.id]: s }));
    }
  }, [expanded, sessions]);

  const handleStartChat = useCallback((customer: Customer) => {
    navigation.navigate('Home', { customerId: customer.id, customerName: customer.name });
  }, [navigation]);

  const handleSelectSession = useCallback((session: Session, customer: Customer) => {
    navigation.navigate('Home', {
      customerId: customer.id,
      customerName: customer.name,
      sessionId: session.id,
    });
  }, [navigation]);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Customers</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
        placeholder="Search..."
        placeholderTextColor={colors.mutedForeground}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item: customer }) => (
          <View>
            <TouchableOpacity
              style={styles.customerRow}
              onPress={() => handleExpand(customer)}
            >
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.chevron}>{expanded === customer.id ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {expanded === customer.id && (
              <View style={styles.expandedPanel}>
                {(sessions[customer.id] ?? []).length === 0 ? (
                  <Text style={styles.emptyText}>No previous conversations</Text>
                ) : (
                  (sessions[customer.id] ?? []).map(session => (
                    <TouchableOpacity
                      key={session.id}
                      style={styles.sessionRow}
                      onPress={() => handleSelectSession(session, customer)}
                    >
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {session.title || 'Untitled'}
                      </Text>
                      <Text style={styles.sessionDate}>{formatDate(session.updated_at)}</Text>
                    </TouchableOpacity>
                  ))
                )}
                <TouchableOpacity
                  style={styles.startChatButton}
                  onPress={() => handleStartChat(customer)}
                >
                  <Text style={styles.startChatText}>+ Start new chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  backButton: {
    padding: spacing.sm,
  },
  backIcon: {
    color: '#fafafa',
    fontSize: 20,
  },
  title: {
    ...typography.lg,
    color: '#fafafa',
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  searchInput: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#18181b',
    borderRadius: radius.md,
    color: '#fafafa',
    ...typography.base,
  },
  separator: {
    height: 1,
    backgroundColor: '#27272a',
    marginHorizontal: spacing.md,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  customerName: {
    ...typography.base,
    color: '#fafafa',
  },
  chevron: {
    color: colors.mutedForeground,
    fontSize: 12,
  },
  expandedPanel: {
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
  },
  emptyText: {
    ...typography.sm,
    color: colors.mutedForeground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sessionRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  sessionTitle: {
    ...typography.base,
    color: '#fafafa',
  },
  sessionDate: {
    ...typography.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  startChatButton: {
    margin: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  startChatText: {
    color: colors.primaryForeground,
    fontWeight: '600',
    ...typography.base,
  },
});
