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
import { colors, radius, spacing, typography } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Customers'>;

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
          <TouchableOpacity
            style={styles.customerRow}
            onPress={() => handleSelectCustomer(customer)}
          >
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
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
    fontSize: 18,
  },
});
