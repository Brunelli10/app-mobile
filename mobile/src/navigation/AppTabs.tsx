import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SalasScreen } from '../features/salas/SalasScreen';
import { SalaDetailsScreen } from '../features/salas/SalaDetailsScreen';
import { AgendaScreen } from '../features/agenda/AgendaScreen';
import { SessaoDetailsScreen } from '../features/sessoes/SessaoDetailsScreen';
import { PacientesScreen } from '../features/pacientes/PacientesScreen';
import { PacientePerfilScreen } from '../features/pacientes/PacientePerfilScreen';
import { AjustesScreen } from '../features/ajustes/AjustesScreen';
import { DashboardGestorScreen } from '../features/gestor/DashboardGestorScreen';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const SalasStack = createNativeStackNavigator();
const AgendaStackNav = createNativeStackNavigator();
const PacientesStack = createNativeStackNavigator();

function SalasNavigator() {
  return (
    <SalasStack.Navigator screenOptions={{ headerShown: false }}>
      <SalasStack.Screen name="SalasMain" component={SalasScreen} />
      <SalasStack.Screen name="SalaDetails" component={SalaDetailsScreen} />
    </SalasStack.Navigator>
  );
}

function AgendaNavigator() {
  return (
    <AgendaStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AgendaStackNav.Screen name="AgendaMain" component={AgendaScreen} />
      <AgendaStackNav.Screen name="SessaoDetails" component={SessaoDetailsScreen} />
    </AgendaStackNav.Navigator>
  );
}

function PacientesNavigator() {
  return (
    <PacientesStack.Navigator screenOptions={{ headerShown: false }}>
      <PacientesStack.Screen name="PacientesMain" component={PacientesScreen} />
      <PacientesStack.Screen name="PacientePerfil" component={PacientePerfilScreen} />
    </PacientesStack.Navigator>
  );
}

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'apps';
          if (route.name === 'Dashboard') iconName = 'apps';
          else if (route.name === 'Agenda') iconName = 'calendar-clear';
          else if (route.name === 'Pacientes') iconName = 'people';
          else if (route.name === 'Gestão') iconName = 'bar-chart';
          else if (route.name === 'Ajustes') iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { height: 60 + insets.bottom, paddingBottom: insets.bottom || 8, paddingTop: 8 }
      })}
    >
      <Tab.Screen name="Dashboard" component={SalasNavigator} />
      <Tab.Screen name="Agenda" component={AgendaNavigator} />
      <Tab.Screen name="Pacientes" component={PacientesNavigator} />
      {isGestorOrRoot && (
        <Tab.Screen name="Gestão" component={DashboardGestorScreen} />
      )}
      <Tab.Screen name="Ajustes" component={AjustesScreen} />
    </Tab.Navigator>
  );
}
