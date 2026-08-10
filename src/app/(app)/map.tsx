import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Image as RNImage } from 'react-native';

import { useHighestCompletedQuest } from '@/api/quest';
import {
  getMapNameForQuest,
  getPreRenderedMapForQuest,
} from '@/app/utils/map-utils';
import { Image, Text, View } from '@/components/ui';
import { FocusAwareStatusBar } from '@/components/ui';

// Get device screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function MapScreen() {
  const zoomableViewRef = useRef<any>(null);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Fetch the highest completed quest from the API
  const {
    data: highestQuestData,
    isLoading,
    error,
  } = useHighestCompletedQuest({
    storylineId: 'vaedros', // TODO: Make this dynamic based on current storyline
  });

  // Fallback to quest-1 if no quests completed or loading
  const highestQuestId =
    highestQuestData?.highestCompletedQuest?.customId || 'quest-1';

  // Get the pre-rendered map image based on highest completed quest
  const mapImageSource = useMemo(
    () => getPreRenderedMapForQuest(highestQuestId),
    [highestQuestId]
  );

  // The visible title and the screen-reader label for the picture must come
  // from the same call. `getMapNameForQuest` returns a different name once the
  // player unlocks a later quest (Vaedros Kingdom, Darkwood Forest, ...), so a
  // hardcoded label would announce a place the user is not looking at.
  const mapName = getMapNameForQuest(highestQuestId);

  // Get actual image dimensions
  useEffect(() => {
    if (mapImageSource) {
      const imageAsset = RNImage.resolveAssetSource(mapImageSource);
      setImageDimensions({
        width: imageAsset.width,
        height: imageAsset.height,
      });
    }
  }, [mapImageSource]);

  // Calculate zoom levels based on actual image dimensions
  // Ensure the image height fills the screen height at minimum zoom
  const minZoom = imageDimensions ? screenHeight / imageDimensions.height : 1;

  const maxZoom = Math.max(1, minZoom * 2); // Allow zooming in 2x from minimum
  const initialZoom = minZoom; // Start at minimum zoom

  // Calculate initial offset to show bottom-right corner
  const initialOffsetX = 0;
  const initialOffsetY = 0;

  // Show loading state while fetching highest quest or image dimensions
  if (isLoading || !imageDimensions) {
    return (
      <View
        testID="map-loading"
        className="flex-1 items-center justify-center bg-[rgba(61,73,78,0.92)]"
      >
        <FocusAwareStatusBar />
        <Text className="text-lg text-primary-300">Loading map...</Text>
      </View>
    );
  }

  return (
    <View testID="map-screen" className="flex-1 bg-[rgba(61,73,78,0.92)]">
      <FocusAwareStatusBar />

      {/* Map Title */}
      <View className="absolute left-4 top-10 z-10 rounded-lg bg-black/50 px-3 py-1 backdrop-blur-sm">
        <Text testID="map-title" className="text-xl font-bold text-white">
          {mapName}
        </Text>
      </View>

      {/* Zoomable Map */}
      <View style={{ flex: 1 }}>
        <ReactNativeZoomableView
          ref={zoomableViewRef}
          maxZoom={maxZoom}
          minZoom={minZoom}
          initialZoom={initialZoom}
          initialOffsetX={initialOffsetX}
          initialOffsetY={initialOffsetY}
          bindToBorders={true}
          contentWidth={imageDimensions.width}
          contentHeight={imageDimensions.height}
          panBoundaryPadding={0}
          style={{ flex: 1 }}
          doubleTapDelay={300}
          movementSensibility={3}
          longPressDuration={700}
        >
          <Image
            key={`map-${highestQuestId}`}
            testID="map-image"
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={`${mapName} map`}
            source={mapImageSource}
            style={{
              width: imageDimensions.width,
              height: imageDimensions.height,
            }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        </ReactNativeZoomableView>
      </View>
    </View>
  );
}
