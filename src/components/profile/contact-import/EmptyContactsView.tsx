import { Shield, TrendingUp, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import {
  colors,
  fontFamily,
  palette,
  radii,
  spacing,
  withAlpha,
} from '@/theme';

interface EmptyContactsViewProps {
  onImportContacts: () => void;
  onManualAdd: () => void;
}

const BENEFITS = [
  {
    icon: Users,
    title: 'Play cooperative quests together',
    lines: ['Motivate each other to stay focused'],
  },
  {
    icon: TrendingUp,
    title: 'Track shared progress',
    lines: ["See your friends' achievements & streaks"],
  },
  {
    icon: Shield,
    title: 'Build accountability',
    lines: ['Stay committed with friend support'],
  },
];

export const EmptyContactsView: React.FC<EmptyContactsViewProps> = ({
  onImportContacts,
  onManualAdd,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.benefits}>
        {BENEFITS.map((benefit) => (
          <View key={benefit.title} style={styles.benefitRow}>
            <View style={styles.iconTile}>
              <benefit.icon size={22} color={colors.text.accent} />
            </View>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{benefit.title}</Text>
              {benefit.lines.map((line) => (
                <Text key={line} style={styles.benefitLine}>
                  {line}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Import Contacts" onPress={onImportContacts} fullWidth />
        <Button
          label="Add Manual Contact"
          onPress={onManualAdd}
          variant="ghost"
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  benefits: {
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(palette.sandy, 0.15),
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    color: colors.text.primary,
  },
  benefitLine: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing[2],
  },
});
