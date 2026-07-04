import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { PacienteTabs } from './PacienteTabs';
import { useAuthStore } from '../store/useAuthStore';
import { NotificacoesScreen } from '../features/notificacoes/NotificacoesScreen';

const MainStack = createNativeStackNavigator();

export function RootNavigator() {
  const { token, user } = useAuthStore();

  const renderTabs = () => {
    if (user?.perfil === 'PACIENTE') {
      return <PacienteTabs />;
    }
    return <AppTabs />;
  };

  return (
    <NavigationContainer>
      {token ? (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="Tabs" component={renderTabs} />
          <MainStack.Screen 
            name="Notificacoes" 
            component={NotificacoesScreen} 
            options={{ presentation: 'modal' }}
          />
        </MainStack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
