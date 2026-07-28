import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { usePostHog } from 'posthog-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { getAccessToken } from '@/api/token';
import { Button, EyebrowLabel, Input } from '@/components/emberglow';
import { EmberProgress } from '@/components/onboarding/ember-progress';
import { FocusAwareStatusBar, Image } from '@/components/ui';
import {
  createProvisionalUser,
  updateUserCharacter,
} from '@/lib/services/user';
import { useCharacterStore } from '@/store/character-store';
import { OnboardingStep, useOnboardingStore } from '@/store/onboarding-store';
import { useSettingsStore } from '@/store/settings-store';
import { type Character, type CharacterType } from '@/store/types';
import {
  colors,
  durations,
  easing,
  fontFamily,
  leading,
  palette,
  radii,
  scrims,
  shadows,
  spacing,
  tracking,
  withAlpha,
} from '@/theme';

import CHARACTERS from '../data/characters';

// Local steps for this screen's flow
enum CharacterStep {
  INTRO_AND_NAME = 'intro_and_name',
  CHARACTER_SELECTION = 'character_selection',
}

// Both step headers share the same eyebrow.
const STEP_EYEBROW = 'Create your hero';

// Name validation (founder call, 2026-07-12 — deliberate behavior change):
// trimmed length 2-16. Charset (alphanumeric + spaces) is already enforced
// by the input's onChangeText filter below, so this only checks length.
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 16;
const NAME_HINT = `Letters and numbers, ${NAME_MIN_LENGTH}–${NAME_MAX_LENGTH} characters.`;

function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= NAME_MIN_LENGTH && trimmed.length <= NAME_MAX_LENGTH;
}

// Get screen dimensions and define card dimensions
const screenWidth = Dimensions.get('window').width;
const cardWidth = screenWidth * 0.65; // 65% of screen width to show more of adjacent cards
const cardHeight = screenWidth * 1.2;
const cardSpacing = 16; // Space between cards
const snapInterval = cardWidth + cardSpacing;

// Staged fade/rise entrance delays (ms) — mirrors the previous
// FadeInLeft/FadeInDown stagger feel, converged onto withDelay/withTiming +
// easing.emberOut per this task's implementer note.
const RISE_DISTANCE = 14;
const HEADER_DELAY = 0;
const SECONDARY_DELAY = 150;
const TERTIARY_DELAY = 250;
const BUTTON_DELAY = 100;

type FadeRiseProps = {
  delay?: number;
  children: React.ReactNode;
  style?: React.ComponentProps<typeof Animated.View>['style'];
};

/**
 * Staged fade + rise entrance, replacing the FadeInLeft/FadeInDown presets
 * this screen used previously. Restarts whenever the instance mounts (each
 * step is a distinct component swapped in by `renderStepContent`, so no
 * extra `key` prop is needed to force a remount here).
 *
 * KNOWN DUPLICATION: this is the same staged fade-rise that
 * `journal-components.tsx` / `app-introduction.tsx` express as a custom
 * `riseIn` `entering=` builder. There is no technical reason for the
 * component-wrapper form over the builder form — it exists because Tasks
 * 21-25 were dispatched in parallel on file-disjoint scopes, so no shared
 * helper could be created mid-flight. Unifying all copies onto one shared
 * builder is a queued cross-file follow-up (Task 22 code review, item 3).
 */
