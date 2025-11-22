import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInViewProps {
    children: React.ReactNode;
    style?: ViewStyle | ViewStyle[];
    duration?: number;
}

export function FadeInView({ children, style, duration = 300 }: FadeInViewProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
        }).start();
    }, [children, duration, fadeAnim]);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: fadeAnim,
                },
            ]}
        >
            {children}
        </Animated.View>
    );
}
