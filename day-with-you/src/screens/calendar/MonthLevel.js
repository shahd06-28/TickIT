import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { useApp } from "../../context/AppContext";
import { colors } from "../../theme/tokens";
import { buildMonthGrid, todayISO } from "../../utils/time";
import { MONTH_NAMES } from "../../data/mockData";
import CollageLayer from "../../components/CollageLayer";
import { pickImage } from "../../utils/pickImage";

// Fixed scrollable window: -6 to +6 months around today. A true infinite-scroll version
// would prepend/append blocks on scroll, but that needs pixel-accurate scroll-position
// preservation that's fragile across RN versions — this fixed window covers a full year of
// browsing either direction, which is plenty for a demo.
const MONTH_OFFSETS = Array.from({ length: 13 }, (_, i) => i - 6);

export default function MonthLevel({ onOpenWeek }) {
  const { memories, editMode, getStickers, addSticker, removeSticker } = useApp();
  const byDate = {};
  memories.forEach((m) => { byDate[m.date] = m; });
  const today = todayISO();

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
      {MONTH_OFFSETS.map((offset) => (
        <MonthBlock
          key={offset}
          offset={offset}
          byDate={byDate}
          today={today}
          editMode={editMode}
          getStickers={getStickers}
          addSticker={addSticker}
          removeSticker={removeSticker}
          onOpenWeek={onOpenWeek}
        />
      ))}
    </ScrollView>
  );
}

function MonthBlock({ offset, byDate, today, editMode, getStickers, addSticker, removeSticker, onOpenWeek }) {
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + offset);
  const year = base.getFullYear(), month = base.getMonth();
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  const grid = buildMonthGrid(year, month);
  const weeks = [];
  for (let w = 0; w < grid.length; w += 7) weeks.push(grid.slice(w, w + 7));

  return (
    <View style={styles.block}>
      <Text style={styles.title}>{MONTH_NAMES[month]} {year}</Text>
      <View style={styles.weekHeaderRow}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <Text key={i} style={styles.weekHeaderCell}>{d}</Text>)}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((cell) => {
            const mem = byDate[cell.iso];
            return (
              <Pressable
                key={cell.iso}
                style={[styles.dayCell, !cell.inMonth && styles.dayCellOutside, cell.iso === today && styles.dayCellToday]}
                onPress={() => onOpenWeek(cell.iso)}
              >
                <Text style={styles.dayNum}>{cell.date.getDate()}</Text>
                {mem ? <Text numberOfLines={2} style={styles.dayQuote}>"{mem.note}"</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ))}
      <CollageLayer
        level="month"
        stickers={getStickers("month", key)}
        editing={editMode}
        onRemove={(id) => removeSticker("month", key, id)}
      />
      {editMode && (
        <Pressable
          style={styles.addBtn}
          onPress={async () => { const uri = await pickImage(); if (uri) addSticker("month", key, uri); }}
        >
          <Text style={styles.addBtnText}>+ add photo to {MONTH_NAMES[month]}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 18, position: "relative", paddingHorizontal: 12 },
  title: { fontSize: 15, fontWeight: "700", textAlign: "center", marginBottom: 4, color: colors.ink },
  weekHeaderRow: { flexDirection: "row" },
  weekHeaderCell: { flex: 1, textAlign: "center", fontSize: 10, color: colors.inkSoft, fontWeight: "700" },
  weekRow: { flexDirection: "row", gap: 3, marginBottom: 3 },
  dayCell: { flex: 1, minHeight: 56, borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 3, backgroundColor: colors.cream },
  dayCellOutside: { opacity: 0.4, backgroundColor: colors.paperDark },
  dayCellToday: { borderColor: colors.moss, borderWidth: 2 },
  dayNum: { fontSize: 10, fontWeight: "700", color: colors.ink },
  dayQuote: { fontSize: 7, fontStyle: "italic", color: colors.rose, marginTop: 2 },
  addBtn: {
    alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.line, borderStyle: "dashed", backgroundColor: colors.cream
  },
  addBtnText: { fontSize: 11, color: colors.inkSoft }
});
