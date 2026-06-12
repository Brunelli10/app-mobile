import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AjustesScreen } from '../features/ajustes/AjustesScreen';
import { SessoesDoPacienteScreen } from '../features/sessoes/SessoesDoPacienteScreen';

const Tab = createBottomTabNavigator();
const SessoesPacienteStack = createNativeStackNavigator();

function SessoesPacienteNavigator() {
  return (
    <SessoesPacienteStack.Navigator screenOptions={{ headerShown: false }}>
      <SessoesPacienteStack.Screen name="SessoesMain" component={SessoesDoPacienteScreen} />
    </SessoesPacienteStack.Navigator>
  );
}

export function PacienteTabs() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'calendar-clear';
          if (route.name === 'Minhas Sessões') iconName = 'calendar-clear';
          else if (route.name === 'Meu Perfil') iconName = 'person-circle';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { height: 60 + insets.bottom, paddingBottom: insets.bottom || 4, paddingTop: 4 }
      })}
    >
      <Tab.Screen name="Minhas Sessões" component={SessoesPacienteNavigator} />
      <Tab.Screen name="Meu Perfil" component={AjustesScreen} />
    </Tab.Navigator>
  );
}
