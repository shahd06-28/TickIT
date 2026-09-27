import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, SafeAreaView } from "react-native";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/tokens";
import CollageLayer from "../components/CollageLayer";
import { pickImage } from "../utils/pickImage";

const BOARD_KEY = "board"; // one fixed mood board for now — a per-year board is out of scope here
const CARD_COLORS = [colors.roseSoft, "#EAF0D8", "#FCEFD1", "#DCEAF0"];

export default function GoalsScreen() {
  const {
    goals, addGoal, toggleGoal, boardEdit, setBoardEdit,
    getStickers, addSticker, removeSticker, updateSticker
  } = useApp();
  const [draft, setDraft] = useState("");
  const [linkingSticker, setLinkingSticker] = useState(null);

  const stickers = getStickers("moodboard", BOARD_KEY).map((s) => ({
    ...s,
    goalTag: s.goalId ? (goals.find((g) => g.id === s.goalId)?.text || "") : null
  }));

  const pinCounts = {};
  stickers.forEach((s) => { if (s.goalId) pinCounts[s.goalId] = (pinCounts[s.goalId] || 0) + 1; });

  const submitGoal = () => {
    const text = draft.trim();
    if (!text) return;
    addGoal(text);
    setDraft("");
  };

  const linkTo = (goalId) => {
    if (linkingSticker) updateSticker("moodboard", BOARD_KEY, linkingSticker.id, { goalId });
    setLinkingSticker(null);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <Text style={styles.header}>This Year's Mood Board</Text>
        <Text style={styles.sub}>
          Set intentions now — the Year in Review screen checks back against these in December.
          Build a collage below and pin photos to the intention they represent.
        </Text>

        <View style={styles.boardRow}>
          <Pressable style={[styles.editBtn, boardEdit && styles.editBtnOn]} onPress={() => setBoardEdit(!boardEdit)}>
            <Text style={[styles.editBtnText, boardEdit && styles.editBtnTextOn]}>{boardEdit ? "✓ done" : "✏️ edit board"}</Text>
          </Pressable>
        </View>

        <View style={styles.boardCanvas}>
          <CollageLayer
            level="moodboard"
            stickers={stickers}
            editing={boardEdit}
            onTapSticker={setLinkingSticker}
            onRemove={(id) => removeSticker("moodboard", BOARD_KEY, id)}
          />
        </View>
        {boardEdit && (
          <Pressable
            style={styles.addBoardBtn}
            onPress={async () => { const uri = await pickImage(); if (uri) addSticker("moodboard", BOARD_KEY, uri); }}
          >
            <Text style={styles.addBoardBtnText}>+ add photo to board</Text>
          </Pressable>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add an intention…"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submitGoal}
          />
          <Pressable style={styles.addBtn} onPress={submitGoal}><Text style={styles.addBtnText}>add</Text></Pressable>
        </View>

        <View style={styles.goalGrid}>
          {goals.map((g, i) => (
            <Pressable
              key={g.id}
              onPress={() => toggleGoal(g.id)}
              style={[styles.goalCard, { backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }, g.done && styles.goalCardDone]}
            >
              {pinCounts[g.id] ? <Text style={styles.pinBadge}>📌{pinCounts[g.id]}</Text> : null}
              <Text style={styles.goalText}>{g.text}</Text>
              {g.done && <Text style={styles.goalDoneTag}>✓ living this</Text>}
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!linkingSticker} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pin this photo to an intention</Text>
            <Text style={styles.sub}>Tap one to link it, or clear the link.</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {goals.length === 0 && <Text style={styles.sub}>Add an intention below first, then come back to pin photos to it.</Text>}
              {goals.map((g) => (
                <Pressable
                  key={g.id}
                  style={[styles.linkRow, linkingSticker?.goalId === g.id && styles.linkRowActive]}
                  onPress={() => linkTo(g.id)}
                >
                  <Text style={[styles.linkRowText, linkingSticker?.goalId === g.id && styles.linkRowTextActive]}>{g.text}</Text>
                  {linkingSticker?.goalId === g.id && <Text style={styles.linkRowTextActive}>✓</Text>}
                </Pressable>
              ))}
              {linkingSticker?.goalId && (
                <Pressable style={styles.linkRow} onPress={() => linkTo(null)}>
                  <Text style={{ color: colors.rose, textAlign: "center", flex: 1 }}>clear link</Text>
                </Pressable>
              )}
            </ScrollView>
            <Pressable onPress={() => setLinkingSticker(null)} style={{ alignSelf: "flex-end", marginTop: 10 }}>
              <Text style={styles.close}>close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { fontSize: 24, fontWeight: "700", color: colors.ink, paddingHorizontal: 16, marginTop: 8 },
  sub: { fontSize: 11, color: colors.inkSoft, marginTop: 4, marginBottom: 8, paddingHorizontal: 16 },
  boardRow: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16 },
  editBtn: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 9 },
  editBtnOn: { backgroundColor: colors.moss, borderColor: colors.moss },
  editBtnText: { fontSize: 12, color: colors.ink },
  editBtnTextOn: { color: colors.cream },
  boardCanvas: {
    height: 260, marginHorizontal: 16, marginTop: 6, backgroundColor: colors.cream, borderWidth: 1,
    borderColor: colors.line, borderRadius: 12, position: "relative", overflow: "hidden"
  },
  addBoardBtn: {
    alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.line, borderStyle: "dashed", backgroundColor: colors.cream
  },
  addBoardBtnText: { fontSize: 11, color: colors.inkSoft },
  inputRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginTop: 14, marginBottom: 12 },
  input: { flex: 1, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  addBtn: { backgroundColor: colors.moss, borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
  addBtnText: { color: colors.cream, fontWeight: "700" },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 16 },
  goalCard: { width: "47%", minHeight: 90, borderRadius: 12, padding: 10, justifyContent: "space-between", position: "relative" },
  goalCardDone: { opacity: 0.6 },
  pinBadge: { position: "absolute", top: 6, right: 8, fontSize: 10 },
  goalText: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  goalDoneTag: { fontSize: 10, color: colors.mossDeep, fontWeight: "700", marginTop: 6 },
  modalBg: { flex: 1, backgroundColor: "#00000055", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.cream, borderRadius: 14, padding: 16, maxHeight: "70%" },
  modalTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  linkRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10,
    borderRadius: 10, borderWidth: 1, borderColor: colors.line, marginTop: 6, backgroundColor: colors.paper
  },
  linkRowActive: { backgroundColor: colors.moss, borderColor: colors.moss },
  linkRowText: { fontSize: 12, color: colors.ink },
  linkRowTextActive: { color: colors.cream, fontWeight: "700" },
  close: { color: colors.inkSoft, fontSize: 12 }
});
