/**
 * VideoThumbnail — Displays a video thumbnail with play icon overlay
 * Falls back to a placeholder when no thumbnail URL is available.
 */
import React from 'react';
import { View, Image, StyleSheet, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface VideoThumbnailProps {
  uri?: string | null;
  width?: number;
  height?: number;
  borderRadius?: number;
  onPress?: () => void;
  style?: object;
}

export default function VideoThumbnail({
  uri,
  width = 120,
  height = 80,
  borderRadius = 8,
  onPress,
  style,
}: VideoThumbnailProps) {
  const content = (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.placeholder, { borderRadius }]}>
          <MaterialCommunityIcons name="video-outline" size={24} color="#90A4AE" />
        </View>
      )}
      <View style={styles.playOverlay}>
        <View style={styles.playButton}>
          <MaterialCommunityIcons name="play" size={20} color="#fff" />
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#263238',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#37474F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
});
