import { Shield, TrendingUp, Users } from 'lucide-react-native';
import React from 'react';
import { View } from 'react-native';

import { Button, Text } from '@/components/ui';
import colors from '@/components/ui/colors';

interface EmptyContactsViewProps {
  onImportContacts: () => void;
  onManualAdd: () => void;
}

export const EmptyContactsView: React.FC<EmptyContactsViewProps> = ({
  onImportContacts,
  onManualAdd,
}) => {
  return (
    <View className="flex-1 bg-background p-6">
      {/* Benefits Section */}
      <View className="mb-8">
        {/* Benefit Items */}
        <View>
          <View className="mb-4 flex-row items-center">
            <View
              className="mr-4 size-12 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.secondary[100] }}
            >
              <Users size={24} color={colors.secondary[500]} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">
                Play cooperative quests together
              </Text>
              <Text className="text-sm" style={{ color: colors.neutral[200] }}>
                Motivate each other to stay focused
              </Text>
              <Text className="text-sm" style={{ color: colors.neutral[200] }}>
                (coming soon)
              </Text>
            </View>
          </View>

          <View className="mb-4 flex-row items-center">
            <View
              className="mr-4 size-12 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.secondary[100] }}
            >
              <TrendingUp size={24} color={colors.secondary[500]} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">
                Track shared progress
              </Text>
              <Text className="text-sm" style={{ color: colors.neutral[200] }}>
                See your friends' achievements & streaks
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            <View
              className="mr-4 size-12 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.secondary[100] }}
            >
              <Shield size={24} color={colors.secondary[500]} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">
                Build accountability
              </Text>
              <Text className="text-sm" style={{ color: colors.neutral[200] }}>
                Stay committed with friend support
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View className="mt-auto">
        <Button
          label="Import Contacts"
          onPress={onImportContacts}
          className="mb-3 w-full"
        />

        <Button
          label="Add Manual Contact"
          onPress={onManualAdd}
          variant="ghost"
          className="w-full"
        />
      </View>
    </View>
  );
};
