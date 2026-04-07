import api from './api';

export interface Reel {
  id: number;
  userId: number;
  userRole: string;
  userName: string;
  userAvatar: string | null;
  videoUrl: string;
  caption: string;
  category: string;
  likes: number[];
  comments: ReelComment[];
  views: number;
  status: string;
  createdAt: string;
}

export interface ReelComment {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: string;
}

export const reelService = {
  async getFeed(page = 1, category = 'all') {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');
    if (category !== 'all') params.set('category', category);
    const res = await api.get(`/reels/feed?${params.toString()}`);
    return res.data;
  },

  async getReel(id: number) {
    const res = await api.get(`/reels/${id}`);
    return res.data;
  },

  async createReel(videoUri: string, caption: string, category: string) {
    const formData = new FormData();
    const filename = videoUri.split('/').pop() || 'reel.mp4';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `video/${match[1]}` : 'video/mp4';

    formData.append('video', {
      uri: videoUri,
      name: filename,
      type,
    } as any);
    formData.append('caption', caption);
    formData.append('category', category);

    const res = await api.post('/reels/create', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async toggleLike(id: number) {
    const res = await api.post(`/reels/${id}/like`);
    return res.data;
  },

  async addComment(id: number, text: string) {
    const res = await api.post(`/reels/${id}/comment`, { text });
    return res.data;
  },

  async deleteReel(id: number) {
    const res = await api.delete(`/reels/${id}`);
    return res.data;
  },

  async getMyReels() {
    const res = await api.get('/reels/user/my-reels');
    return res.data;
  },
};
