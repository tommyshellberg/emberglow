import { AlertCircle, CheckCircle } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/emberglow';
import { colors, fontFamily, spacing, tracking } from '@/theme';

interface InviteResults {
  successful: { name: string; email: string }[];
  failed: { name: string; email: string; reason: string }[];
}

interface InviteResultsSummaryProps {
  results: InviteResults;
  onDone: () => void;
}

export const InviteResultsSummary: React.FC<InviteResultsSummaryProps> = ({
  results,
  onDone,
}) => {
  const { successful, failed } = results;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerMessage}>
          {successful.length > 0 && failed.length > 0
            ? 'Invitations sent with some failures'
            : successful.length > 0
              ? 'All invitations sent successfully!'
              : 'Failed to send invitations'}
        </Text>

        {successful.length > 0 && (
          <View style={styles.countRow}>
            <CheckCircle size={20} color={colors.status.success} />
            <Text style={styles.successCount}>
              {successful.length} Successful
            </Text>
          </View>
        )}

        {failed.length > 0 && (
          <View style={styles.countRow}>
            <AlertCircle size={20} color={colors.status.danger} />
            <Text style={styles.failedCount}>{failed.length} Failed</Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
      >
        {successful.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>SUCCESSFULLY INVITED</Text>
            {successful.map((contact, index) => (
              <View key={`success-${index}`} style={styles.row}>
                <CheckCircle size={20} color={colors.status.success} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{contact.name}</Text>
                  <Text style={styles.rowEmail}>{contact.email}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {failed.length > 0 && (
          <>
            {successful.length > 0 && <View style={styles.sectionDivider} />}
            <Text style={styles.sectionHeader}>FAILED TO INVITE</Text>
            {failed.map((contact, index) => (
              <View key={`failed-${index}`} style={styles.failedRow}>
                <View style={styles.rowStart}>
                  <AlertCircle size={20} color={colors.status.danger} />
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{contact.name}</Text>
                    <Text style={styles.rowEmail}>{contact.email}</Text>
                    <Text style={styles.rowReason}>{contact.reason}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Done" onPress={onDone} fullWidth />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
  headerMessage: {
    fontFamily: fontFamily.regular,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  successCount: {
    fontFamily: fontFamily.medium,
    fontSize: 17,
    color: colors.status.successText,
  },
  failedCount: {
    fontFamily: fontFamily.medium,
    fontSize: 17,
    color: colors.status.danger,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing[4],
    backgroundColor: colors.border.hairline,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing[4],
  },
  sectionHeader: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    letterSpacing: 12 * tracking.wide,
    color: colors.text.muted,
    marginBottom: spacing[3],
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border.hairline,
    marginVertical: spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  failedRow: {
    paddingVertical: spacing[3],
  },
  rowStart: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowText: {
    flex: 1,
    marginLeft: spacing[3],
  },
  rowName: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.text.primary,
  },
  rowEmail: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.text.muted,
    marginTop: 2,
  },
  rowReason: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.status.danger,
    marginTop: 2,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
    padding: spacing[4],
  },
});
