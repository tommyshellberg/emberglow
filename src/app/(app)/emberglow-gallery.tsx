/**
 * Emberglow component gallery — dev-only visual acceptance surface for
 * Phase 2 of the Emberglow design system rollout.
 *
 * Renders every base component (`src/components/emberglow`) in every
 * meaningful variant/state so it can be compared against the design spec's
 * own preview cards at
 * `.claude/skills/emberglow-design/components/{core,quest,overlay}/*.card.html`.
 *
 * Not linked from any menu or nav — reach it by typing the URL directly
 * (`/emberglow-gallery`). Redirects away outside of __DEV__.
 */
import { Redirect } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Flame,
  Hourglass,
  MapPin,
  Scroll,
  Settings,
} from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  BadgeTone,
  ButtonSize,
  ButtonVariant,
  DecisionSliderProps,
  EyebrowLabelTone,
  QuestCardStatus,
} from '@/components/emberglow';
import {
  Badge,
  BottomSheet,
  Button,
  DecisionSlider,
  EyebrowLabel,
  IconButton,
  Input,
  ListItem,
  ProgressRing,
  QuestCard,
  Switch,
  useEmberglowBottomSheet,
  XPBar,
} from '@/components/emberglow';
import { colors, fontFamily, radii, spacing } from '@/theme';

const QUEST_IMAGE = require('@/../assets/images/background/card-background-alt.jpg');

