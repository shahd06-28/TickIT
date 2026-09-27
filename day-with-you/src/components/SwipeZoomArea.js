import React, { useRef } from "react";
import { View, PanResponder } from "react-native";

function touchDistance(touches) {
  if (touches.length < 2) return null;
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

// Wraps its children with:
//  - a horizontal swipe (past SWIPE_THRESHOLD px) -> onSwipeLeft / onSwipeRight
//  - a two-finger pinch-OUT (fingers spreading apart, past PINCH_THRESHOLD px) -> onPinchOut
// Tap-through to children (event blocks, sticker drags, etc.) is preserved since this only
// claims the gesture once a real swipe or pinch is detected, not on every touch.
const SWIPE_THRESHOLD = 60;
const PINCH_THRESHOLD = 55;

export default function SwipeZoomArea({ children, onSwipeLeft, onSwipeRight, onPinchOut, style }) {
  const startDist = useRef(null);
  const pinchFired = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      // Only actually take over once we're confident this is a swipe/pinch, not a tap or a
      // sticker drag (those set their own PanResponder and claim the gesture first).
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: (evt) => evt.nativeEvent.touches.length === 2,
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gesture) => {
        if (evt.nativeEvent.touches.length === 2) return true;
        return Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
      },
      onPanResponderGrant: (evt) => {
        startX.current = evt.nativeEvent.pageX;
        startY.current = evt.nativeEvent.pageY;
        pinchFired.current = false;
        startDist.current = touchDistance(evt.nativeEvent.touches);
      },
      onPanResponderMove: (evt) => {
        const touches = evt.nativeEvent.touches;
        if (touches.length === 2) {
          if (startDist.current == null) startDist.current = touchDistance(touches);
          const d = touchDistance(touches);
          if (d != null && startDist.current != null && !pinchFired.current && d - startDist.current > PINCH_THRESHOLD) {
            pinchFired.current = true;
            onPinchOut?.();
          }
        }
      },
      onPanResponderRelease: (evt, gesture) => {
        if (pinchFired.current) return;
        if (Math.abs(gesture.dx) > SWIPE_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5) {
          if (gesture.dx < 0) onSwipeLeft?.(); else onSwipeRight?.();
        }
      }
    })
  ).current;

  return (
    <View style={style} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
