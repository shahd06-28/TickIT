import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Modal, TextInput, StyleSheet, Image } from "react-native";
import { useApp } from "../../context/AppContext";
import { colors } from "../../theme/tokens";
import { toMinutes, minutesToLabel, nowMinutes, todayISO, clamp } from "../../utils/time";
import { DAY_START, DAY_END, TYPE_COLOR } from "../../data/mockData";
import { findEventAt, frameSetForEvent, useFrameLoop } from "../../services/characterEngine";
import { generateNudges } from "../../services/nudgeEngine";
import Character from "../../components/Character";
import CollageLayer from "../../components/CollageLayer";
import SwipeZoomArea from "../../components/SwipeZoomArea";
import { pickImage } from "../../utils/pickImage";

const PX_PER_MIN = 1.4;
const TRACK_HEIGHT = (DAY_END - DAY_START) * PX_PER_MIN;

export default function DayLevel({ focus, onShiftDay, onPinchOut }) {
  const {
    events, memories, missed, recordMemory, dismissMissed, visited, markVisited,
    editMode, getStickers, addSticker, removeSticker
  } = useApp();

  const isToday = focus === todayISO();
  const [nowM, setNowM] = useState(nowMinutes());
  const [editingEvent, setEditingEvent] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");

  // Keep "now" live so the character's position/lock state updates while the screen is open.
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setNowM(nowMinutes()), 15000);
    return () => clearInterval(id);
  }, [isToday]);

  const active = isToday ? findEventAt(events, nowM) : null;
  const nudges = isToday ? generateNudges({ events, memories }) : [];
  const pushFrame = useFrameLoop("push", isToday && missed.length > 0);

  useEffect(() => {
    if (isToday && active && !visited[active.id]) {
      markVisited(active.id);
      recordMemory({ eventId: active.id, note: `Spent time on "${active.title}".`, person: (active.people || [])[0] || null });
    }
  }, [active?.id]);

  const charTop = clamp((nowM - DAY_START) * PX_PER_MIN - 30, 0, TRACK_HEIGHT - 64);
  const { setName, label } = frameSetForEvent(active);

  const openEditor = (event) => {
    const existing = memories.find((m) => m.eventId === event.id);
    setNoteDraft(existing ? existing.note : "");
    setEditingEvent(event);
  };
  const saveEditor = () => {
    recordMemory({ eventId: editingEvent.id, note: noteDraft, person: (editingEvent.people || [])[0] || null });
    setEditingEvent(null);
  };

  return (
    <SwipeZoomArea style={{ flex: 1 }} onSwipeLeft={() => onShiftDay(1)} onSwipeRight={() => onShiftDay(-1)} onPinchOut={onPinchOut}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {isToday && missed.length > 0 && (
          <View style={styles.missedBanner}>
            <Image source={pushFrame} style={styles.pushSprite} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.missedTitle}>pushing what we didn't get to yesterday:</Text>
              {missed.map((t) => (
                <View key={t.id} style={styles.missedRow}>
                  <Text style={styles.missedText}>{t.title}</Text>
                  <Pressable onPress={() => dismissMissed(t.id)}>
                    <Text style={styles.pushedLink}>pushed ➜</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
        {isToday && nudges.map((n, i) => (
          <View key={i} style={styles.nudge}><Text style={styles.nudgeText}>💭 {n}</Text></View>
        ))}

        <View style={{ height: TRACK_HEIGHT, position: "relative", marginTop: 8 }}>
          {Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }).map((_, i) => {
            const mins = DAY_START + i * 60;
            return (
              <View key={i} style={[styles.hourRow, { top: i * 60 * PX_PER_MIN }]}>
                <Text style={styles.hourLabel}>{minutesToLabel(mins)}</Text>
                <View style={styles.hourLine} />
              </View>
            );
          })}

          {events.map((e) => {
            const top = (toMinutes(e.start) - DAY_START) * PX_PER_MIN;
            const height = Math.max((toMinutes(e.end) - toMinutes(e.start)) * PX_PER_MIN, 46);
            const isActive = active?.id === e.id;
            const hasMemory = memories.some((m) => m.eventId === e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() => openEditor(e)}
                style={[styles.eventBlock, { top, height, borderColor: TYPE_COLOR[e.type] || colors.line, backgroundColor: isActive ? colors.cream : "#FFFFFFAA" }]}
              >
                <View style={[styles.eventTab, { backgroundColor: TYPE_COLOR[e.type] || colors.line }]} />
                <View style={styles.eventBody}>
                  <Text style={styles.eventTime}>{e.start} – {e.end}</Text>
                  <Text style={styles.eventTitle} numberOfLines={2}>{e.title}</Text>
                </View>
                {hasMemory && <Text style={styles.pin}>📌</Text>}
              </Pressable>
            );
          })}

          {isToday && <Character topOffset={charTop} setName={setName} label={label} locked={!!active} />}

          <CollageLayer
            level="day"
            stickers={getStickers("day", focus)}
            editing={editMode}
            onRemove={(id) => removeSticker("day", focus, id)}
          />
        </View>
      </ScrollView>

      {editMode && (
        <Pressable
          style={styles.addFab}
          onPress={async () => { const uri = await pickImage(); if (uri) addSticker("day", focus, uri); }}
        >
          <Text style={styles.addFabText}>+</Text>
        </Pressable>
      )}

      <Modal visible={!!editingEvent} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{editingEvent?.title}</Text>
            <TextInput style={styles.modalInput} placeholder="What happened here?" multiline value={noteDraft} onChangeText={setNoteDraft} />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditingEvent(null)}><Text style={styles.cancel}>cancel</Text></Pressable>
              <Pressable onPress={saveEditor}><Text style={styles.save}>save memory</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SwipeZoomArea>
  );
}