const BADGE_TONES: BadgeTone[] = ['ember', 'warm', 'neutral', 'success'];
const EYEBROW_TONES: EyebrowLabelTone[] = ['ember', 'warm', 'muted'];
const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'ghost',
  'outline',
];
const BUTTON_SIZES: ButtonSize[] = ['sm', 'md', 'lg'];
const QUEST_CARD_STATUSES: QuestCardStatus[] = [
  'Available',
  'In progress',
  'Complete',
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.subSection}>
      <Text style={styles.subSectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function DecisionSliderDemo({
  choices,
}: {
  choices: DecisionSliderProps['choices'];
}) {
  const [committed, setCommitted] = React.useState<number | null>(null);
  // Committing locks a slider instance by design; remount to try again.
  const [instance, setInstance] = React.useState(0);

  return (
    <View style={styles.column}>
      <DecisionSlider
        key={instance}
        choices={choices}
        onCommit={setCommitted}
      />
      {committed !== null ? (
        <>
          <Text style={styles.helperText}>
            {`Committed: "${choices[committed]}"`}
          </Text>
          <Button
            variant="ghost"
            size="sm"
            label="Reset"
            onPress={() => {
              setCommitted(null);
              setInstance((n) => n + 1);
            }}
          />
        </>
      ) : null}
    </View>
  );
}

function BottomSheetDemo() {
  const { ref, present } = useEmberglowBottomSheet();

  return (
    <>
      <Button label="Present bottom sheet" onPress={() => present()} />
      <BottomSheet ref={ref} title="New: Skill trees">
        <Text style={styles.sheetBody}>
          Unlock perks that grow with your journey.
        </Text>
        <View style={styles.sheetActions}>
          <Button label="Explore the skill tree" fullWidth />
          <Button variant="ghost" label="Maybe later" fullWidth />
        </View>
      </BottomSheet>
    </>
  );
}

export default function EmberglowGalleryScreen() {
  const insets = useSafeAreaInsets();
  const [switchOn, setSwitchOn] = React.useState(true);
  const [switchOff, setSwitchOff] = React.useState(false);

  if (!__DEV__) return <Redirect href="/" />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing[4],
          paddingBottom: insets.bottom + spacing[8],
        },
      ]}
    >
      <Text style={styles.pageTitle}>Emberglow gallery</Text>
      <Text style={styles.pageSubtitle}>
        Dev-only visual acceptance surface. Not linked from any menu.
      </Text>

      <Section title="EyebrowLabel">
        <View style={styles.row}>
          {EYEBROW_TONES.map((tone) => (
            <EyebrowLabel key={tone} tone={tone}>
              {`${tone} eyebrow`}
            </EyebrowLabel>
          ))}
        </View>
      </Section>

      <Section title="Badge">
        <View style={styles.row}>
          {BADGE_TONES.map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone === 'success' ? 'Complete' : `+72 XP`}
            </Badge>
          ))}
        </View>
      </Section>

      <Section title="Button">
        {BUTTON_VARIANTS.map((variant) => (
          <SubSection key={variant} title={variant}>
            <View style={styles.row}>
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size} label={size} />
              ))}
            </View>
            <View style={[styles.row, styles.rowGapTop]}>
              <Button variant={variant} label="Disabled" disabled />
              {variant === 'primary' ? (
                <Button variant={variant} label="Glowing" glow />
              ) : null}
            </View>
          </SubSection>
        ))}
      </Section>

      <Section title="IconButton">
        <View style={styles.row}>
          <IconButton label="Settings (inactive)">
            <Settings />
          </IconButton>
          <IconButton label="Timer (active)" active>
            <Hourglass />
          </IconButton>
          <IconButton label="Notifications (disabled)" disabled>
            <Bell />
          </IconButton>
        </View>
      </Section>

      <Section title="Input">
        <SubSection title="Default">
          <Input
            label="Hero name"
            placeholder="What shall we call you?"
            hint="You can change this later."
          />
        </SubSection>
        <SubSection title="Focused">
          <Input
            label="Reflection"
            placeholder="What did you notice?"
            autoFocus
          />
        </SubSection>
        <SubSection title="Multiline">
          <Input
            label="Journal entry"
            multiline
            placeholder="The forest darkens..."
          />
        </SubSection>
      </Section>

      <Section title="Switch">
        <View style={styles.column}>
          <Switch checked={switchOn} onChange={setSwitchOn} label="On" />
          <Switch checked={switchOff} onChange={setSwitchOff} label="Off" />
          <Switch checked label="Disabled (on)" disabled />
          <Switch checked={false} label="Disabled (off)" disabled />
        </View>
      </Section>

      <Section title="ProgressRing">
        <View style={styles.row}>
          {[0, 0.35, 0.82, 1].map((progress) => (
            <ProgressRing key={progress} progress={progress} size={110}>
              <Text style={styles.ringLabel}>
                {Math.round(progress * 100)}%
              </Text>
            </ProgressRing>
          ))}
        </View>
      </Section>

      <Section title="XPBar">
        <View style={styles.column}>
          <XPBar level={1} xp={0} xpNext={100} />
          <XPBar level={6} xp={340} xpNext={500} />
          <XPBar level={9} xp={500} xpNext={500} />
        </View>
      </Section>

      <Section title="ListItem">
        <View style={styles.listItemGroup}>
          <ListItem
            title="Collecting firewood"
            subtitle="Yesterday · 15 min"
            leading={<Scroll color={colors.text.accent} size={20} />}
            trailing={<Text style={styles.listTrailing}>+72 XP</Text>}
            onPress={() => {}}
          />
          <ListItem title="Evening walk" subtitle="2 days ago · 30 min" />
          <ListItem
            title="Settings"
            trailing={<ChevronRight color={colors.text.muted} size={18} />}
            onPress={() => {}}
          />
          <ListItem
            title="Nearby ruins"
            leading={<MapPin color={colors.text.accent} size={20} />}
          />
        </View>
      </Section>

      <Section title="QuestCard">
        {QUEST_CARD_STATUSES.map((status) => (
          <SubSection key={status} title={status}>
            <QuestCard
              title="Collecting firewood"
              description="The forest darkens. You gather what you can before night falls."
              xp={72}
              duration="15 min"
              status={status}
              image={QUEST_IMAGE}
              onPress={() => {}}
            />
          </SubSection>
        ))}
        <SubSection title="No image">
          <QuestCard
            title="A quiet reflection"
            description="Sit with your thoughts for a while."
            xp={20}
            duration="10 min"
            status="Available"
          />
        </SubSection>
        <SubSection title="Glowing (resting warm state)">
          <QuestCard
            title="The signal fire"
            description="Warm glow + warm border, controlled by the screen."
            xp={50}
            duration="20 min"
            status="In progress"
            image={QUEST_IMAGE}
            glow
          />
        </SubSection>
      </Section>

      <Section title="DecisionSlider">
        <SubSection title="Two choices (long + short label pair)">
          <DecisionSliderDemo
            choices={[
              'Trust the flickering magic within you, whatever it costs',
              'Turn back',
            ]}
          />
        </SubSection>
        <SubSection title="Single choice (hold to commit)">
          <DecisionSliderDemo choices={['Wake up']} />
        </SubSection>
        <SubSection title="Disabled">
          <DecisionSlider choices={['Wake up']} onCommit={() => {}} disabled />
        </SubSection>
      </Section>

      <Section title="BottomSheet">
        <View style={styles.row}>
          <Flame color={colors.text.accent} size={18} />
          <Text style={styles.helperText}>
            Overlay component — present it via the button below.
          </Text>
        </View>
        <BottomSheetDemo />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface.app,
  },
  content: {
    paddingHorizontal: spacing[4],
    gap: spacing[6],
  },
  pageTitle: {
    fontFamily: fontFamily.display,
    fontSize: 28,
    color: colors.text.primary,
  },
  pageSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.muted,
    marginTop: spacing[2],
  },
  section: {
    gap: spacing[3],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  sectionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text.primary,
  },
  subSection: {
    gap: spacing[2],
  },
  subSectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.text.secondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  rowGapTop: {
    marginTop: spacing[2],
  },
  column: {
    gap: spacing[3],
  },
  listItemGroup: {
    borderRadius: radii.md,
    backgroundColor: colors.surface.raised,
    overflow: 'hidden',
  },
  listTrailing: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.text.muted,
  },
  ringLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    color: colors.text.primary,
  },
  helperText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
  },
  sheetBody: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  sheetActions: {
    gap: spacing[2],
  },
});
