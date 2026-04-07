import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, ActivityIndicator, TextInput, KeyboardAvoidingView,
  Platform, Modal, Alert, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { reelService, Reel, ReelComment } from '../services/reelService';
import { useAuth } from '../services/AuthContext';
import { API_BASE_URL } from '../config/api';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = SCREEN_HEIGHT;

function ReelItem({
  reel, isActive, currentUserId, onLike, onComment, onProfile
}: {
  reel: Reel; isActive: boolean; currentUserId: number | null;
  onLike: (id: number) => void; onComment: (id: number) => void; onProfile: () => void;
}) {
  const videoUrl = reel.videoUrl.startsWith('http')
    ? reel.videoUrl
    : `${API_BASE_URL.replace('/api', '')}${reel.videoUrl}`;

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  const isLiked = currentUserId ? reel.likes?.includes(currentUserId) : false;

  return (
    <View style={styles.reelContainer}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Overlay gradient */}
      <View style={styles.gradientOverlay} />

      {/* Right side actions */}
      <View style={styles.sideActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onProfile}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(reel.userName || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(reel.id)}>
          <Text style={[styles.actionIcon, isLiked && styles.likedIcon]}>
            {isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>{reel.likes?.length || 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment(reel.id)}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{reel.comments?.length || 0}</Text>
        </TouchableOpacity>

        <View style={styles.actionBtn}>
          <Text style={styles.actionIcon}>👁</Text>
          <Text style={styles.actionCount}>{reel.views || 0}</Text>
        </View>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <TouchableOpacity onPress={onProfile}>
          <Text style={styles.userName}>@{reel.userName}</Text>
        </TouchableOpacity>
        <Text style={styles.userRole}>{reel.userRole}</Text>
        {reel.caption ? <Text style={styles.caption} numberOfLines={3}>{reel.caption}</Text> : null}
        {reel.category && reel.category !== 'general' && (
          <View style={styles.categoryTag}>
            <Text style={styles.categoryText}>#{reel.category}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentReelId, setCommentReelId] = useState<number | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCaption, setCreateCaption] = useState('');
  const [createCategory, setCreateCategory] = useState('general');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchReels = useCallback(async (pageNum = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await reelService.getFeed(pageNum);
      if (res.success) {
        if (pageNum === 1) {
          setReels(res.reels);
        } else {
          setReels(prev => [...prev, ...res.reels]);
        }
        setHasMore(res.pagination.page < res.pagination.pages);
      }
    } catch (err) {
      console.error('Failed to load reels:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReels(1);
  }, [fetchReels]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchReels(nextPage);
  }, [hasMore, loading, page, fetchReels]);

  const handleLike = async (reelId: number) => {
    try {
      const res = await reelService.toggleLike(reelId);
      if (res.success) {
        setReels(prev => prev.map(r => {
          if (r.id !== reelId) return r;
          const likes = [...(r.likes || [])];
          if (res.liked) {
            if (user?.userId && !likes.includes(user.userId)) likes.push(user.userId);
          } else {
            const idx = likes.indexOf(user?.userId || -1);
            if (idx >= 0) likes.splice(idx, 1);
          }
          return { ...r, likes };
        }));
      }
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const openComments = (reelId: number) => {
    const reel = reels.find(r => r.id === reelId);
    setComments(reel?.comments || []);
    setCommentReelId(reelId);
    setCommentModalVisible(true);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !commentReelId || submittingComment) return;
    try {
      setSubmittingComment(true);
      const res = await reelService.addComment(commentReelId, newComment.trim());
      if (res.success) {
        setComments(prev => [...prev, res.comment]);
        setNewComment('');
        // Update local reels state
        setReels(prev => prev.map(r => {
          if (r.id !== commentReelId) return r;
          return { ...r, comments: [...(r.comments || []), res.comment] };
        }));
      }
    } catch (err) {
      console.error('Comment failed:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant media library access to post reels.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedVideo(result.assets[0].uri);
      setShowCreateModal(true);
    }
  };

  const handleCreateReel = async () => {
    if (!selectedVideo || uploading) return;
    try {
      setUploading(true);
      const res = await reelService.createReel(selectedVideo, createCaption, createCategory);
      if (res.success) {
        Alert.alert('Success', 'Your reel has been posted!');
        setShowCreateModal(false);
        setSelectedVideo(null);
        setCreateCaption('');
        setCreateCategory('general');
        fetchReels(1);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to upload reel. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index || 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (loading && reels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFC107" />
        <Text style={styles.loadingText}>Loading reels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reels</Text>
        <TouchableOpacity onPress={pickVideo} style={styles.createBtn}>
          <Text style={styles.createText}>+</Text>
        </TouchableOpacity>
      </View>

      {reels.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎬</Text>
          <Text style={styles.emptyTitle}>No Reels Yet</Text>
          <Text style={styles.emptyText}>Be the first to share a work-related reel!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={pickVideo}>
            <Text style={styles.emptyBtnText}>Create Reel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <ReelItem
              reel={item}
              isActive={index === activeIndex}
              currentUserId={user?.userId || null}
              onLike={handleLike}
              onComment={openComments}
              onProfile={() => {}}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}

      {/* Comment Modal */}
      <Modal visible={commentModalVisible} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.commentOverlay}
          activeOpacity={1}
          onPress={() => setCommentModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.commentSheet}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.commentHandle} />
              <Text style={styles.commentTitle}>Comments ({comments.length})</Text>

              <FlatList
                data={comments}
                keyExtractor={(item) => String(item.id)}
                style={styles.commentList}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {(item.userName || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.commentContent}>
                      <Text style={styles.commentUser}>{item.userName}</Text>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={styles.noComments}>No comments yet. Be the first!</Text>
                }
              />

              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor="#666"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.sendBtn, (!newComment.trim() || submittingComment) && styles.sendBtnDisabled]}
                  onPress={handleSubmitComment}
                  disabled={!newComment.trim() || submittingComment}
                >
                  <Text style={styles.sendText}>
                    {submittingComment ? '...' : '→'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Create Reel Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.createOverlay}>
          <View style={styles.createSheet}>
            <Text style={styles.createTitle}>Post Your Reel</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Describe your work..."
                placeholderTextColor="#666"
                value={createCaption}
                onChangeText={setCreateCaption}
                multiline
                maxLength={300}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {['general', 'plumbing', 'electrical', 'carpentry', 'painting', 'masonry', 'tailoring', 'other'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, createCategory === cat && styles.categoryChipActive]}
                    onPress={() => setCreateCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, createCategory === cat && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.createActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreateModal(false); setSelectedVideo(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postBtn, uploading && styles.postBtnDisabled]}
                onPress={handleCreateReel}
                disabled={uploading}
              >
                <Text style={styles.postBtnText}>
                  {uploading ? 'Uploading...' : 'Post Reel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: {
    color: '#000',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },

  // Reel Item
  reelContainer: {
    width: SCREEN_WIDTH,
    height: ITEM_HEIGHT,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: 'transparent',
    // Simulated gradient with overlapping views
  },

  // Side Actions
  sideActions: {
    position: 'absolute',
    right: 12,
    bottom: 160,
    alignItems: 'center',
    gap: 20,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a237e',
    borderWidth: 2,
    borderColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  actionIcon: {
    fontSize: 28,
  },
  likedIcon: {
    transform: [{ scale: 1.1 }],
  },
  actionCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Bottom Info
  bottomInfo: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 80,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  userRole: {
    color: '#FFC107',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  categoryTag: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    color: '#FFC107',
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },

  // Comment Modal
  commentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.6,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  commentHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  commentTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  commentList: {
    maxHeight: SCREEN_HEIGHT * 0.35,
    paddingHorizontal: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#283593',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  commentText: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 19,
  },
  noComments: {
    color: '#666',
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 80,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFC107',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },

  // Create Reel Modal
  createOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  createSheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  createTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  captionInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderColor: '#FFC107',
  },
  categoryChipText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  categoryChipTextActive: {
    color: '#FFC107',
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '600',
  },
  postBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFC107',
    alignItems: 'center',
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  postBtnText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
  },
});
