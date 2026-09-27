import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "./src/context/AppContext";
import AppNavigator from "./src/navigation/AppNavigator";
import ScrapbookButton from "./src/components/ScrapbookButton.js";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <StatusBar style="dark" />
        <AppNavigator />
        <ScrapbookButton />
      </AppProvider>
    </GestureHandlerRootView>
  );
}