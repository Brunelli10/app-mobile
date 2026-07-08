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
import { ConfiguracoesClinicaScreen } from '../features/ajustes/ConfiguracoesClinicaScreen';
import { GestaoAcessosScreen } from '../features/ajustes/GestaoAcessosScreen';
import { RelatoriosScreen } from '../features/ajustes/RelatoriosScreen';
import { PerfilScreen } from '../features/ajustes/PerfilScreen';
import { SupervisaoScreen } from '../features/supervisao/SupervisaoScreen';
import { GradeHorariosScreen } from '../features/ajustes/GradeHorariosScreen';
import { DashboardGestorScreen } from '../features/gestor/DashboardGestorScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificacoesStore } from '../store/useNotificacoesStore';
import { useNotificacoesCount } from '../hooks/useNotificacoesCount';
import { colors } from '../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const SalasStack = createNativeStackNavigator();
const AgendaStackNav = createNativeStackNavigator();
const PacientesStack = createNativeStackNavigator();
const ConfiguracoesStack = createNativeStackNavigator();

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

function ConfiguracoesNavigator() {
  return (
    <ConfiguracoesStack.Navigator screenOptions={{ headerShown: false }}>
      <ConfiguracoesStack.Screen name="ConfiguracoesMain" component={AjustesScreen} />
      <ConfiguracoesStack.Screen name="ConfiguracoesClinica" component={ConfiguracoesClinicaScreen} />
      <ConfiguracoesStack.Screen name="GestaoAcessos" component={GestaoAcessosScreen} />
      <ConfiguracoesStack.Screen name="Relatorios" component={RelatoriosScreen} />
      <ConfiguracoesStack.Screen name="Perfil" component={PerfilScreen} />
      <ConfiguracoesStack.Screen name="Supervisao" component={SupervisaoScreen} />
      <ConfiguracoesStack.Screen name="GradeHorarios" component={GradeHorariosScreen} />
      <ConfiguracoesStack.Screen name="MeusPacientes" component={PacientesScreen} />
    </ConfiguracoesStack.Navigator>
  );
}

export function AppTabs() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const isGestorOrRoot = user?.perfil === 'GESTOR' || user?.perfil === 'ROOT';
  const naoLidas = useNotificacoesStore(state => state.naoLidas);

  // Hook global que fará o polling de notificações em background a cada 30s
  useNotificacoesCount();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'apps';
          if (route.name === 'Salas') iconName = 'apps';
          else if (route.name === 'Agenda') iconName = 'calendar-clear';
          else if (route.name === 'Pacientes') iconName = 'people';
          else if (route.name === 'Gestão') iconName = 'bar-chart';
          else if (route.name === 'Configurações') iconName = 'settings';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarBadge: route.name === 'Configurações' && naoLidas > 0 ? naoLidas : undefined,
        tabBarBadgeStyle: { backgroundColor: '#EF4444', fontSize: 10 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { height: 60 + insets.bottom, paddingBottom: insets.bottom || 4, paddingTop: 4 }
      })}
    >
      <Tab.Screen name="Salas" component={SalasNavigator} />
      <Tab.Screen name="Agenda" component={AgendaNavigator} />
      <Tab.Screen name="Pacientes" component={PacientesNavigator} />
      {isGestorOrRoot && (
        <Tab.Screen name="Gestão" component={DashboardGestorScreen} />
      )}
      <Tab.Screen name="Configurações" component={ConfiguracoesNavigator} />
    </Tab.Navigator>
  );
}
