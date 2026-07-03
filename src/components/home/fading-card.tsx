import { useRouter } from 'expo-router';

import { Button, Card, Text } from '@/components/ui';

export const FadingCard = () => {
  const router = useRouter();

  return (
    <Card className="mx-4 items-center gap-4 border border-white/10 bg-black/30 p-6">
      <Text className="text-center text-xl font-bold text-white opacity-80">
        Your Spirit Is Fading
      </Text>
      <Text className="text-center text-base text-white opacity-60">
        Vaedros grows quiet without you. Your spirit has dimmed, but it is not
        gone — a Restoration will call it back to the light.
      </Text>
      <Button
        label="Begin the Restoration"
        onPress={() => router.push('/restoration')}
        variant="secondary"
        size="lg"
        className="w-full rounded-xl p-3"
        textClassName="text-sm text-white text-center font-bold"
      />
    </Card>
  );
};
