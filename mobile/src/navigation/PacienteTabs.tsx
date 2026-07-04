import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AjustesScreen } from '../features/ajustes/AjustesScreen';
import { PerfilScreen } from '../features/ajustes/PerfilScreen';
import { SessoesDoPacienteScreen } from '../features/sessoes/SessoesDoPacienteScreen';
import { useNotificacoesStore } from '../store/useNotificacoesStore';
import { useNotificacoesCount } from '../hooks/useNotificacoesCount';

const Tab = createBottomTabNavigator();
const SessoesPacienteStack = createNativeStackNavigator();
const PerfilPacienteStack = createNativeStackNavigator();

function SessoesPacienteNavigator() {
  return (
    <SessoesPacienteStack.Navigator screenOptions={{ headerShown: false }}>
      <SessoesPacienteStack.Screen name="SessoesMain" component={SessoesDoPacienteScreen} />
    </SessoesPacienteStack.Navigator>
  );
}

function PerfilPacienteNavigator() {
  return (
    <PerfilPacienteStack.Navigator screenOptions={{ headerShown: false }}>
      <PerfilPacienteStack.Screen name="PerfilMain" component={AjustesScreen} />
      <PerfilPacienteStack.Screen name="Perfil" component={PerfilScreen} />
    </PerfilPacienteStack.Navigator>
  );
}

export function PacienteTabs() {
  const insets = useSafeAreaInsets();
  const naoLidas = useNotificacoesStore(state => state.naoLidas);

  useNotificacoesCount();
  
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
        tabBarBadge: route.name === 'Meu Perfil' && naoLidas > 0 ? naoLidas : undefined,
        tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { height: 60 + insets.bottom, paddingBottom: insets.bottom || 4, paddingTop: 4 }
      })}
    >
      <Tab.Screen name="Minhas Sessões" component={SessoesPacienteNavigator} />
      <Tab.Screen name="Meu Perfil" component={PerfilPacienteNavigator} />
    </Tab.Navigator>
  );
}
