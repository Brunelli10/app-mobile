import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './src/store/useAuthStore';

const queryClient = new QueryClient();

function AppInner() {
  const { hydrate, isHydrating } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, []);

  if (isHydrating) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F5F8' }}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return <RootNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <AppInner />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
