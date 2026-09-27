import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useApp } from "../../context/AppContext";
import { colors } from "../../theme/tokens";
import { getWeekDates, mondayOf, toMinutes, todayISO } from "../../utils/time";
import CollageLayer from "../../components/CollageLayer";
import SwipeZoomArea from "../../components/SwipeZoomArea";
import { pickImage } from "../../utils/pickImage";

const LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeekLevel({ focus, onShiftWeek, onPinchOut, onOpenDay }) {
  const { events, editMode, getStickers, addSticker, removeSticker } = useApp();
  const weekDates = getWeekDates(focus);
  const monday = mondayOf(focus);
  const today = todayISO();

  return (
    <SwipeZoomArea
      style={{ flex: 1 }}
      onSwipeLeft={() => onShiftWeek(1)}
      onSwipeRight={() => onShiftWeek(-1)}
      onPinchOut={onPinchOut}
    >
      <View style={styles.grid}>
        {LABELS.map((label, i) => {
          const d = weekDates[i];
          const iso = d.toISOString().slice(0, 10);
          const isToday = iso === today;
          return (
            <Pressable key={label} style={styles.col} onPress={() => onOpenDay(iso)}>
              <View style={[styles.dayHead, isToday && styles.dayHeadToday]}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{label}</Text>
                <Text style={[styles.dayNum, isToday && styles.dayLabelToday]}>{d.getDate()}</Text>
              </View>
              <View style={styles.body}>
                {isToday && events.map((e) => {
                  const top = (toMinutes(e.start) - 7 * 60) * 0.5;
                  const height = Math.max((toMinutes(e.end) - toMinutes(e.start)) * 0.5, 16);
                  return (
                    <View key={e.id} style={[styles.miniCell, { top, height }]}>
                      <Text numberOfLines={2} style={styles.miniCellText}>{e.title}</Text>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          );
        })}
      </View>
      <CollageLayer
        level="week"
        stickers={getStickers("week", monday)}
        editing={editMode}
        onRemove={(id) => removeSticker("week", monday, id)}
      />
      {editMode && (
        <Pressable
          style={styles.addFab}
          onPress={async () => { const uri = await pickImage(); if (uri) addSticker("week", monday, uri); }}
        >
          <Text style={styles.addFabText}>+</Text>
        </Pressable>
      )}
    </SwipeZoomArea>
  );
}

const styles = StyleSheet.create({
  grid: { flex: 1, flexDirection: "row" },
  col: { flex: 1, borderRightWidth: 1, borderColor: colors.line, minWidth: 0 },
  dayHead: { alignItems: "center", paddingVertical: 6, backgroundColor: colors.paperDark },
  dayHeadToday: { backgroundColor: colors.moss },
  dayLabel: { fontSize: 11, fontWeight: "700", color: colors.ink },
  dayLabelToday: { color: colors.cream },
  dayNum: { fontSize: 9, color: colors.ink },
  body: { flex: 1, minHeight: 420, position: "relative" },
  miniCell: {
    position: "absolute", left: 2, right: 2, backgroundColor: colors.cream, borderWidth: 1,
    borderColor: colors.line, borderRadius: 5, padding: 2
  },
  miniCellText: { fontSize: 8, color: colors.ink },
  addFab: {
    position: "absolute", right: 12, bottom: 12, width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.moss, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 4
  },
  addFabText: { color: colors.cream, fontSize: 20, fontWeight: "700" }
});
