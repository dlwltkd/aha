import React from "react";
import { View, StyleSheet, Image } from "react-native";
import mapImage from "./map.png";

export function SimpleFloorPlaceholder() {
  return (
    <View style={styles.wrap}>
      <Image source={mapImage} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    // map.png is roughly 694x768 (portrait)
    aspectRatio: 694 / 768,
    borderRadius: 28,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});

export default SimpleFloorPlaceholder;
