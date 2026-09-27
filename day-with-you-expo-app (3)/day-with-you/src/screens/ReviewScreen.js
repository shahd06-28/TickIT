import React from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/tokens";
import { MONTH_NAMES } from "../data/mockData";

export default function ReviewScreen() {
  const { goals, memories } = useApp();
  const done = goals.filter((g) => g.done).length;

  const byMonth = {};
  memories.forEach((m) => {
    const mo = new Date(m.date).getMonth();
    (byMonth[mo] = byMonth[mo] || []).push(m);
  });

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Text style={styles.header}>Year in Review</Text>
        <Text style={styles.sub}>Compares what actually got recorded against the intentions set on the Mood Board.</Text>

        <View style={styles.statCard}>
          <Text style={styles.statNum}>{done}/{goals.length}</Text>
          <Text style={styles.statLabel}>intentions you're actually living</Text>
        </View>

        {goals.map((g) => (
          <View key={g.id} style={styles.goalRow}>
            <Text style={styles.goalCheck}>{g.done ? "✓" : "○"}</Text>
            <Text style={[styles.goalText, g.done && styles.goalTextDone]}>{g.text}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Month covers</Text>
        <View style={styles.monthGrid}>
          {MONTH_NAMES.map((name, i) => {
            const list = byMonth[i] || [];
            const cover = list[list.length - 1];
            return (
              <View key={name} style={styles.monthTile}>
                <Text style={styles.monthName}>{name}</Text>
                <Text numberOfLines={3} style={styles.monthQuote}>{cover ? `"${cover.note}"` : "—"}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { fontSize: 24, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 11, color: colors.inkSoft, marginTop: 4, marginBottom: 12 },
  statCard: { backgroundColor: colors.moss, borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 16 },
  statNum: { fontSize: 32, fontWeight: "800", color: colors.cream },
  statLabel: { fontSize: 12, color: colors.cream, marginTop: 2 },
  goalRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  goalCheck: { fontSize: 14, color: colors.mossDeep, width: 18 },
  goalText: { fontSize: 13, color: colors.ink },
  goalTextDone: { textDecorationLine: "line-through", color: colors.inkSoft },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginTop: 16, marginBottom: 8 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  monthTile: { width: "31%", minHeight: 70, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 6 },
  monthName: { fontSize: 10, fontWeight: "700", color: colors.ink },
  monthQuote: { fontSize: 9, color: colors.rose, fontStyle: "italic", marginTop: 2 }
});
