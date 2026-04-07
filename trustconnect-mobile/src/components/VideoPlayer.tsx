/**
 * VideoPlayer — Reusable video player component
 * Wraps expo-video's VideoView with consistent styling
 */
import React from 'react';
import { View, StyleSheet, Pressable, Text, ActivityIndicator, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoPlayerProps {
  uri: string;
  height?: number;
  width?: number;
  borderRadius?: number;
  showControls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  contentFit?: 'contain' | 'cover' | 'fill';
  style?: object;
}

export default function VideoPlayer({
  uri,
  height = 240,
  width: playerWidth,
  borderRadius = 12,
  showControls = true,
  autoPlay = false,
  loop = false,
  contentFit = 'contain',
  style,
}: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    if (autoPlay) {
      p.play();
    }
  });

  if (!uri) {
    return (
      <View style={[styles.placeholder, { height, borderRadius }, style]}>
        <MaterialCommunityIcons name="video-off-outline" size={40} color="#B0BEC5" />
        <Text style={styles.placeholderText}>No video</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height, width: playerWidth, borderRadius }, style]}>
      <VideoView
        style={styles.video}
        player={player}
        nativeControls={showControls}
        contentFit={contentFit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: '#90A4AE',
    marginTop: 6,
  },
});
