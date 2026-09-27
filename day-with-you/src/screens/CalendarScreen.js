import React from "react";
import { View, Text, Pressable, StyleSheet, SafeAreaView } from "react-native";
import { useApp } from "../context/AppContext";
import { colors } from "../theme/tokens";
import { addDaysIso, todayISO } from "../utils/time";
import MonthLevel from "./calendar/MonthLevel";
import WeekLevel from "./calendar/WeekLevel";
import DayLevel from "./calendar/DayLevel";

const TITLES = {
  month: ["Calendar", "Scroll to browse months. Tap a day to open its week."],
  week: ["This Week", "Swipe for other weeks · tap a day to open it · pinch out to zoom back to Month"],
  day: ["", "Swipe for other days · pinch out to zoom back to Week"]
};

export default function CalendarScreen() {
  const { calendarLevel, setCalendarLevel, calendarFocus, setCalendarFocus, editMode, setEditMode } = useApp();

  const goToMonth = () => setCalendarLevel("month");
  const goToWeek = () => setCalendarLevel("week");
  const openWeekFor = (iso) => { setCalendarFocus(iso); setCalendarLevel("week"); };
  const openDay = (iso) => { setCalendarFocus(iso); setCalendarLevel("day"); };
  const shiftWeek = (n) => setCalendarFocus(addDaysIso(calendarFocus, n * 7));
  const shiftDay = (n) => setCalendarFocus(addDaysIso(calendarFocus, n));

  const title = calendarLevel === "day"
    ? new Date(calendarFocus).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })
    : TITLES[calendarLevel][0];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{TITLES[calendarLevel][1]}</Text>
        </View>
        <Pressable style={[styles.editBtn, editMode && styles.editBtnOn]} onPress={() => setEditMode(!editMode)}>
          <Text style={[styles.editBtnText, editMode && styles.editBtnTextOn]}>{editMode ? "✓ done" : "✏️ edit"}</Text>
        </Pressable>
      </View>

      <View style={styles.crumb}>
        {calendarLevel === "week" && <Pressable onPress={goToMonth}><Text style={styles.crumbLink}>← Month</Text></Pressable>}
        {calendarLevel === "day" && <Pressable onPress={goToWeek}><Text style={styles.crumbLink}>← Week</Text></Pressable>}
      </View>

      <View style={{ flex: 1 }}>
        {calendarLevel === "month" && <MonthLevel onOpenWeek={openWeekFor} />}
        {calendarLevel === "week" && (
          <WeekLevel focus={calendarFocus} onShiftWeek={shiftWeek} onPinchOut={goToMonth} onOpenDay={openDay} />
        )}
        {calendarLevel === "day" && (
          <DayLevel focus={calendarFocus} onShiftDay={shiftDay} onPinchOut={goToWeek} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  title: { fontSize: 21, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 10.5, color: colors.inkSoft, marginTop: 2 },
  editBtn: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 9, paddingVertical: 6, paddingHorizontal: 9 },
  editBtnOn: { backgroundColor: colors.moss, borderColor: colors.moss },
  editBtnText: { fontSize: 12, color: colors.ink },
  editBtnTextOn: { color: colors.cream },
  crumb: { paddingHorizontal: 16, marginTop: 4, minHeight: 18 },
  crumbLink: { fontSize: 11, color: colors.mossDeep, fontWeight: "700" }
});
