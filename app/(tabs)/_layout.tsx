import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabConfig {
  name: string;
  title: string;
  icon: IconName;
  iconFocused: IconName;
}

const TABS: TabConfig[] = [
  { name: 'index', title: 'Inicio', icon: 'home-outline', iconFocused: 'home' },
  { name: 'search', title: 'Buscar', icon: 'search-outline', iconFocused: 'search' },
  { name: 'sell', title: 'Vender', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  { name: 'inbox', title: 'Mensajes', icon: 'chatbubble-outline', iconFocused: 'chatbubble' },
  { name: 'profile', title: 'Perfil', icon: 'person-outline', iconFocused: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={tab.name === 'sell' ? 32 : size}
                color={tab.name === 'sell' ? '#2563eb' : color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
