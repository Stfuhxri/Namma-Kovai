import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { getAIRoute, AIResponse } from '@/services/aiRouting';
import { RouteCard } from './RouteCard';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_COLLAPSED = 0;
const SHEET_EXPANDED = SCREEN_H * 0.7;
const SNAP_THRESHOLD = 60;

interface AIAssistantSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

export function AIAssistantSheet({ isVisible, onClose }: AIAssistantSheetProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const currentOffset = useRef(SCREEN_H);
  
  React.useEffect(() => {
    if (isVisible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }).start();
      currentOffset.current = 0;
    } else {
      Animated.spring(translateY, {
        toValue: SCREEN_H,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }).start();
      currentOffset.current = SCREEN_H;
      // Reset state on close
      setTimeout(() => {
        setQuery('');
        setResult(null);
        setLoading(false);
      }, 300);
    }
  }, [isVisible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        translateY.setOffset(currentOffset.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const newVal = Math.max(0, g.dy); // Only allow dragging down
        translateY.setValue(newVal);
      },
      onPanResponderRelease: (_, g) => {
        translateY.flattenOffset();
        if (g.dy > SNAP_THRESHOLD) {
          onClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          currentOffset.current = 0;
        }
      },
    })
  ).current;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    const aiResult = await getAIRoute(query);
    setResult(aiResult);
    setLoading(false);
  };

  if (!isVisible) return null;

  return (
    <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={styles.handle} />
      </View>

      <View style={styles.content}>
        <Text style={styles.headerTitle}>✨ AI Transit Assistant</Text>
        <Text style={styles.headerSubtitle}>Ask Groq for the smartest route</Text>

        <View style={styles.searchBox}>
          <TextInput
            style={styles.input}
            placeholder="E.g., Take me to Gandhipuram"
            placeholderTextColor={Colors.outline}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity 
            style={[styles.searchBtn, !query.trim() && styles.searchBtnDisabled]} 
            onPress={handleSearch}
            disabled={!query.trim() || loading}
          >
            <Text style={styles.searchBtnText}>Ask</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Analyzing live data & weather...</Text>
          </View>
        )}

        {result && (
          <ScrollView style={styles.resultsArea} showsVerticalScrollIndicator={false}>
            {/* AI Conversational Bubble */}
            <View style={styles.aiBubbleContainer}>
              <View style={styles.aiAvatar}>
                <Text style={styles.aiAvatarText}>✨</Text>
              </View>
              <View style={styles.aiBubble}>
                <Text style={styles.aiBubbleText}>{result.aiMessage}</Text>
              </View>
            </View>

            {/* Weather & Traffic Data Chips */}
            <View style={styles.dataChipsRow}>
              <View style={[styles.dataChip, styles.weatherChip]}>
                <Text style={styles.dataChipIcon}>
                  {result.routeData.weather.includes('Rain') || result.routeData.weather.includes('Thunder') ? '🌧️' : result.routeData.weather.includes('Cloudy') ? '☁️' : '☀️'}
                </Text>
                <Text style={styles.dataChipText}>{result.routeData.weather}</Text>
              </View>
              <View style={[styles.dataChip, styles.trafficChip]}>
                <Text style={styles.dataChipIcon}>
                  {result.routeData.traffic.includes('Heavy') ? '🔴' : result.routeData.traffic.includes('Moderate') ? '🟡' : '🟢'}
                </Text>
                <Text style={styles.dataChipText}>{result.routeData.traffic}</Text>
              </View>
            </View>

            <RouteCard 
              route={result.routeData} 
              isRecommended={true} 
            />
            
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsHeader}>Step-by-Step Instructions</Text>
              {result.routeData.steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepIconContainer}>
                    <Text style={styles.stepIcon}>{step.mode === 'WALK' ? '🚶' : '🚌'}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepText}>{step.instruction}</Text>
                    {step.duration_min && (
                      <Text style={styles.stepDuration}>{step.duration_min} min</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_EXPANDED,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 100,
  },
  handleArea: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'GeneralSans-Bold',
    color: Colors.onSurface,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'GeneralSans-Medium',
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: Colors.onSurface,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  searchBtnDisabled: {
    backgroundColor: Colors.outlineVariant,
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontFamily: 'GeneralSans-Bold',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    color: Colors.onSurfaceVariant,
    fontFamily: 'GeneralSans-Medium',
    fontSize: 14,
  },
  resultsArea: {
    flex: 1,
    marginTop: Spacing.sm,
  },
  aiBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f97316',
    marginTop: 4,
  },
  aiAvatarText: {
    fontSize: 16,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderTopLeftRadius: 4,
  },
  aiBubbleText: {
    fontSize: 14,
    color: Colors.onSurface,
    fontFamily: 'GeneralSans-Medium',
    lineHeight: 22,
  },
  dataChipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dataChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  weatherChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  trafficChip: {
    backgroundColor: '#fef9c3',
    borderColor: '#fde047',
  },
  dataChipIcon: {
    fontSize: 18,
  },
  dataChipText: {
    fontSize: 12,
    fontFamily: 'GeneralSans-Semibold',
    fontWeight: '600',
    color: Colors.onSurface,
  },
  stepsContainer: {
    marginTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepsHeader: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'GeneralSans-Bold',
    color: Colors.onSurface,
    marginBottom: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: 12,
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 4,
  },
  stepText: {
    fontSize: 14,
    color: Colors.onSurface,
    fontFamily: 'GeneralSans-Medium',
    lineHeight: 20,
  },
  stepDuration: {
    fontSize: 12,
    color: Colors.secondary,
    fontFamily: 'GeneralSans-Semibold',
    marginTop: 2,
  }
});
