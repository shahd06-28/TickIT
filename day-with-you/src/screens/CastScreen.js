import React from "react";
import { View, Text, Image, StyleSheet, SafeAreaView } from "react-native";
import { colors } from "../theme/tokens";
import { FRAME_SETS } from "../data/frameSets";

export default function CastScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.header}>Choose Your Character</Text>
      <Text style={styles.sub}>
        This is the one character sheet provided so far. Drop in more sprite sheets later
        (see src/data/frameSets.js) for real alternate characters.
      </Text>
      <View style={styles.card}>
        <Image source={FRAME_SETS.walk[0]} style={styles.sprite} resizeMode="contain" />
        <Text style={styles.name}>Pink-Hair Girl</Text>
        <Text style={styles.tag}>✓ your uploaded sheet</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  header: { fontSize: 24, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 11, color: colors.inkSoft, marginTop: 4, marginBottom: 14 },
  card: {
    alignSelf: "flex-start", backgroundColor: colors.cream, borderWidth: 2, borderColor: colors.moss,
    borderRadius: 14, padding: 14, alignItems: "center"
  },
  sprite: { width: 70, height: 88 },
  name: { fontSize: 13, fontWeight: "700", color: colors.ink, marginTop: 6 },
  tag: { fontSize: 10, color: colors.mossDeep, fontWeight: "700", marginTop: 2 }
});
