import { useEffect, useMemo } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { IconButton } from "react-native-paper";

import { theme } from "../theme";

type MenuItem = {
  icon: string;
  onPress: () => void;
};

type Props = {
  items: MenuItem[];
  visible: boolean;
  onPressToggle: () => void;
  origin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
};

const ANIMATION_DURATION = 180;
const DEFAULT_RADIUS = 72;

export function FloatingMenu({ items, visible, onPressToggle, origin }: Props) {
  const progress = useSharedValue(0);
  const containerSize = DEFAULT_RADIUS * 2 + 72;
  const offsets = useMemo(() => {
    const offset = DEFAULT_RADIUS;
    return {
      top: origin?.top !== undefined ? origin.top - offset : undefined,
      right: origin?.right !== undefined ? origin.right - offset : undefined,
      bottom: origin?.bottom !== undefined ? origin.bottom - offset : undefined,
      left: origin?.left !== undefined ? origin.left - offset : undefined
    };
  }, [origin]);
  const angles = useMemo(() => {
    if (items.length <= 1) {
      return [Math.PI];
    }
    const upper = Math.PI - Math.PI / 3;
    const lower = Math.PI + Math.PI / 3;
    return Array.from({ length: items.length }, (_, index) => upper + ((lower - upper) * index) / (items.length - 1));
  }, [items.length]);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.quad)
    });
  }, [visible, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.25])
  }));

  const buttonStyles = items.map((_, index) =>
    useAnimatedStyle(() => {
      const angle = angles[index] ?? Math.PI;
      const radius = interpolate(progress.value, [0, 1], [0, DEFAULT_RADIUS]);
      return {
        transform: [
          { translateX: radius * Math.cos(angle) },
          { translateY: radius * Math.sin(angle) },
          { scale: interpolate(progress.value, [0, 1], [0.2, 1]) }
        ],
        opacity: progress.value
      };
    })
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {visible && (
        <TouchableWithoutFeedback onPress={onPressToggle}>
          <Animated.View style={[styles.backdrop, backdropStyle]} />
        </TouchableWithoutFeedback>
      )}
      <View
        pointerEvents="auto"
        style={[
          styles.container,
          {
            width: containerSize,
            height: containerSize,
            ...offsets
          }
        ]}
      >
        {items.map((item, index) => (
          <Animated.View key={item.icon} style={[styles.item, buttonStyles[index]]}>
            <IconButton
              icon={item.icon}
              size={26}
              mode="contained"
              containerColor="#E7E4DA"
              iconColor={theme.colors.primary}
              onPress={item.onPress}
            />
          </Animated.View>
        ))}

        <IconButton
          icon={visible ? "close" : "menu"}
          size={28}
          mode="contained"
          containerColor={theme.colors.primary}
          iconColor={theme.colors.onPrimary}
          onPress={onPressToggle}
          style={styles.toggle}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)"
  },
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 50
  },
  item: {
    position: "absolute"
  },
  toggle: {
    margin: 0,
    elevation: 6
  }
});