const styles = StyleSheet.create({
  missedBanner: { flexDirection: "row", gap: 8, backgroundColor: colors.roseSoft, borderRadius: 10, padding: 10, marginHorizontal: 16, marginTop: 8, alignItems: "center" },
  pushSprite: { width: 34, height: 42 },
  missedTitle: { fontSize: 11, fontWeight: "700", color: colors.ink, marginBottom: 2 },
  missedRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  missedText: { fontSize: 11, color: colors.ink, flex: 1 },
  pushedLink: { fontSize: 11, color: colors.mossDeep, fontWeight: "700" },
  nudge: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 8, marginHorizontal: 16, marginTop: 6 },
  nudgeText: { fontSize: 12, color: colors.ink },
  hourRow: { position: "absolute", left: 0, right: 0, flexDirection: "row" },
  hourLabel: { width: 56, fontSize: 10, color: colors.inkSoft, paddingLeft: 8, paddingTop: 2 },
  hourLine: { flex: 1, borderTopWidth: 1, borderColor: colors.line, marginTop: 8, marginRight: 16 },
  eventBlock: { position: "absolute", left: 68, right: 16, borderWidth: 2, borderRadius: 4, flexDirection: "row", overflow: "hidden" },
  eventTab: { width: 6 },
  eventBody: { flex: 1, padding: 8, justifyContent: "center" },
  eventTime: { fontSize: 10, color: colors.inkSoft },
  eventTitle: { fontSize: 13, color: colors.ink, fontWeight: "600" },
  pin: { position: "absolute", right: 6, top: 6, fontSize: 14 },
  addFab: {
    position: "absolute", right: 16, bottom: 16, width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.moss, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4
  },
  addFabText: { color: colors.cream, fontSize: 20, fontWeight: "700" },
  modalBg: { flex: 1, backgroundColor: "#00000055", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.cream, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  modalInput: { minHeight: 70, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, fontSize: 13, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 16, marginTop: 12 },
  cancel: { color: colors.inkSoft },
  save: { color: colors.mossDeep, fontWeight: "700" }
});
