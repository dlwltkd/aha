import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Image, Animated } from "react-native";
import mapImage from "./map.png";
import type { Zone } from "../services/dashboardBridge";

interface FloorMapProps {
    zone?: Zone;
    isUnusual?: boolean;
}

// Define coordinates for each zone (percentages of map dimensions)
const ZONE_POSITIONS: Record<Zone, { x: number; y: number }> = {
    bathroom: { x: 0.23, y: 0.3 },  // Top left area
    living: { x: 0.53, y: 0.53 },      // Right middle area  
    bedroom: { x: 0.80, y: 0.80 },    // Bottom left area
};

export function FloorMapWithLocation({ zone, isUnusual }: FloorMapProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    // Pulse animation for the dot
    useEffect(() => {
        if (zone) {
            // Fade in
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            // Continuous pulse
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();

            return () => {
                pulse.stop();
            };
        } else {
            // Fade out when no zone
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [zone, pulseAnim, opacityAnim]);

    const position = zone ? ZONE_POSITIONS[zone] : null;
    const dotColor = isUnusual ? '#DC2626' : '#3B82F6'; // Red for unusual, blue for normal
    const dotColorLight = isUnusual ? '#EF4444' : '#60A5FA';

    return (
        <View style={styles.wrap}>
            <Image source={mapImage} style={styles.image} resizeMode="cover" />

            {position && (
                <View
                    style={[
                        styles.dotContainer,
                        {
                            left: `${position.x * 100}%`,
                            top: `${position.y * 100}%`,
                        },
                    ]}
                >
                    {/* Outer glow ring */}
                    <Animated.View
                        style={[
                            styles.glowRing,
                            {
                                backgroundColor: dotColor,
                                opacity: opacityAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.3],
                                }),
                                transform: [
                                    {
                                        scale: pulseAnim.interpolate({
                                            inputRange: [1, 1.3],
                                            outputRange: [1, 1.5],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />

                    {/* Middle ring */}
                    <Animated.View
                        style={[
                            styles.middleRing,
                            {
                                backgroundColor: dotColorLight,
                                opacity: opacityAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.5],
                                }),
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    />

                    {/* Core dot */}
                    <Animated.View
                        style={[
                            styles.coreDot,
                            {
                                backgroundColor: dotColor,
                                shadowColor: dotColor,
                                opacity: opacityAnim,
                                transform: [
                                    {
                                        scale: pulseAnim.interpolate({
                                            inputRange: [1, 1.3],
                                            outputRange: [1, 1.1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: "100%",
        aspectRatio: 694 / 768,
        borderRadius: 28,
        overflow: "hidden",
        position: "relative",
    },
    image: {
        width: "100%",
        height: "100%",
    },
    dotContainer: {
        position: "absolute",
        width: 50,
        height: 50,
        marginLeft: -25,
        marginTop: -25,
        justifyContent: "center",
        alignItems: "center",
    },
    glowRing: {
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    middleRing: {
        position: "absolute",
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    coreDot: {
        position: "absolute",
        width: 18,
        height: 18,
        borderRadius: 9,
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 10,
    },
});

export default FloorMapWithLocation;
