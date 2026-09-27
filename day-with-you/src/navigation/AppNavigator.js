import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { colors } from "../theme/tokens";

import CalendarScreen from "../screens/CalendarScreen";
import CastScreen from "../screens/CastScreen";
import NotesScreen from "../screens/NotesScreen";
import GoalsScreen from "../screens/GoalsScreen";
import ReviewScreen from "../screens/ReviewScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const ICONS = {
  Calendar: "📅",
  Cast: "🧑‍🎤",
  Notes: "📝",
  Goals: "🌱",
  Review: "🏆",
  Settings: "⚙️"
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.mossDeep,
          tabBarInactiveTintColor: colors.inkSoft,
          tabBarStyle: { backgroundColor: colors.cream, borderTopColor: colors.line },
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
          tabBarLabelStyle: { fontSize: 9 }
        })}
      >
        <Tab.Screen name="Calendar" component={CalendarScreen} />
        <Tab.Screen name="Cast" component={CastScreen} />
        <Tab.Screen name="Notes" component={NotesScreen} />
        <Tab.Screen name="Goals" component={GoalsScreen} />
        <Tab.Screen name="Review" component={ReviewScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
