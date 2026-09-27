import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { TODAYS_EVENTS, SEED_MEMORIES, SEED_GOALS } from "../data/mockData";
import { todayISO } from "../utils/time";
import * as calendarService from "../services/googleCalendarService";

const AppContext = createContext(null);

const KEYS = {
  memories: "dwy_memories",
  missed: "dwy_missed",
  goals: "dwy_goals",
  notes: "dwy_notes",
  calendarLink: "dwy_cal_link",
  stickersDay: "dwy_stickers_day",
  stickersWeek: "dwy_stickers_week",
  stickersMonth: "dwy_stickers_month",
  stickersBoard: "dwy_stickers_board"
};

async function load(key, fallback) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
async function save(key, value) {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [events] = useState(TODAYS_EVENTS); // mock: same events regardless of date
  const [memories, setMemories] = useState(SEED_MEMORIES);
  const [missed, setMissed] = useState([]);
  const [goals, setGoals] = useState(SEED_GOALS);
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [calendarLink, setCalendarLinkState] = useState("");

  // Sticker collage buckets — one per calendar level, plus the mood board.
  const [stickersByDay, setStickersByDay] = useState({});
  const [stickersByWeek, setStickersByWeek] = useState({});
  const [stickersByMonth, setStickersByMonth] = useState({});
  const [stickersByBoard, setStickersByBoard] = useState({});

  // Calendar drill-down state: Month -> Week -> Day.
  const [calendarLevel, setCalendarLevel] = useState("month"); // 'month' | 'week' | 'day'
  const [calendarFocus, setCalendarFocus] = useState(todayISO());
  const [editMode, setEditMode] = useState(false); // calendar edit mode (Month/Week/Day)
  const [boardEdit, setBoardEditState] = useState(false); // mood-board edit mode

  const [visited, setVisited] = useState({});

  useEffect(() => {
    (async () => {
      const [mem, miss, g, n, link, sd, sw, sm, sb] = await Promise.all([
        load(KEYS.memories, SEED_MEMORIES),
        calendarService.fetchMissedFromYesterday(),
        load(KEYS.goals, SEED_GOALS),
        load(KEYS.notes, []),
        load(KEYS.calendarLink, ""),
        load(KEYS.stickersDay, {}),
        load(KEYS.stickersWeek, {}),
        load(KEYS.stickersMonth, {}),
        load(KEYS.stickersBoard, {})
      ]);
      setMemories(mem);
      setMissed(miss);
      setGoals(g);
      setNotes(n);
      if (n.length) setActiveNoteId(n[0].id);
      setCalendarLinkState(link);
      setStickersByDay(sd);
      setStickersByWeek(sw);
      setStickersByMonth(sm);
      setStickersByBoard(sb);
      setReady(true);
    })();
  }, []);

  const recordMemory = useCallback((partial) => {
    setMemories((prev) => {
      const iso = todayISO();
      const memory = { id: `m-${iso}-${partial.eventId || Date.now()}`, date: iso, note: "", person: null, ...partial };
      const next = [...prev.filter((m) => m.id !== memory.id), memory];
      save(KEYS.memories, next);
      return next;
    });
  }, []);

  const dismissMissed = useCallback((id) => {
    setMissed((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addGoal = useCallback((text) => {
    setGoals((prev) => {
      const next = [...prev, { id: "g-" + Date.now(), text, done: false }];
      save(KEYS.goals, next);
      return next;
    });
  }, []);
  const toggleGoal = useCallback((id) => {
    setGoals((prev) => {
      const next = prev.map((g) => (g.id === id ? { ...g, done: !g.done } : g));
      save(KEYS.goals, next);
      return next;
    });
  }, []);

  const addNote = useCallback(() => {
    setNotes((prev) => {
      const note = { id: "n-" + Date.now(), title: `Note ${prev.length + 1}`, body: "" };
      const next = [...prev, note];
      save(KEYS.notes, next);
      setActiveNoteId(note.id);
      return next;
    });
  }, []);
  const updateNote = useCallback((id, patch) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch } : n));
      save(KEYS.notes, next);
      return next;
    });
  }, []);
  const deleteNote = useCallback((id) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      save(KEYS.notes, next);
      setActiveNoteId((cur) => (cur === id ? (next[0]?.id || null) : cur));
      return next;
    });
  }, []);

  const setCalendarLink = useCallback((url) => {
    setCalendarLinkState(url);
    save(KEYS.calendarLink, url);
  }, []);

  // ---- generic sticker bucket helpers, shared by Month/Week/Day + the mood board ----
  const bucketSetters = { day: setStickersByDay, week: setStickersByWeek, month: setStickersByMonth, moodboard: setStickersByBoard };
  const buckets = { day: stickersByDay, week: stickersByWeek, month: stickersByMonth, moodboard: stickersByBoard };
  const bucketSaveKey = { day: KEYS.stickersDay, week: KEYS.stickersWeek, month: KEYS.stickersMonth, moodboard: KEYS.stickersBoard };

  const getStickers = useCallback((level, key) => (buckets[level][key] || []), [stickersByDay, stickersByWeek, stickersByMonth, stickersByBoard]);

  const addSticker = useCallback((level, key, uri) => {
    const setter = bucketSetters[level];
    setter((prev) => {
      const list = prev[key] || [];
      const sticker = {
        id: "s-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        uri,
        x: 16 + (list.length % 4) * 16,
        y: 16 + (list.length % 4) * 16,
        rot: Math.round(Math.random() * 16 - 8),
        goalId: null
      };
      const next = { ...prev, [key]: [...list, sticker] };
      save(bucketSaveKey[level], next);
      return next;
    });
  }, []);

  const updateSticker = useCallback((level, key, id, patch) => {
    const setter = bucketSetters[level];
    setter((prev) => {
      const list = prev[key] || [];
      const next = { ...prev, [key]: list.map((s) => (s.id === id ? { ...s, ...patch } : s)) };
      save(bucketSaveKey[level], next);
      return next;
    });
  }, []);

  const removeSticker = useCallback((level, key, id) => {
    const setter = bucketSetters[level];
    setter((prev) => {
      const list = prev[key] || [];
      const next = { ...prev, [key]: list.filter((s) => s.id !== id) };
      save(bucketSaveKey[level], next);
      return next;
    });
  }, []);

  const markVisited = useCallback((eventId) => {
    setVisited((prev) => ({ ...prev, [eventId]: true }));
  }, []);

  const value = useMemo(() => ({
    ready,
    events, memories, missed, goals, notes, activeNoteId, calendarLink,
    calendarLevel, setCalendarLevel, calendarFocus, setCalendarFocus,
    editMode, setEditMode, boardEdit, setBoardEdit: setBoardEditState,
    visited, markVisited,
    recordMemory, dismissMissed, addGoal, toggleGoal,
    addNote, updateNote, deleteNote, setActiveNoteId,
    setCalendarLink,
    getStickers, addSticker, updateSticker, removeSticker
  }), [ready, events, memories, missed, goals, notes, activeNoteId, calendarLink,
    calendarLevel, calendarFocus, editMode, boardEdit, visited,
    stickersByDay, stickersByWeek, stickersByMonth, stickersByBoard]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