function FadeRise({ delay = 0, children, style }: FadeRiseProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(RISE_DISTANCE);

  useEffect(() => {
    const config = {
      duration: durations.base,
      easing: Easing.bezier(...easing.emberOut),
    };
    opacity.value = withDelay(delay, withTiming(1, config));
    translateY.value = withDelay(delay, withTiming(0, config));
    // Entrance should only run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
  );
}

// --- Character card ---
type CharacterCardProps = {
  character: (typeof CHARACTERS)[0];
  selected: boolean;
};

const CARD_BORDER_SELECTED = withAlpha(palette.cinnabar, 0.55);
const CARD_DIM_SCALE = 0.9;
const CARD_DIM_OPACITY = 0.55;

// Memoized so FlatList row re-renders bail out unless `selected` flips —
// together with the memoized `renderItem` below this restores the render
// stability the pre-recomposition code got from its `useCallback`.
//
// Four nested layers below, per quest-card.tsx's documented precedent: iOS
// composes only one shadow per layer and drops shadows entirely once a view
// clips with `overflow: hidden` — so the scale/dim transform, the warm
// selection glow, the resting card shadow, and the clipped border+art each
// need their own layer. Don't collapse them.
const CharacterCard = React.memo(function CharacterCard({
  character,
  selected,
}: CharacterCardProps) {
  return (
    <View style={styles.cardSlot}>
      <View
        style={[
          styles.cardScaleWrapper,
          {
            transform: [{ scale: selected ? 1 : CARD_DIM_SCALE }],
            opacity: selected ? 1 : CARD_DIM_OPACITY,
          },
        ]}
      >
        <View style={[styles.cardGlow, selected && shadows.glowEmber]}>
          <View style={styles.cardShadow}>
            <View
              style={[
                styles.cardInner,
                {
                  borderColor: selected
                    ? CARD_BORDER_SELECTED
                    : colors.border.hairline,
                },
              ]}
            >
              <Image
                source={character.image}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
              />
              <LinearGradient
                pointerEvents="none"
                colors={scrims.bottom.colors}
                start={scrims.bottom.start}
                end={scrims.bottom.end}
                style={styles.cardScrim}
              />
              <View style={styles.cardTextBlock}>
                <Text style={styles.cardLabel}>{character.title}</Text>
                <Text style={styles.cardName}>{character.type}</Text>
                <Text
                  style={styles.cardDescription}
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  {character.description}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

// --- Step 1: name ---
type NameStepContentProps = {
  inputName: string;
  onChangeName: (text: string) => void;
};

function NameStepContent({ inputName, onChangeName }: NameStepContentProps) {
  const touchedInvalid = inputName.length > 0 && !isValidName(inputName);

  return (
    <View>
      <FadeRise delay={HEADER_DELAY}>
        <EyebrowLabel>{STEP_EYEBROW}</EyebrowLabel>
        <Text style={styles.title}>Every legend needs a name</Text>
        <Text style={styles.body}>
          This is who quests while your phone rests.
        </Text>
      </FadeRise>
      <FadeRise delay={SECONDARY_DELAY} style={styles.nameInputBlock}>
        <Input
          testID="character-name-input"
          label="Hero name"
          placeholder="e.g. Rowan"
          value={inputName}
          onChangeText={onChangeName}
          hint={touchedInvalid ? NAME_HINT : undefined}
          autoFocus
        />
      </FadeRise>
    </View>
  );
}

// --- Step 2: character select ---
type CharacterSelectContentProps = {
  name: string;
  selectedId: string;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

function CharacterSelectContent({
  name,
  selectedId,
  onMomentumScrollEnd,
}: CharacterSelectContentProps) {
  const selectedIndex = CHARACTERS.findIndex((c) => c.id === selectedId);
  const title = name ? `Choose ${name}'s path` : 'Choose your path';

  // Keyed on the selection only, so parent re-renders that don't change the
  // selection (e.g. `isCreating` toggling mid-request) keep renderItem's
  // identity stable and FlatList skips a full row-diff pass — the same
  // guarantee the pre-recomposition `useCallback([selectedCharacter])` gave.
  const renderItem = useCallback(
    ({ item }: { item: (typeof CHARACTERS)[0] }) => (
      <CharacterCard character={item} selected={item.id === selectedId} />
    ),
    [selectedId]
  );

  return (
    <View style={styles.selectRoot}>
      <FadeRise delay={HEADER_DELAY}>
        <EyebrowLabel>{STEP_EYEBROW}</EyebrowLabel>
        <Text style={styles.selectTitle}>{title}</Text>
      </FadeRise>
      <FadeRise delay={SECONDARY_DELAY} style={styles.carouselWrapper}>
        <FlatList
          data={CHARACTERS}
          horizontal
          testID="character-carousel"
          snapToInterval={snapInterval}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.id}
          initialScrollIndex={0}
          getItemLayout={(_data, index) => ({
            length: snapInterval,
            offset: snapInterval * index,
            index,
          })}
          contentContainerStyle={{
            paddingHorizontal: (screenWidth - cardWidth - cardSpacing) / 2,
          }}
          ItemSeparatorComponent={() => <View style={{ width: cardSpacing }} />}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={renderItem}
          removeClippedSubviews={true}
        />
      </FadeRise>
      <FadeRise delay={TERTIARY_DELAY} style={styles.dotsSection}>
        <View style={styles.dotsRow}>
          {CHARACTERS.map((c, i) => (
            <View
              key={c.id}
              style={
                i === selectedIndex ? styles.dotActive : styles.dotInactive
              }
            />
          ))}
        </View>
        <Text style={styles.counterText}>
          {`${selectedIndex + 1} of ${CHARACTERS.length} · swipe to explore`}
        </Text>
      </FadeRise>
    </View>
  );
}

export default function ChooseCharacterScreen() {
  const createCharacter = useCharacterStore((state) => state.createCharacter);
  const posthog = usePostHog();

  // Local step state for this screen
  const [currentStep, setCurrentStep] = useState<CharacterStep>(
    CharacterStep.INTRO_AND_NAME
  );

  // Initialize with the first character selected
  const [selectedCharacter, setSelectedCharacter] = useState<string>(
    CHARACTERS[0].id
  );
  const [inputName, setInputName] = useState<string>('');
  const [debouncedName, setDebouncedName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // One shared player; replace() swaps the source, which stops any clip that
  // is still speaking — rapid swipes therefore can't queue clips.
  const introPlayer = useAudioPlayer();

  const playIntroClip = useCallback(
    (characterId: string) => {
      // One flag governs music and intro clips alike: a user who muted the
      // onboarding music hears no character voices either. Read via
      // getState so this callback doesn't need the value in its dependency
      // list.
      if (!useSettingsStore.getState().onboardingSoundEnabled) return;

      const character = CHARACTERS.find((c) => c.id === characterId);
      if (!character) return;
      try {
        introPlayer.replace(character.introAudio);
        introPlayer.play();
      } catch (error) {
        // A sound effect must never block onboarding.
        console.warn('Failed to play character intro clip:', error);
      }
    },
    [introPlayer]
  );

  useEffect(() => {
    posthog.capture('onboarding_open_choose_character_screen');
  }, [posthog]);

  // On entering the selection step, voice the initially selected card, which
  // would otherwise stay silent until a swipe. The audio session is already
  // configured by useOnboardingMusic (Task 8) — do NOT call setAudioModeAsync
  // here; doing so would globally override the silent-switch decision.
  useEffect(() => {
    if (currentStep !== CharacterStep.CHARACTER_SELECTION) return;
    playIntroClip(selectedCharacter);
    // Intentionally fires only on step entry, not on later selection changes
    // (those are voiced by handleCarouselScrollEnd).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Debounce the input name: update debouncedName 500ms after user stops typing.
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedName(inputName);
    }, 500);
    return () => clearTimeout(handler);
  }, [inputName]);

  // Clear error when user changes inputs
  useEffect(() => {
    if (error) {
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedName, selectedCharacter]);

  const handleNameChange = (text: string) => {
    const filtered = text.replace(/[^a-zA-Z0-9\s]/g, '');
    setInputName(filtered);
  };

  const handleCarouselScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / snapInterval);
    const newId = CHARACTERS[newIndex].id;
    if (newId !== selectedCharacter) {
      playIntroClip(newId);
    }
    setSelectedCharacter(newId);
  };

  // Handle step progression
  const handleStepForward = () => {
    switch (currentStep) {
      case CharacterStep.INTRO_AND_NAME:
        if (isValidName(debouncedName)) {
          setCurrentStep(CharacterStep.CHARACTER_SELECTION);
        }
        break;
      case CharacterStep.CHARACTER_SELECTION:
        handleContinue();
        break;
    }
  };

  // Render content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case CharacterStep.INTRO_AND_NAME:
        return (
          <NameStepContent
            inputName={inputName}
            onChangeName={handleNameChange}
          />
        );

      case CharacterStep.CHARACTER_SELECTION:
        return (
          <CharacterSelectContent
            name={debouncedName.trim()}
            selectedId={selectedCharacter}
            onMomentumScrollEnd={handleCarouselScrollEnd}
          />
        );
      default:
        console.error('unexpected CharacterStep value: ', currentStep);
        return (
          <NameStepContent
            inputName={inputName}
            onChangeName={handleNameChange}
          />
        );
    }
  };

  // Get button text based on current step
  const getButtonText = () => {
    switch (currentStep) {
      case CharacterStep.INTRO_AND_NAME:
        return 'Continue';
      case CharacterStep.CHARACTER_SELECTION:
        return isCreating ? 'Forging your legend…' : 'Create character';
      default:
        return 'Continue';
    }
  };

  // Check if current step can proceed
  const canProceed = () => {
    switch (currentStep) {
      case CharacterStep.INTRO_AND_NAME:
        return isValidName(debouncedName);
      case CharacterStep.CHARACTER_SELECTION:
        return isValidName(debouncedName) && !isCreating;
      default:
        return false;
    }
  };

  const handleContinue = async () => {
    if (!isValidName(debouncedName) || isCreating) return;

    const selected = CHARACTERS.find((c) => c.id === selectedCharacter);
    if (!selected) return;

    setIsCreating(true);
    setError(null);

    try {
      posthog.capture('onboarding_trigger_continue_choose_character');

      // Create the new character object
      const newCharacter = {
        type: selected.id,
        name: debouncedName.trim(),
      };

      // 1. First update local character store
      createCharacter(selected.id as CharacterType, debouncedName.trim());
      posthog.capture('onboarding_update_character_local_store_success');

      // 2. Persist the hero server-side. A live real session (Google-first
      // signup routed here via /no-hero) must PATCH its own account —
      // minting a provisional user here would create a second identity and
      // silently split quest data across the two (empty journal bug).
      // createProvisionalUser enforces the same invariant with a throw.
      if (getAccessToken()) {
        await updateUserCharacter(newCharacter as Character);
        posthog.capture('onboarding_update_character_server_success');
      } else {
        await createProvisionalUser(newCharacter as Character);
        posthog.capture('onboarding_create_provisional_user_success');
      }

      // Only proceed if both operations succeeded
      useOnboardingStore
        .getState()
        .setCurrentStep(OnboardingStep.VIEWING_INTRO);
    } catch (error: unknown) {
      // Handle specific error types
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'STORAGE_UNAVAILABLE') {
        posthog.capture('onboarding_storage_unavailable');
        setError(
          'Unable to access device storage. Please check storage permissions and available space.'
        );
        return; // Don't reset character store
      }

      if (errorMessage === 'PROVISIONAL_EMAIL_TAKEN') {
        posthog.capture('onboarding_provisional_email_taken');
        // This is recoverable - the provisional account already exists, so we can continue
        useOnboardingStore
          .getState()
          .setCurrentStep(OnboardingStep.VIEWING_INTRO);
      } else {
        // For all other errors, don't proceed and show error to user
        posthog.capture('onboarding_create_provisional_user_error', {
          error: errorMessage,
        });

        // Reset character store since we couldn't create provisional account
        useCharacterStore.getState().resetCharacter();

        // Show user-friendly error message
        if (
          errorMessage.includes('network') ||
          errorMessage.includes('fetch')
        ) {
          setError(
            'Network error. Please check your connection and try again.'
          );
        } else if (
          errorMessage.includes('server') ||
          errorMessage.includes('500')
        ) {
          setError('Server error. Please try again in a moment.');
        } else {
          setError('Failed to create account. Please try again.');
        }
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <FocusAwareStatusBar />

      <View style={styles.content}>
        <EmberProgress
          current={currentStep === CharacterStep.INTRO_AND_NAME ? 1 : 2}
          style={styles.progress}
        />

        <View style={styles.stepContent}>{renderStepContent()}</View>

        {/* Button Section */}
        <FadeRise
          key={`button-${currentStep}`}
          delay={BUTTON_DELAY}
          style={styles.buttonSection}
        >
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            // The label is step-dependent (`getButtonText()`), so it is the
            // one control on this screen that cannot be addressed by text at
            // all without the flow knowing which step it is on.
            testID="character-step-continue"
            variant="primary"
            size="lg"
            fullWidth
            label={getButtonText()}
            onPress={handleStepForward}
            disabled={!canProceed()}
          />
        </FadeRise>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  content: {
    flex: 1,
    paddingTop: 54,
    paddingHorizontal: 24,
    paddingBottom: 36,
    justifyContent: 'space-between',
  },
  progress: {
    marginBottom: spacing[4],
  },
  stepContent: {
    flex: 1,
  },
  buttonSection: {},

  // Name step
  title: {
    fontFamily: fontFamily.display,
    fontSize: 34,
    lineHeight: 34 * 1.15,
    color: colors.text.primary,
    marginTop: 10,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 16 * leading.body,
    color: colors.text.muted,
    marginTop: 10,
  },
  nameInputBlock: {
    marginTop: 36,
  },

  // Select step
  selectRoot: {
    flex: 1,
    minHeight: 0,
  },
  selectTitle: {
    fontFamily: fontFamily.display,
    fontSize: 30,
    lineHeight: 30 * 1.15,
    color: colors.text.primary,
    marginTop: 8,
  },
  carouselWrapper: {
    flex: 1,
    minHeight: 0,
    marginTop: 18,
    marginHorizontal: -24,
  },
  dotsSection: {
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
    marginBottom: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: palette.sandy,
  },
  dotInactive: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: 'transparent',
  },
  counterText: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    color: colors.text.muted,
    fontVariant: ['tabular-nums'],
  },

  // Character card
  cardSlot: {
    width: cardWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardScaleWrapper: {
    width: cardWidth,
  },
  cardGlow: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
  },
  cardShadow: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface.raised,
    ...shadows.card,
  },
  cardInner: {
    height: cardHeight,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
  },
  cardScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
  },
  cardTextBlock: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
  },
  cardLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 11.5,
    letterSpacing: 11.5 * tracking.label,
    textTransform: 'uppercase',
    color: colors.text.accent,
  },
  cardName: {
    fontFamily: fontFamily.display,
    fontSize: 27,
    lineHeight: 27 * 1.15,
    color: colors.text.primary,
    marginTop: 6,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 14 * 1.45,
    color: colors.text.secondary,
  },

  // Error banner — retinted from red-100/red-800 Tailwind classes.
  errorBanner: {
    backgroundColor: withAlpha(palette.cinnabar, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(palette.cinnabar, 0.4),
    borderRadius: radii.md,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 14 * leading.body,
    color: colors.text.primary,
    textAlign: 'center',
  },
});
