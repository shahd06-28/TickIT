import { Image, StyleSheet, Text, View } from 'react-native';

const TAPE_COLORS = ['#BFE3D0', '#F4C6D2', '#D4CCF0', '#F6E27A'];
const TILTS = [-3, 2, -1.5, 3, -2.5, 1];

/**
 * A photo framed like a taped Polaroid.
 * @param {string} uri       the photo's uri
 * @param {number} [size]    width of the photo in pixels
 * @param {number} [index]   position in a list; picks the tilt and tape color
 * @param {string} [caption] optional handwritten-style caption under the photo
 */
export default function ScrapbookPhoto({ uri, size = 140, index = 0, caption, style }) {
  const tilt = TILTS[index % TILTS.length];
  const tape = TAPE_COLORS[index % TAPE_COLORS.length];

  return (
    <View style={[styles.frame, { transform: [{ rotate: `${tilt}deg` }] }, style]}>
      <View style={[styles.tape, { backgroundColor: tape, transform: [{ rotate: `${-tilt * 1.5}deg` }] }]} />
      <Image source={{ uri }} style={{ width: size, height: size, backgroundColor: '#EEF3F8' }} resizeMode="cover" />
      {caption ? (
        <Text style={[styles.caption, { maxWidth: size }]} numberOfLines={2}>
          {caption}
        </Text>
      ) : (
        <View style={{ height: 14 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    padding: 8,
    paddingBottom: 10,
    borderRadius: 2,
    shadowColor: '#22304A',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  tape: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    width: 64,
    height: 20,
    opacity: 0.85,
    zIndex: 1,
  },
  caption: {
    marginTop: 6,
    fontSize: 13,
    color: '#22304A',
    textAlign: 'center',
  },
});