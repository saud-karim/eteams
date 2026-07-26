import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { WorkspaceProvider } from '../context/WorkspaceContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

function RootContent() {
  const { theme } = useTheme();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <WorkspaceProvider>
            <RootContent />
          </WorkspaceProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
