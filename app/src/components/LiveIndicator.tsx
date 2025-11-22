import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

interface LiveIndicatorProps {
    active?: boolean;
}

export function LiveIndicator({ active = true }: LiveIndicatorProps) {
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        if (!active) {
            scale.setValue(1);
            opacity.setValue(0.4);
            return;
        }

        const pulse = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(scale, {
                        toValue: 1.2,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.6,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );
        pulse.start();

        return () => pulse.stop();
    }, [active, scale, opacity]);

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.dot,
                    {
                        transform: [{ scale }],
                        opacity,
                        backgroundColor: active ? theme.colors.primary : theme.colors.textSecondary,
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 12,
        height: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
});
