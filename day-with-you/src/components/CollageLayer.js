import React, { useRef } from "react";
import { View, Image, Text, StyleSheet, PanResponder, Animated, Alert } from "react-native";
import { colors } from "../theme/tokens";

const PHOTO_SIZE = 72;
const TAPE_COLORS = ["#BFE3D0", "#F4C6D2", "#D4CCF0", "#F6E27A"];
const TILTS = [-4, 3, -2, 5, -3, 2];
const LONG_PRESS_MS = 800;

// Turns a sticker id into a stable number, so each photo keeps the same tilt and tape color.
function hashId(id) {
  const text = String(id ?? "");
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

// Renders draggable (when `editing`) stickers absolutely positioned over its parent.
// `onTapSticker(sticker)` fires on a plain tap (no drag) — used by the mood board to open
// the goal-link picker; Day/Week/Month just pass nothing and rely on long-press-to-remove.
export default function CollageLayer({ level, dateKey, stickers, editing, onTapSticker, onRemove }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={editing ? "box-none" : "none"}>
      {stickers.map((s) => (
        <DraggableSticker
          key={s.id}
          sticker={s}
          editing={editing}
          onTap={onTapSticker}
          onLongPress={() => onRemove(s.id)}
        />
      ))}
    </View>
  );
}

function DraggableSticker({ sticker, editing, onTap, onLongPress }) {
  const pan = useRef(new Animated.ValueXY({ x: sticker.x || 0, y: sticker.y || 0 })).current;
  const moved = useRef(false);
  const longPressTimer = useRef(null);

  const seed = hashId(sticker.id);
  const tilt = sticker.rot || TILTS[seed % TILTS.length];
  const tape = TAPE_COLORS[seed % TAPE_COLORS.length];

  // Asks before removing, so a stray long touch never deletes a photo.
  const confirmRemove = () => {
    Alert.alert("Remove this photo?", "It will be taken off this page.", [
      { text: "Keep", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onLongPress?.() }
    ]);
  };

  const endTouch = () => {
    clearTimeout(longPressTimer.current);
    pan.flattenOffset();
    sticker.x = pan.x._value;
    sticker.y = pan.y._value;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editing,
      onMoveShouldSetPanResponder: () => editing,
      // Keep the touch while dragging, so the screen's swipe can't steal it.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        moved.current = false;
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        longPressTimer.current = setTimeout(() => {
          if (!moved.current) confirmRemove();
        }, LONG_PRESS_MS);
      },
      onPanResponderMove: (evt, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
          moved.current = true;
          clearTimeout(longPressTimer.current);
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gesture);
      },
      onPanResponderRelease: () => {
        endTouch();
        if (!moved.current) onTap?.(sticker);
      },
      // If something else takes over the touch anyway, cancel the removal timer.
      onPanResponderTerminate: endTouch
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.sticker,
        { transform: [...pan.getTranslateTransform(), { rotate: `${tilt}deg` }] }
      ]}
    >
      <View style={styles.frame}>
        <Image source={{ uri: sticker.uri }} style={styles.image} resizeMode="cover" />
      </View>
      <View style={[styles.tape, { backgroundColor: tape, transform: [{ rotate: `${-tilt * 1.5}deg` }] }]} />
      {sticker.goalTag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>{sticker.goalTag}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sticker: { position: "absolute" },
  frame: {
    backgroundColor: "#FFFFFF",
    padding: 5,
    paddingBottom: 16,
    borderRadius: 2,
    shadowColor: "#22304A",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4
  },
  image: { width: PHOTO_SIZE, height: PHOTO_SIZE, backgroundColor: "#EEF3F8" },
  tape: {
    position: "absolute",
    top: -7,
    alignSelf: "center",
    width: 36,
    height: 13,
    opacity: 0.85
  },
  tag: {
    position: "absolute", left: 0, right: 0, bottom: -16, backgroundColor: colors.moss,
    borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1
  },
  tagText: { color: colors.cream, fontSize: 8, textAlign: "center" }
});