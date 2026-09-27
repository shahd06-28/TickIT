# Day With You — Expo app

Rebuilt from a real `npx create-expo-app@latest` scaffold (not hand-written version numbers),
so the dependency versions below are what the current Expo CLI itself resolved — this is what
fixes the white screen from before, which was an SDK 51-vs-current-Expo-Go mismatch.

## Exact versions (confirmed, not guessed)

| Package | Version |
|---|---|
| expo | ~57.0.25 |
| react | 19.2.3 |
| react-native | 0.86.3 |
| @react-navigation/native | ^7.4.1 |
| @react-navigation/bottom-tabs | ^7.19.2 |
| react-native-screens | ^4.28.0 |
| react-native-safe-area-context | ^5.10.0 |
| @react-native-async-storage/async-storage | ^3.1.1 |
| react-native-gesture-handler | ^3.3.0 |
| expo-image-picker | ^57.0.20 |

`npm install` was run against this exact set with zero `ERESOLVE` / unmet-peer warnings —
verified, not assumed.

## Run it

```bash
cd day-with-you
npm install
npx expo start
```

Scan the QR with Expo Go, or press `w` / `i` / `a`. No API keys, no `.env`, nothing else to
configure — everything runs on mocked data.

## About the sprites (waiting on your zip)

`assets/sprites/` currently has the **placeholder** frames from the last round (the sliced
JPG sheet), not the new purple-haired character you just uploaded. Those new frames have real
alpha transparency and no checkerboard to remove, which is a much easier swap than last time —
but the sample only covered frames 001–012 and 025–032 (013–024 are missing), so I don't yet
know the full pose lineup to map correctly. Once you send the zip:

1. Drop the new PNGs into `assets/sprites/`, replacing the files there.
2. Update `src/data/frameSets.js`'s `require()` list to match the new filenames.
3. Update `TYPE_TO_FRAMESET` in `src/data/mockData.js` if the pose-to-event mapping should
   change (walk/push/gym/study/meal/social/rest).

Send the zip and I'll do all three steps for you rather than walking you through it.

## One deliberate choice worth knowing about

The fresh scaffold ships an `AGENTS.md` that recommends **Expo Router** (file-based routing)
over manually wiring `@react-navigation` — that's the current default template's direction.
I kept `@react-navigation` here instead: the app already had a working navigator built on it,
migrating to Expo Router is a genuinely separate rewrite (screens move into `src/app/`, tab
bars become `_layout.tsx` files), and React Navigation v7 is still fully supported, not
deprecated. Confirmed its core API (`NavigationContainer`, `createBottomTabNavigator`,
`Tab.Navigator`/`Tab.Screen`) is unchanged from what this app already used. Worth migrating
later if you want to stay on Expo's most current recommended path, but out of scope for this
"make it run" pass.

## File layout

Unchanged from the previous zip — see the code comments in each file. Quick map:

```
App.js                          - entry point
src/context/AppContext.js       - all state: calendar drill-down, sticker buckets, goals, notes
src/data/mockData.js            - mock events, event→animation mapping
src/data/frameSets.js           - static requires for the sprite frames (update when you send the zip)
src/services/                   - googleCalendarService (mock), nudgeEngine, characterEngine
src/components/                 - Character, CollageLayer (draggable stickers), SwipeZoomArea (swipe+pinch)
src/screens/CalendarScreen.js   - Month→Week→Day dispatcher + header/breadcrumb/edit toggle
src/screens/calendar/           - MonthLevel, WeekLevel, DayLevel
src/screens/{Cast,Notes,Goals,Review,Settings}Screen.js
```
