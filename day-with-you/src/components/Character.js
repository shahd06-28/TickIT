import React, { useEffect, useRef } from "react";
import { Animated, View, Text, Image, StyleSheet } from "react-native";
import { colors } from "../theme/tokens";
import { useFrameLoop } from "../services/characterEngine";

export default function Character({ topOffset, setName, label, locked }) {
  const anim = useRef(new Animated.Value(topOffset)).current;
  const frameSource = useFrameLoop(setName, true);

  useEffect(() => {
    Animated.timing(anim, { toValue: topOffset, duration: 500, useNativeDriver: false }).start();
  }, [topOffset]);

  return (
    <Animated.View style={[styles.wrap, { top: anim }]}>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText} numberOfLines={1}>{label}</Text>
      </View>
      <View style={[styles.spriteBox, locked && styles.spriteBoxLocked]}>
        <Image source={frameSource} style={styles.sprite} resizeMode="contain" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 4, alignItems: "center", zIndex: 6 },
  bubble: {
    backgroundColor: colors.cream, borderColor: colors.line, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2, marginBottom: 2, maxWidth: 110
  },
  bubbleText: { fontSize: 9, color: colors.inkSoft },
  spriteBox: { width: 52, height: 64, alignItems: "center", justifyContent: "flex-end" },
  spriteBoxLocked: {
    shadowColor: colors.moss, shadowOpacity: 0.8, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }
  },
  sprite: { width: 52, height: 64 }
});
