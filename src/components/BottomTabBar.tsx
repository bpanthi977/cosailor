import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const TABS: {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
}[] = [
  { name: 'Home', label: 'CHAT', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  { name: 'Customers', label: 'CUSTOMERS', icon: 'people-outline', iconActive: 'people' },
  { name: 'Skills', label: 'SKILLS', icon: 'sparkles-outline', iconActive: 'sparkles' },
];

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {TABS.map((tab) => {
        const isFocused = state.routes[state.index].name === tab.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes.find(r => r.name === tab.name)?.key ?? '',
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(tab.name);
          }
        };

        return (
          <TouchableOpacity
            key={tab.name}
            onPress={onPress}
            style={[styles.tab, isFocused && styles.tabActive]}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFocused ? tab.iconActive : tab.icon}
              size={22}
              color={isFocused ? '#adc6ff' : '#c8c6c9'}
              style={styles.icon}
            />
            <Text style={[styles.label, isFocused ? styles.labelActive : styles.labelInactive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(19, 19, 21, 0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(67, 70, 85, 0.25)',
    paddingTop: 8,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    opacity: 0.6,
  },
  tabActive: {
    backgroundColor: 'rgba(15, 105, 220, 0.2)',
    opacity: 1,
  },
  icon: {
    marginBottom: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Inter',
    letterSpacing: 1.5,
    fontWeight: '500',
  },
  labelActive: {
    color: '#adc6ff',
  },
  labelInactive: {
    color: '#c8c6c9',
  },
});
