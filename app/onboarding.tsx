import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, StatusBar, SafeAreaView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../src/context/ThemeContext';
import { THEME } from '../src/constants/Theme';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'Welcome to Nexus',
        subtitle: 'Your Workspace, Reimagined',
        description: 'Connect with your team, manage projects, and streamline your workflow all from one place.',
        icon: 'planet',
        color: '#7C4DFF',
    },
    {
        id: '2',
        title: 'Seamless Communication',
        subtitle: 'Stay in the Loop',
        description: 'Instant messaging with your department, direct chats with colleagues, and real-time updates.',
        icon: 'chatbubbles',
        color: '#00E676',
    },
    {
        id: '3',
        title: 'Effortless Management',
        subtitle: 'Focus on What Matters',
        description: 'Quick check-ins, easy leave requests, and comprehensive attendance tracking at your fingertips.',
        icon: 'options',
        color: '#2979FF',
    },
];

export default function Onboarding() {
    const router = useRouter();
    const { theme, isDark } = useTheme();
    const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            const nextIndex = currentIndex + 1;
            scrollViewRef.current?.scrollTo({
                x: nextIndex * width,
                animated: true,
            });
            setCurrentIndex(nextIndex);
        } else {
            completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('hasLaunched', 'true');
            router.replace('/(auth)/login');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            router.replace('/(auth)/login');
        }
    };

    const skip = async () => {
        await completeOnboarding();
    };

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / width);
        if (index !== currentIndex && index >= 0 && index < SLIDES.length) {
            setCurrentIndex(index);
        }
    };

    return (
        <View style={styles.outerContainer}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

                {/* Background Decor */}
                <View style={[styles.bgCircle, { backgroundColor: SLIDES[currentIndex].color + '20' }]} />
                <View style={[styles.bgCircleSmall, { backgroundColor: SLIDES[currentIndex].color + '10' }]} />

                <View style={styles.header}>
                    <TouchableOpacity onPress={skip} style={styles.skipBtn}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.scrollContainer}>
                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        bounces={false}
                        alwaysBounceHorizontal={false}
                        alwaysBounceVertical={false}
                        directionalLockEnabled={true}
                        scrollEventThrottle={16}
                        onScroll={handleScroll}
                        contentContainerStyle={{ width: width * SLIDES.length }}
                        style={styles.scrollView}
                        scrollEnabled={true}
                        overScrollMode="never"
                    >
                        {SLIDES.map((item) => (
                            <View key={item.id} style={styles.slide}>
                                <View style={styles.imageContainer}>
                                    <View style={[styles.iconCircle, { backgroundColor: item.color + '20', borderColor: item.color }]}>
                                        <Ionicons name={item.icon as any} size={80} color={item.color} />
                                    </View>
                                    <View style={[styles.glow, { backgroundColor: item.color }]} />
                                </View>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>
                                <Text style={styles.description}>{item.description}</Text>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.footer}>
                    <View style={styles.pagination}>
                        {SLIDES.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentIndex === index && styles.activeDot,
                                    { backgroundColor: currentIndex === index ? SLIDES[currentIndex].color : theme.colors.border }
                                ]}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.nextBtn, { backgroundColor: SLIDES[currentIndex].color }]}
                        onPress={handleNext}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.nextBtnText}>
                            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                        </Text>
                        <Ionicons
                            name={currentIndex === SLIDES.length - 1 ? "rocket" : "arrow-forward"}
                            size={20}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const createStyles = (theme: typeof THEME, isDark: boolean) => StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
    },
    bgCircle: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
    },
    bgCircleSmall: {
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 24,
        zIndex: 10,
    },
    skipBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    skipText: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollView: {
        flexGrow: 0,
    },
    slide: {
        width: width,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        marginBottom: 48,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    iconCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        zIndex: 5,
    },
    glow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        opacity: 0.4,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: theme.colors.text.primary,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    description: {
        fontSize: 16,
        color: theme.colors.text.secondary,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: '85%',
    },
    footer: {
        padding: 32,
        paddingBottom: Platform.OS === 'ios' ? 0 : 32,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
        gap: 8,
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        width: 32,
        height: 8,
        borderRadius: 4,
    },
    nextBtn: {
        paddingVertical: 18,
        borderRadius: 24,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
        marginBottom: 20,
    },
    nextBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});
