import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text } from 'react-native';
import { makeRecap, shareRecap, thisMonthString } from '../lib/api';

export default function ScrapbookButton({ period = 'month', recapKey = thisMonthString(), label = 'See my scrapbook' }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const recap = await makeRecap(period, recapKey);
      const shared = await shareRecap(recap.id);
      await Linking.openURL(shared.shareUrl);
    } catch (err) {
      Alert.alert("Couldn't open your scrapbook", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={open}
      disabled={loading}
      style={({ pressed }) => [styles.button, (pressed || loading) && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? <ActivityIndicator color="#22304A" /> : <Text style={styles.text}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    minWidth: 200,
    marginVertical: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: '#F6E27A',
    alignItems: 'center',
  },
  pressed: { opacity: 0.7 },
  text: { fontSize: 16, fontWeight: '700', color: '#22304A' },
});