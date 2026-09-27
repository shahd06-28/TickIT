import React, { useRef } from "react";
import { View, Image, Text, StyleSheet, PanResponder, Animated } from "react-native";
import { colors } from "../theme/tokens";

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => editing,
      onMoveShouldSetPanResponder: () => editing,
      onPanResponderGrant: () => {
        moved.current = false;
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        longPressTimer.current = setTimeout(() => {
          if (!moved.current) onLongPress?.();
        }, 550);
      },
      onPanResponderMove: (evt, gesture) => {
        if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
          moved.current = true;
          clearTimeout(longPressTimer.current);
        }
        Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gesture);
      },
      onPanResponderRelease: () => {
        clearTimeout(longPressTimer.current);
        pan.flattenOffset();
        sticker.x = pan.x._value;
        sticker.y = pan.y._value;
        if (!moved.current) onTap?.(sticker);
      }
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.sticker,
        { transform: [...pan.getTranslateTransform(), { rotate: `${sticker.rot || 0}deg` }] }
      ]}
    >
      <Image source={{ uri: sticker.uri }} style={styles.image} resizeMode="contain" />
      {sticker.goalTag ? (
        <View style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>{sticker.goalTag}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sticker: { position: "absolute", width: 72, height: 72 },
  image: { width: "100%", height: "100%", borderRadius: 4 },
  tag: {
    position: "absolute", left: 0, right: 0, bottom: -16, backgroundColor: colors.moss,
    borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1
  },
  tagText: { color: colors.cream, fontSize: 8, textAlign: "center" }
});
