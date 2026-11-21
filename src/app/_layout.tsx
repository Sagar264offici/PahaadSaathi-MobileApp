import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { initAuth } from '@/data/userStore';

function RootNavigation() {
  const { theme, colors } = useAppTheme();

  useEffect(() => {
    initAuth();
  }, []);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bgPrimary },
        }}
      >
        {/* Public routes */}
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />

        {/* Auth-required routes */}
        <Stack.Screen name="report" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="community" />
        <Stack.Screen name="control-room/index" />
        <Stack.Screen name="map" />
        <Stack.Screen name="relay" />
        <Stack.Screen name="hazard/[id]" />
        <Stack.Screen name="hazard/share/[id]" />
        <Stack.Screen name="account" />
        <Stack.Screen name="queue" />
        <Stack.Screen name="moderator/login" />
        <Stack.Screen name="moderator" />
        <Stack.Screen name="resident/register" />
        <Stack.Screen name="resident/alerts" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootNavigation />
    </ThemeProvider>
  );
}
