import * as ImagePicker from "expo-image-picker";

export async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
  if (result.canceled) return null;
  return result.assets[0].uri;
}
