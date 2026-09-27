import React from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, SafeAreaView } from "react-native";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/tokens";

export default function NotesScreen() {
  const { notes, activeNoteId, setActiveNoteId, addNote, updateNote, deleteNote } = useApp();
  const activeNote = notes.find((n) => n.id === activeNoteId);

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.header}>Notes</Text>
      <View style={styles.tabRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
          {notes.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.tab, n.id === activeNoteId && styles.tabActive]}
              onPress={() => setActiveNoteId(n.id)}
            >
              <Text style={[styles.tabText, n.id === activeNoteId && styles.tabTextActive]} numberOfLines={1}>
                {n.title || "Untitled"}
              </Text>
              <Pressable onPress={() => deleteNote(n.id)} hitSlop={8}>
                <Text style={styles.tabX}>✕</Text>
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable style={styles.addTabBtn} onPress={addNote}>
          <Text style={styles.addTabBtnText}>+</Text>
        </Pressable>
      </View>

      {activeNote ? (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <TextInput
            style={styles.titleInput}
            value={activeNote.title}
            onChangeText={(t) => updateNote(activeNote.id, { title: t })}
            placeholder="Note title"
          />
          <TextInput
            style={styles.bodyInput}
            value={activeNote.body}
            onChangeText={(t) => updateNote(activeNote.id, { body: t })}
            placeholder="Write anything…"
            multiline
            textAlignVertical="top"
          />
        </View>
      ) : (
        <Text style={styles.empty}>No notes yet — tap + to add your first note tab.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { fontSize: 24, fontWeight: "700", color: colors.ink, paddingHorizontal: 16, paddingTop: 8 },
  tabRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.cream
  },
  tabActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  tabText: { fontSize: 11, color: colors.ink, maxWidth: 100 },
  tabTextActive: { color: colors.cream, fontWeight: "700" },
  tabX: { fontSize: 10, color: colors.inkSoft, opacity: 0.7 },
  addTabBtn: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.line, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center"
  },
  addTabBtnText: { fontSize: 16, color: colors.inkSoft },
  titleInput: {
    fontSize: 15, fontWeight: "700", color: colors.ink, borderBottomWidth: 2, borderColor: colors.line,
    paddingVertical: 6
  },
  bodyInput: { flex: 1, fontSize: 13, color: colors.ink, marginTop: 8, padding: 4 },
  empty: { textAlign: "center", color: colors.inkSoft, fontSize: 12, marginTop: 30 }
});
