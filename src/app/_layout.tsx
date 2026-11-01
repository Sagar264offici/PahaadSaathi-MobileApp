import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';

function RootNavigation() {
  const { theme, colors } = useAppTheme();

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
        <Stack.Screen name="index" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="map" />
        <Stack.Screen name="relay" />
        <Stack.Screen name="hazard/[id]" />
        <Stack.Screen name="hazard/share/[id]" />
        <Stack.Screen name="account" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
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
