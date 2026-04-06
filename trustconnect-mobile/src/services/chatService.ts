import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface Conversation {
  id: number;
  customerId: number;
  artisanUserId: number;
  bookingId?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  customerUnread: number;
  artisanUnread: number;
  customerName: string;
  customerAvatar: string | null;
  artisanName: string;
  artisanAvatar: string | null;
  artisanTrade: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderRole: 'customer' | 'artisan' | 'system' | 'ai';
  type: 'text' | 'image' | 'system' | 'quote' | 'work_proof' | 'escrow_status' | 'milestone' | 'ai_voice_note';
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  quoteId?: number;
  workProofPhotos?: string[]; // 3 proof photos when type === 'work_proof'
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
  senderName?: string;
}

/**
 * Get or create a conversation between customer and artisan
 */
export const getOrCreateConversation = async (
  customerId: number | string,
  artisanUserId: number | string,
  bookingId?: number | string
): Promise<{ conversation: Conversation }> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat/conversation`, {
      customerId,
      artisanUserId,
      bookingId,
    }, { timeout: 10000 });
    return response.data;
  } catch (error: any) {
    console.error('Get/create conversation error:', error.message);
    throw error;
  }
};

/**
 * Get all conversations for a user
 */
export const getConversations = async (
  userId: number | string,
  role: 'customer' | 'artisan' = 'customer'
): Promise<Conversation[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/conversations/${userId}`, {
      params: { role },
      timeout: 10000,
    });
    return response.data.conversations || [];
  } catch (error: any) {
    console.error('Get conversations error:', error.message);
    return [];
  }
};

/**
 * Send a message
 */
export const sendMessage = async (
  conversationId: number,
  senderId: number,
  senderRole: 'customer' | 'artisan',
  content: string,
  type: 'text' | 'image' = 'text',
  imageUrl?: string
): Promise<ChatMessage> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat/send`, {
      conversationId,
      senderId,
      senderRole,
      type,
      content,
      imageUrl,
    }, { timeout: 10000 });
    return response.data.message;
  } catch (error: any) {
    console.error('Send message error:', error.message);
    throw error;
  }
};

/**
 * Get messages for a conversation (with pagination)
 */
export const getMessages = async (
  conversationId: number,
  before?: string,
  limit: number = 50
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> => {
  try {
    const params: any = { limit };
    if (before) params.before = before;

    const response = await axios.get(`${API_BASE_URL}/chat/messages/${conversationId}`, {
      params,
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error('Get messages error:', error.message);
    return { messages: [], hasMore: false };
  }
};

/**
 * Mark messages as read
 */
export const markAsRead = async (
  conversationId: number,
  userId: number,
  userRole: 'customer' | 'artisan'
): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/chat/messages/${conversationId}/read`, {
      userId,
      userRole,
    }, { timeout: 10000 });
  } catch (error: any) {
    console.error('Mark as read error:', error.message);
  }
};

/**
 * Upload a chat image
 */
export const uploadChatImage = async (imageUri: string): Promise<string> => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'chat-image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('image', {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await axios.post(`${API_BASE_URL}/chat/upload-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });

    return response.data.imageUrl;
  } catch (error: any) {
    console.error('Upload chat image error:', error.message);
    throw error;
  }
};

/**
 * Submit 3 work-proof photos → transitions booking to job-done
 */
export const submitWorkProof = async (
  bookingId: number | string,
  artisanUserId: number | string,
  photos: string[]
): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/booking/${bookingId}/submit-work-proof`, {
      artisanUserId,
      photos,
    }, { timeout: 30000 });
  } catch (error: any) {
    console.error('Submit work proof error:', error.message);
    throw error;
  }
};

/**
 * Fetch booking details for use inside the chat screen
 */
export const getBookingForChat = async (
  bookingId: number | string
): Promise<{
  id: number;
  status: string;
  escrowAmount?: number;
  customerId: number;
  artisanUserId: number;
  workProofPhotos?: string[];
} | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/booking/${bookingId}`, { timeout: 10000 });
    return response.data.booking || response.data || null;
  } catch (error: any) {
    console.error('Get booking for chat error:', error.message);
    return null;
  }
};

export default {
  getOrCreateConversation,
  getConversations,
  sendMessage,
  getMessages,
  markAsRead,
  uploadChatImage,
  submitWorkProof,
  getBookingForChat,
};
