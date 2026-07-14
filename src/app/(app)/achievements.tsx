import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Award,
  BowArrow,
  Clock,
  Crown,
  Hourglass,
  MapPinCheck,
  Sword,
  Swords,
  Target,
  Timer,
  Trophy,
  Watch,
} from 'lucide-react-native';
import React, { useRef } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { Badge } from '@/components/emberglow';
import {
  FocusAwareStatusBar,
  ScreenContainer,
  ScreenHeader,
  ScrollView,
} from '@/components/ui';
import { useCharacterStore } from '@/store/character-store';
import { useQuestStore } from '@/store/quest-store';
import {
  colors,
  fontFamily,
  palette,
  radii,
  shadows,
  spacing,
  withAlpha,
} from '@/theme';

type AchievementCategory = 'streak' | 'quests' | 'minutes';
type AchievementLevel = 1 | 2 | 3;

type Achievement = {
  id: string;
  category: AchievementCategory;
  level: AchievementLevel;
  title: string;
  description: string;
  requirement: number;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 80; // 40px padding on each side
const CARD_HEIGHT = 280; // Fixed height for all cards
const CARD_SPACING = 16;

const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  const progress = Math.min(
    achievement.currentProgress / achievement.requirement,
    1
  );
  const progressPercent = progress * 100;

  const getIcon = () => {
    const iconColor = achievement.isUnlocked
      ? colors.text.accent
      : colors.text.muted;
    const iconSize = 32;

    if (achievement.category === 'streak') {
      switch (achievement.level) {
        case 1:
          return <Sword size={iconSize} color={iconColor} />;
        case 2:
          return <Swords size={iconSize} color={iconColor} />;
        case 3:
          return <BowArrow size={iconSize} color={iconColor} />;
      }
    } else if (achievement.category === 'quests') {
      switch (achievement.level) {
        case 1:
          return <Award size={iconSize} color={iconColor} />;
        case 2:
          return <Trophy size={iconSize} color={iconColor} />;
        case 3:
          return <Crown size={iconSize} color={iconColor} />;
      }
    } else if (achievement.category === 'minutes') {
      switch (achievement.level) {
        case 1:
          return <Watch size={iconSize} color={iconColor} />;
        case 2:
          return <Clock size={iconSize} color={iconColor} />;
        case 3:
          return <Hourglass size={iconSize} color={iconColor} />;
      }
    }
  };

  return (
    <View
      style={[
        styles.cardGlowWrapper,
        achievement.isUnlocked && shadows.glowWarm,
      ]}
    >
      <View
        testID="achievement-card"
        style={[styles.card, achievement.isUnlocked && styles.cardUnlocked]}
      >
        <View>
          <View style={styles.iconRow}>
            <View
              style={[
                styles.iconDisc,
                achievement.isUnlocked && styles.iconDiscUnlocked,
              ]}
              accessible
              accessibilityLabel={`${achievement.category} achievement icon, level ${achievement.level}`}
            >
              {getIcon()}
            </View>

            {achievement.isUnlocked && (
              <View accessible accessibilityLabel="Achievement unlocked">
                <Badge tone="success">Unlocked!</Badge>
              </View>
            )}
          </View>

          <Text style={styles.title}>{achievement.title}</Text>
          <Text style={styles.description}>{achievement.description}</Text>
        </View>

        <View>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressValue}>
              {achievement.currentProgress}/{achievement.requirement}
            </Text>
          </View>

          <View testID="progress-track" style={styles.progressTrack}>
            {progress > 0 && (
              <View
                testID="progress-fill"
                style={[
                  styles.progressFillGlow,
                  { width: `${progressPercent}%` },
                ]}
              >
                <LinearGradient
                  colors={[palette.cinnabar, palette.sandy]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.progressFillGradient}
                />
              </View>
            )}
          </View>

          {achievement.isUnlocked && achievement.unlockedAt && (
            <Text style={styles.unlockedDate}>
              Unlocked on {achievement.unlockedAt.toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

/**
 * Extracted so `useAnimatedStyle` runs at a component's top level rather
 * than inside the parent's `Array.map` callback (a `react-hooks/rules-of-hooks`
 * violation) — same per-dot scale/opacity animation as before, legal hook call.
 */
const AchievementCarouselDot = ({
  index,
  scrollX,
}: {
  index: number;
  scrollX: Animated.SharedValue<number>;
}) => {
  const inputRange = [
    (index - 1) * (CARD_WIDTH + CARD_SPACING),
    index * (CARD_WIDTH + CARD_SPACING),
    (index + 1) * (CARD_WIDTH + CARD_SPACING),
  ];

  const dotStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1.4, 0.8],
      'clamp'
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      'clamp'
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return <Animated.View style={[styles.dot, dotStyle]} />;
};

const AchievementSection = ({
  category,
  achievements,
}: {
  category: AchievementCategory;
  achievements: Achievement[];
}) => {
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const getCategoryTitle = () => {
    switch (category) {
      case 'streak':
        return 'Daily Streak';
      case 'quests':
        return 'Quest Completion';
      case 'minutes':
        return 'Time Saved';
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'streak':
        return <Target size={24} color={colors.text.accent} />;
      case 'quests':
        return <MapPinCheck size={24} color={colors.text.accent} />;
      case 'minutes':
        return <Timer size={24} color={colors.text.accent} />;
    }
  };

  return (
    <View style={styles.section}>
      <View
        style={styles.sectionHeader}
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${getCategoryTitle()} achievements`}
      >
        {getCategoryIcon()}
        <Text style={styles.sectionTitle}>{getCategoryTitle()}</Text>
      </View>

      <Animated.ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.carouselContent}
      >
        {achievements.map((achievement) => (
          <View key={achievement.id} style={styles.cardSpacer}>
            <AchievementCard achievement={achievement} />
          </View>
        ))}
      </Animated.ScrollView>

      {/* Page Indicators */}
      <View
        style={styles.dotsRow}
        accessible
        accessibilityLabel={`Achievement carousel, ${achievements.length} items`}
      >
        {achievements.map((_, index) => (
          <AchievementCarouselDot key={index} index={index} scrollX={scrollX} />
        ))}
      </View>
    </View>
  );
};

export default function AchievementsScreen() {
  const router = useRouter();

  // Get real user data
  const dailyQuestStreak = useCharacterStore((state) => state.dailyQuestStreak);
  const completedQuests = useQuestStore((state) => state.getCompletedQuests());
  const totalQuestCount = completedQuests.length;
  const totalMinutesSaved = completedQuests.reduce(
    (total, quest) => total + quest.durationMinutes,
    0
  );

  // Generate achievements with real data
  const generateAchievements = (): Achievement[] => {
    return [
      // Streak achievements
      {
        id: 'streak-1',
        category: 'streak' as const,
        level: 1 as const,
        title: 'First Steps',
        description: 'Complete quests for 2 days in a row',
        requirement: 2,
        currentProgress: dailyQuestStreak,
        isUnlocked: dailyQuestStreak >= 2,
        unlockedAt: dailyQuestStreak >= 2 ? new Date() : undefined,
      },
      {
        id: 'streak-2',
        category: 'streak' as const,
        level: 2 as const,
        title: 'Committed',
        description: 'Complete quests for 10 days in a row',
        requirement: 10,
        currentProgress: dailyQuestStreak,
        isUnlocked: dailyQuestStreak >= 10,
        unlockedAt: dailyQuestStreak >= 10 ? new Date() : undefined,
      },
      {
        id: 'streak-3',
        category: 'streak' as const,
        level: 3 as const,
        title: 'Unstoppable',
        description: 'Complete quests for 30 days in a row',
        requirement: 30,
        currentProgress: dailyQuestStreak,
        isUnlocked: dailyQuestStreak >= 30,
        unlockedAt: dailyQuestStreak >= 30 ? new Date() : undefined,
      },
      // Quest achievements
      {
        id: 'quests-1',
        category: 'quests' as const,
        level: 1 as const,
        title: 'Quest Beginner',
        description: 'Complete 3 quests',
        requirement: 3,
        currentProgress: totalQuestCount,
        isUnlocked: totalQuestCount >= 3,
        unlockedAt: totalQuestCount >= 3 ? new Date() : undefined,
      },
      {
        id: 'quests-2',
        category: 'quests' as const,
        level: 2 as const,
        title: 'Quest Adventurer',
        description: 'Complete 25 quests',
        requirement: 25,
        currentProgress: totalQuestCount,
        isUnlocked: totalQuestCount >= 25,
        unlockedAt: totalQuestCount >= 25 ? new Date() : undefined,
      },
      {
        id: 'quests-3',
        category: 'quests' as const,
        level: 3 as const,
        title: 'Quest Master',
        description: 'Complete 100 quests',
        requirement: 100,
        currentProgress: totalQuestCount,
        isUnlocked: totalQuestCount >= 100,
        unlockedAt: totalQuestCount >= 100 ? new Date() : undefined,
      },
      // Minutes achievements
      {
        id: 'minutes-1',
        category: 'minutes' as const,
        level: 1 as const,
        title: 'Time Saver',
        description: 'Save 10 minutes off your phone',
        requirement: 10,
        currentProgress: totalMinutesSaved,
        isUnlocked: totalMinutesSaved >= 10,
        unlockedAt: totalMinutesSaved >= 10 ? new Date() : undefined,
      },
      {
        id: 'minutes-2',
        category: 'minutes' as const,
        level: 2 as const,
        title: 'Time Guardian',
        description: 'Save 100 minutes off your phone',
        requirement: 100,
        currentProgress: totalMinutesSaved,
        isUnlocked: totalMinutesSaved >= 100,
        unlockedAt: totalMinutesSaved >= 100 ? new Date() : undefined,
      },
      {
        id: 'minutes-3',
        category: 'minutes' as const,
        level: 3 as const,
        title: 'Time Lord',
        description: 'Save 1000 minutes off your phone',
        requirement: 1000,
        currentProgress: totalMinutesSaved,
        isUnlocked: totalMinutesSaved >= 1000,
        unlockedAt: totalMinutesSaved >= 1000 ? new Date() : undefined,
      },
    ];
  };

  const achievements = generateAchievements();
  const streakAchievements = achievements.filter(
    (a) => a.category === 'streak'
  );
  const questAchievements = achievements.filter((a) => a.category === 'quests');
  const minutesAchievements = achievements.filter(
    (a) => a.category === 'minutes'
  );

  const totalAchievements = achievements.length;
  const unlockedAchievements = achievements.filter((a) => a.isUnlocked).length;

  return (
    <View style={styles.root}>
      <FocusAwareStatusBar />

      <ScreenContainer>
        {/* Header */}
        <ScreenHeader
          title="Achievements"
          subtitle={`Track your progress • ${unlockedAchievements}/${totalAchievements} Unlocked`}
          showBackButton
          onBackPress={() => router.push('/profile')}
        />

        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Achievement Sections */}
          <AchievementSection
            category="streak"
            achievements={streakAchievements}
          />
          <AchievementSection
            category="quests"
            achievements={questAchievements}
          />
          <AchievementSection
            category="minutes"
            achievements={minutesAchievements}
          />

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  scroll: {
    flex: 1,
    marginHorizontal: -spacing[4],
  },
  scrollContent: {
    paddingTop: spacing[5],
  },
  bottomSpacer: {
    height: spacing[8],
  },

  section: {
    marginBottom: spacing[12],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  sectionTitle: {
    marginLeft: spacing[2],
    fontFamily: fontFamily.bold,
    fontSize: 18,
    color: colors.text.primary,
  },

  carouselContent: {
    paddingHorizontal: 40,
  },
  cardSpacer: {
    marginRight: CARD_SPACING,
  },

  cardGlowWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.lg,
  },
  card: {
    flex: 1,
    ...shadows.card,
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    padding: spacing[6],
    justifyContent: 'space-between',
  },
  cardUnlocked: {
    borderColor: withAlpha(palette.sandy, 0.35),
  },

  iconRow: {
    marginBottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconDisc: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill.subtle,
  },
  iconDiscUnlocked: {
    backgroundColor: withAlpha(palette.sandy, 0.18),
  },

  title: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.text.primary,
  },
  description: {
    marginTop: spacing[2],
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.secondary,
  },

  progressHeader: {
    marginBottom: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: colors.text.primary,
  },
  progressValue: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.text.accent,
  },
  progressTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.track,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  progressFillGlow: {
    height: 6,
    borderRadius: radii.pill,
    shadowColor: palette.sandy,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.5,
    elevation: 0,
  },
  progressFillGradient: {
    flex: 1,
    borderRadius: radii.pill,
  },
  unlockedDate: {
    marginTop: spacing[3],
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.text.muted,
  },

  dotsRow: {
    marginTop: spacing[4],
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    marginHorizontal: 4,
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.primary,
  },
});
