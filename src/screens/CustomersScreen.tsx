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

import { listCustomersByRecency } from '../db';
import type { Customer } from '../db';
import { colors, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatRelative(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / 3600000;
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${Math.floor(hours)}h ago`;
  if (hours < 48) return 'Yesterday';
  return `${Math.floor(hours / 24)} days ago`;
}

export default function CustomersScreen() {
  const navigation = useNavigation<Nav>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listCustomersByRecency().then(setCustomers);
  }, []);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    navigation.navigate('CustomerDetail', { customerId: customer.id, customerName: customer.name });
  }, [navigation]);

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Customers</Text>
        <Text style={styles.subtitle}>Track notes and conversations with customers</Text>
      </View>

      <View style={styles.searchWrapper}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name"
          placeholderTextColor={colors.mutedForeground}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: customer }) => (
          <TouchableOpacity
            style={styles.customerCard}
            onPress={() => handleSelectCustomer(customer)}
          >
            <Text style={styles.customerName}>{customer.name}</Text>
            {!!customer.updated_at && (
              <View style={styles.lastContact}>
                <Text style={styles.lastContactLabel}>Last Contact</Text>
                <Text style={styles.lastContactValue}>{formatRelative(customer.updated_at)}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#131315',
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#e5e1e4',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.base,
    color: '#c3c6d7',
    marginTop: 4,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: '#1c1b1d',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#434655',
  },
  searchIcon: {
    color: '#8d90a0',
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    color: '#e5e1e4',
    ...typography.base,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#1c1b1d',
    borderRadius: 16,
  },
  customerName: {
    ...typography.lg,
    fontWeight: '700',
    color: '#e5e1e4',
  },
  lastContact: {
    alignItems: 'flex-end',
  },
  lastContactLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#8d90a0',
  },
  lastContactValue: {
    ...typography.sm,
    color: '#c3c6d7',
    marginTop: 2,
  },
});
