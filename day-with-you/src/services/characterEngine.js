import { useEffect, useRef, useState } from "react";
import { FRAME_SETS } from "../data/frameSets";
import { TYPE_TO_FRAMESET, TYPE_LABEL } from "../data/mockData";
import { toMinutes } from "../utils/time";

export function findEventAt(events, minutes) {
  return events.find((e) => minutes >= toMinutes(e.start) && minutes < toMinutes(e.end));
}

export function frameSetForEvent(activeEvent) {
  if (!activeEvent) return { setName: "walk", label: "walking" };
  const setName = TYPE_TO_FRAMESET[activeEvent.type] || "study";
  return { setName, label: TYPE_LABEL[activeEvent.type] || "…" };
}

// Advances through a named frame set on a fixed tick. Pass `active=false` to freeze it
// (e.g. when the screen isn't visible) without unmounting.
export function useFrameLoop(setName, active = true, intervalMs = 420) {
  const [index, setIndex] = useState(0);
  const frames = FRAME_SETS[setName] || FRAME_SETS.walk;
  const savedSetName = useRef(setName);

  useEffect(() => {
    if (savedSetName.current !== setName) {
      savedSetName.current = setName;
      setIndex(0);
    }
  }, [setName]);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % frames.length), intervalMs);
    return () => clearInterval(id);
  }, [active, frames.length, intervalMs]);

  return frames[index % frames.length];
}
