import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { HomeIcon, SearchIcon, MapIcon, PassesIcon, ProfileIcon } from '@/components/NavIcons';


interface TabIconProps {
  focused: boolean;
  children: React.ReactNode;
}

function TabIcon({ focused, children }: TabIconProps) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      {children}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <HomeIcon focused={focused} size={24} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <SearchIcon focused={focused} size={24} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <MapIcon focused={focused} size={24} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="passes"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <PassesIcon focused={focused} size={24} />
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <ProfileIcon focused={focused} size={24} />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: `${Colors.outlineVariant}80`,
    height: Platform.OS === 'ios' ? 76 : 64,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 20 : Spacing.xs,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  tabBarItem: {
    paddingTop: 2,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabItemActive: {
    backgroundColor: '#000000',
  },
});

