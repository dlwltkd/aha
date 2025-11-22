import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

interface VoiceRecordingModalProps {
    visible: boolean;
    onClose: () => void;
    targetName: string;
}

export default function VoiceRecordingModal({ visible, onClose, targetName }: VoiceRecordingModalProps) {
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [permissionResponse, requestPermission] = Audio.usePermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [recordedUri, setRecordedUri] = useState<string | null>(null);
    const [showSaved, setShowSaved] = useState(false);

    const steps = [
        "{name} 여기는 화장실이야",
        "{name} 여기는 안방이야"
    ];

    useEffect(() => {
        if (visible) {
            setCurrentStep(0);
            setRecordedUri(null);
            setShowSaved(false);
        }
    }, [visible]);

    useEffect(() => {
        return () => {
            if (recording) {
                stopRecording();
            }
        };
    }, []);

    async function startRecording() {
        try {
            if (permissionResponse?.status !== 'granted') {
                console.log('Requesting permission..');
                await requestPermission();
            }
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            console.log('Starting recording..');
            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );
            setRecording(recording);
            setIsRecording(true);
            setRecordedUri(null);
            console.log('Recording started');
        } catch (err) {
            console.error('Failed to start recording', err);
        }
    }

    async function stopRecording() {
        console.log('Stopping recording..');
        if (!recording) return;

        setIsRecording(false);
        await recording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
        });
        const uri = recording.getURI();
        console.log('Recording stopped and stored at', uri);
        setRecordedUri(uri);
        setRecording(null);
    }

    const handleRecordPress = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
            setRecordedUri(null);
        } else {
            // Show saved indicator before closing
            setShowSaved(true);
            setTimeout(() => {
                setShowSaved(false);
                onClose();
            }, 1500);
        }
    };

    const currentPrompt = steps[currentStep].replace("{name}", targetName || '호칭');
    const isLastStep = currentStep === steps.length - 1;

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <MaterialCommunityIcons name="close" size={24} color="#888" />
                    </TouchableOpacity>

                    <Text style={styles.stepIndicator}>
                        {currentStep + 1} / {steps.length}
                    </Text>

                    <Text style={styles.promptText}>
                        "{currentPrompt}"
                    </Text>

                    <Text style={styles.subText}>
                        아래 버튼을 누르고 말해주세요
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.recordButton,
                            isRecording && styles.recordingButton,
                            recordedUri && !isRecording && styles.recordedButton
                        ]}
                        onPress={handleRecordPress}
                    >
                        <MaterialCommunityIcons
                            name={isRecording ? "stop" : "microphone"}
                            size={40}
                            color={isRecording || recordedUri ? "#FFF" : theme.colors.primary}
                        />
                    </TouchableOpacity>

                    {isRecording && (
                        <Text style={styles.recordingText}>녹음 중...</Text>
                    )}

                    {recordedUri && !isRecording && (
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Text style={styles.nextButtonText}>
                                {isLastStep ? "완료" : "다음"}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {showSaved && (
                        <View style={styles.savedIndicator}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.primary} />
                            <Text style={styles.savedText}>목소리가 저장되었습니다</Text>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        width: '100%',
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        paddingBottom: 50,
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        top: 20,
        padding: 10,
    },
    promptText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
        color: '#111827',
    },
    subText: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 40,
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    recordingButton: {
        backgroundColor: '#EF4444', // Red color for recording state
    },
    recordedButton: {
        backgroundColor: theme.colors.primary, // Primary color when recorded
    },
    recordingText: {
        color: '#EF4444',
        marginTop: 10,
        fontWeight: '600',
    },
    stepIndicator: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 8,
        fontWeight: '600',
    },
    nextButton: {
        marginTop: 20,
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 24,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    savedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        gap: 8,
        marginTop: 20,
    },
    savedText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '600',
    }
});
