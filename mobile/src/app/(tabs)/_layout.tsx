import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '@/constants/Typography';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme, colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        
        if (options.href === null) {
          return null;
        }

        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        let iconName: any = 'circle';
        if (route.name === 'index') iconName = 'home';
        else if (route.name === 'dms') iconName = 'chat';
        else if (route.name === 'activity') iconName = 'notifications';
        else if (route.name === 'profile') iconName = 'person';

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={styles.iconContainer}>
              <MaterialIcons
                name={iconName}
                size={24}
                color={isFocused ? '#3BA7D6' : '#bec8cf'}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                isFocused ? styles.tabLabelFocused : styles.tabLabelInactive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="dms"
        options={{
          title: 'DMs',
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
        }}
      />
    </Tabs>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    minWidth: 64,
  },
  tabItemFocused: {
    backgroundColor: '#76D1FF', // Bright Cyan
    shadowColor: '#76D1FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffb4ab', // error
    borderWidth: 1,
    borderColor: '#051424',
  },
  tabLabel: {
    ...Typography.labelSm,
    fontSize: 11,
    fontWeight: '600',
  },
  tabLabelInactive: {
    color: colors.textDim, // on-surface-variant
  },
  tabLabelFocused: {
    color: colors.primary, // neon blue
  },
});
