import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/constants/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
  iconFocused: IconName;
}

// Nueva navegación:
// Tab bar: Inicio · Mapa · Vender(centro) · Descubrir · Perfil
// Header (en index.tsx): Buscar · Notificaciones · Guardados · Ofertas
const TABS: TabConfig[] = [
  { name: 'index',    title: 'Inicio',    icon: 'home-outline',         iconFocused: 'home' },
  { name: 'map',      title: 'Mapa',      icon: 'map-outline',          iconFocused: 'map' },
  { name: 'sell',     title: 'Vender',    icon: 'add-circle-outline',   iconFocused: 'add-circle' },
  { name: 'discover', title: 'Descubrir', icon: 'sparkles-outline',     iconFocused: 'sparkles' },
  { name: 'profile',  title: 'Perfil',    icon: 'person-outline',       iconFocused: 'person' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  const bottomPad = Platform.OS === 'android'
    ? Math.max(insets.bottom, 16)
    : insets.bottom;
  const tabBarHeight = 58 + bottomPad;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.lavenderDim,
        tabBarStyle: {
          backgroundColor: C.bgElevated,
          borderTopColor: C.bgBorder,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: bottomPad,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color }) => {
              if (tab.name === 'sell') {
                return (
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: C.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons name="add" size={26} color={C.white} />
                  </View>
                );
              }
              if (tab.name === 'discover') {
                return (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons
                      name={focused ? 'sparkles' : 'sparkles-outline'}
                      size={22}
                      color={focused ? '#EC4899' : color}
                    />
                  </View>
                );
              }
              return (
                <Ionicons name={focused ? tab.iconFocused : tab.icon} size={22} color={color} />
             