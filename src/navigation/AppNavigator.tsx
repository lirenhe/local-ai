import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ChatScreen from '../screens/ChatScreen';
import ModelScreen from '../screens/ModelScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { useAppStore, selectSelectedModel } from '../store/useAppStore';
import type { RootStackParamList } from '../types';
import { COLORS } from '../utils/theme';

// ─── Stack navigator ──────────────────────────────────────────────────────────
//
// Three screens: Chat (main), Models (download/manage), Settings (configure).

type TabName = 'Chat' | 'Models' | 'Settings';

const TABS: Array<{ name: TabName; icon: string; label: string }> = [
  { name: 'Chat', icon: '💬', label: 'Chat' },
  { name: 'Models', icon: '🤖', label: 'Models' },
  { name: 'Settings', icon: '⚙️', label: 'Settings' },
];

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const selectedModel = useAppStore(selectSelectedModel);
  const backend = useAppStore(s => s.settings.backend);

  const modelLabel =
    backend === 'local'
      ? selectedModel
        ? selectedModel.name.split(' ').slice(0, 2).join(' ')
        : 'No model'
      : '☁ Cloud';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '700', fontSize: 17 },
          contentStyle: { backgroundColor: COLORS.background },
        }}>
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({ navigation }) => ({
            title: 'Local AI',
            headerRight: () => (
              <View style={styles.headerButtons}>
                <HeaderButton
                  label="Models"
                  onPress={() => navigation.navigate('Models')}
                />
                <HeaderButton
                  label="⚙"
                  onPress={() => navigation.navigate('Settings')}
                  style={{ marginLeft: 6 }}
                />
              </View>
            ),
            headerLeft: () => (
              <View style={styles.modelBadge}>
                <Text style={styles.modelBadgeText}>{modelLabel}</Text>
              </View>
            ),
          })}
        />
        <Stack.Screen
          name="Models"
          component={ModelScreen}
          options={{ title: 'Models', headerBackTitle: 'Chat' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings', headerBackTitle: 'Chat' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Header helpers ───────────────────────────────────────────────────────────

function HeaderButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: object;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.headerBtn, style]}>
      <Text style={styles.headerBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  modelBadge: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelBadgeText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },
});
