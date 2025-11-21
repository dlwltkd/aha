import "react-native-gesture-handler";
import "react-native-reanimated";
import "./src/services/dashboardBridge";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider as PaperProvider } from "react-native-paper";

import { theme } from "./src/theme";
import DashboardScreen from "./src/screens/DashboardScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import CallSignScreen from "./src/screens/CallSignScreen";
import TimelineScreen from "./src/screens/TimelineScreen";
import StatsScreen from "./src/screens/StatsScreen";

export type RootStackParamList = {
  Dashboard: undefined;
  Settings: undefined;
  CallSign: undefined;
  Timeline: undefined;
  Stats: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="Dashboard"
            screenOptions={{
              headerShown: false,
              animation: "fade"
            }}
          >
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen
              name="CallSign"
              component={CallSignScreen}
              options={{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Timeline"
              component={TimelineScreen}
              options={{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Stats"
              component={StatsScreen}
              options={{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options=  {{
                presentation: "card",
                animation: "slide_from_right",
                headerShown: false
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
