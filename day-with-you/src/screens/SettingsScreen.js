import React, { useState } from "react";
import { View, Text, Pressable, TextInput, Modal, StyleSheet, SafeAreaView, Switch } from "react-native";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/tokens";

export default function SettingsScreen() {
  const { calendarLink, setCalendarLink } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(calendarLink || "");
  const [cameraRoll, setCameraRoll] = useState(false);

  const openModal = () => { setDraft(calendarLink || ""); setModalOpen(true); };
  const save = () => { setCalendarLink(draft.trim()); setModalOpen(false); };

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.header}>Settings</Text>

      <Row label="Google Calendar" value={calendarLink ? "Link saved (mock)" : "Not connected"} />
      <Pressable style={styles.linkBtn} onPress={openModal}>
        <Text style={styles.linkBtnText}>{calendarLink ? "edit saved calendar link" : "+ paste Google Calendar link"}</Text>
      </Pressable>
      <Text style={styles.note}>
        Saved only for now — nothing fetches or parses it yet. Swap services/googleCalendarService.js
        for expo-auth-session + the real Calendar API, reading this saved link, and every screen
        above it keeps working unchanged.
      </Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Auto-import camera roll photos as stickers</Text>
        <Switch value={cameraRoll} onValueChange={setCameraRoll} />
      </View>

      <Row label="Memory storage" value="AsyncStorage in this build" />
      <Row label="Nudges" value="Rule-based demo" />
      <Row label="Character sprite" value="Your uploaded sheet, sliced + keyed at build time" />

      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Google Calendar link</Text>
            <Text style={styles.note}>Paste your calendar's public ICS URL or share link. Stored on-device only.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://calendar.google.com/calendar/ical/…"
              autoCapitalize="none"
              autoCorrect={false}
              value={draft}
              onChangeText={setDraft}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalOpen(false)}><Text style={styles.cancel}>cancel</Text></Pressable>
              <Pressable onPress={save}><Text style={styles.save}>save</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 16 },
  header: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: 12 },
  row: { marginBottom: 14, borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 8 },
  rowLabel: { fontSize: 12, color: colors.inkSoft },
  rowValue: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  linkBtn: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 10, alignItems: "center", marginBottom: 6 },
  linkBtnText: { color: colors.ink, fontWeight: "700", fontSize: 12 },
  note: { fontSize: 10, color: colors.inkSoft, fontStyle: "italic", marginBottom: 14 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  switchLabel: { fontSize: 12, color: colors.ink, flex: 1, marginRight: 8 },
  modalBg: { flex: 1, backgroundColor: "#00000055", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.cream, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 12, marginTop: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 12 },
  cancel: { color: colors.inkSoft },
  save: { color: colors.mossDeep, fontWeight: "700" }
});
