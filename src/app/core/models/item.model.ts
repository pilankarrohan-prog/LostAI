export interface LostItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  color?: string;
  description: string;
  lostDate: string;
  lostLocation: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  reporterId: string;
  reporterName: string;
  reporterContact: string;
  status: 'active' | 'matched' | 'resolved' | 'spam';
  createdAt: string;
  tags?: string[];
}

export interface FoundItem {
  id: string;
  name: string;
  category: string;
  brand?: string;
  color?: string;
  description: string;
  foundDate: string;
  foundLocation: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  reporterId: string;
  reporterName: string;
  reporterContact: string;
  status: 'active' | 'matched' | 'resolved' | 'spam';
  createdAt: string;
  tags?: string[];
}

export interface LostFoundItem {
  id: string;
  type: 'lost' | 'found';
  name: string;
  category: string;
  brand?: string;
  color?: string;
  description: string;
  date: string;
  location: string;
  latitude?: number;
  longitude?: number;
  reporterId: string;
  reporterName: string;
  reporterContact: string;
  imageUrl?: string;
  tags?: string[];
  status: 'active' | 'matched' | 'resolved' | 'spam';
  createdAt: string;
  predicted_category?: string;
  predicted_color?: string;
  predicted_brand?: string;
  prediction_confidence?: number;
}

export interface MatchResult {
  id: string;
  lostItem: LostFoundItem;
  foundItem: LostFoundItem;
  matchPercentage: number;
  matchedFields: string[];
  status: 'pending' | 'claimed' | 'resolved';
  
  // Multimodal AI Match fields
  overallConfidence?: number;
  confidenceLevel?: string;
  explanation?: string;
  imageSimilarity?: number;
  textSimilarity?: number;
  locationSimilarity?: number;
  brandSimilarity?: number;
  colorSimilarity?: number;
}

export interface AdminActivityLog {
  id: string;
  action: string;
  details: string;
  target_id?: string;
  user_name: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match' | 'message' | 'system' | 'admin';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface Conversation {
  id: string;
  lostItemId: string;
  foundItemId: string;
  ownerUserId: string;
  finderUserId: string;
  matchId: string;
  createdAt: string;
  status: 'active' | 'closed';
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  message: string;
  messageType: 'text' | 'image' | 'system';
  isRead: boolean;
  timestamp: string;
}

export interface AISearchResultItem {
  item: LostFoundItem;
  relevanceScore: number;
  matchedKeywords: string[];
  matchExplanation: string;
}
