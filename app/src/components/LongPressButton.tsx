import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Animated, Pressable, Vibration, View, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Button, Text } from 'react-native-paper';

interface LongPressButtonProps {
    children: React.ReactNode;
    onLongPressComplete: () => void;
    holdDuration?: number;
    buttonMode?: 'text' | 'outlined' | 'contained' | 'elevated' | 'contained-tonal';
    buttonStyle?: StyleProp<ViewStyle>;
    labelStyle?: StyleProp<TextStyle>;
}

export function LongPressButton({
    children,
    onLongPressComplete,
    holdDuration = 4000, // Default to 4 seconds as requested
    buttonMode = 'contained',
    buttonStyle,
    labelStyle,
}: LongPressButtonProps) {
    const [isPressing, setIsPressing] = useState(false);
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isCompletedRef = useRef(false);

    const handlePressIn = () => {
        isCompletedRef.current = false;
        setIsPressing(true);

        try {
            Vibration.vibrate(50);
        } catch (e) { /* Vibration not supported */ }

        // Button scale feedback
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 50,
        }).start();

        // Progress animation
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: holdDuration,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished && !isCompletedRef.current) {
                isCompletedRef.current = true;
                handleComplete();
            }
        });
    };

    const handlePressOut = () => {
        // Don't reset if we just completed
        if (isCompletedRef.current) {
            return;
        }

        setIsPressing(false);

        // Reset animations
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                speed: 20,
            }),
            Animated.timing(progressAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: false,
            }),
        ]).start();
    };

    const handleComplete = () => {
        try {
            Vibration.vibrate([0, 50, 50, 50]);
        } catch (e) { /* Vibration not supported */ }

        setIsPressing(false);
        progressAnim.setValue(0);
        scaleAnim.setValue(1);

        onLongPressComplete();

        setTimeout(() => {
            isCompletedRef.current = false;
        }, 100);
    };

    useEffect(() => {
        return () => {
            progressAnim.setValue(0);
            scaleAnim.setValue(1);
        };
    }, []);

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    // Interpolate opacity for a smooth fade-in effect of the bar itself if needed,
    // but "fade across" usually implies width. We'll stick to width.

    return (
        <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.container}
        >
            <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: scaleAnim }] }]}>
                {/* Background Button (Static) */}
                <Button
                    mode={buttonMode}
                    style={[buttonStyle, styles.bgButton]}
                    labelStyle={labelStyle}
                    onPress={() => { }}
                    pointerEvents="none"
                >
                    {children}
                </Button>

                {/* Foreground Fill Overlay (Clipped) */}
                <Animated.View
                    style={[
                        styles.fillContainer,
                        { width: progressWidth }
                    ]}
                    pointerEvents="none"
                >
                    {/* 
             We render the button AGAIN inside the clipped view but with a different background color 
             to create the "fill" effect. 
             Or simpler: just a semi-transparent overlay on top.
             User said "opaque fade across". 
             Let's try a white overlay with 0.3 opacity.
           */}
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]} />
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    buttonWrapper: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18, // Match the button's border radius
    },
    bgButton: {
        // Ensure the button takes up space
    },
    fillContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 2,
        borderRadius: 18, // Match border radius
    },
});
