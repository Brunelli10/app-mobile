import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';
import { PacienteTabs } from './PacienteTabs';
import { useAuthStore } from '../store/useAuthStore';

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
      {token ? renderTabs() : <AuthStack />}
    </NavigationContainer>
  );
}
