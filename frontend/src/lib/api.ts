import axios from 'axios';

// Always point production builds to the live API to avoid bad env vars in Vercel
const DEFAULT_API_URL = 'https://s-fdp-voting-app-production.up.railway.app';
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? DEFAULT_API_URL
  : process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Campaign {
  id: number;
  name: string;
  platform: 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'facebook';
  official_account_id: string;
  official_account_username?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  post_count: number;
  follower_count: number;
}

export interface Post {
  id: number;
  platform_post_id: string;
  campaign_id: number;
  post_url?: string;
  caption?: string;
  created_at: string;
  last_synced_at?: string;
  engagement_count: number;
  valid_vote_count: number;
  invalid_vote_count: number;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
}

export interface Vote {
  id: number;
  platform_user_id: string;
  username?: string;
  post_id: number;
  engagement_type: 'like' | 'comment';
  is_valid: boolean;
  reason?: string;
  validated_at: string;
}

export interface ValidationResult {
  post_id: number;
  total_engagements: number;
  valid_votes: number;
  invalid_votes: number;
  validation_rate: number;
  votes: Vote[];
}

export interface ValidationSummary {
  campaign_id: number;
  campaign_name: string;
  platform: string;
  total_posts: number;
  total_engagements: number;
  total_valid_votes: number;
  total_invalid_votes: number;
  overall_validation_rate: number;
}

// API Functions
export const campaignApi = {
  list: async (): Promise<{ campaigns: Campaign[]; total: number }> => {
    const response = await api.get('/campaigns/');
    return response.data;
  },
  
  get: async (id: number): Promise<Campaign> => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data;
  },
  
  create: async (data: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'post_count' | 'follower_count'>): Promise<Campaign> => {
    const response = await api.post('/campaigns/', data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/campaigns/${id}`);
  },
  
  update: async (id: number, data: Partial<Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'post_count' | 'follower_count'>>): Promise<Campaign> => {
    const response = await api.put(`/campaigns/${id}`, data);
    return response.data;
  },
};

export const postApi = {
  list: async (campaignId?: number): Promise<{ posts: Post[]; total: number }> => {
    const params = campaignId ? { campaign_id: campaignId } : {};
    const response = await api.get('/posts/', { params });
    return response.data;
  },
  
  get: async (id: number): Promise<Post> => {
    const response = await api.get(`/posts/${id}`);
    return response.data;
  },
  
  create: async (data: { platform_post_id: string; campaign_id: number; post_url?: string; caption?: string }): Promise<Post> => {
    const response = await api.post('/posts/', data);
    return response.data;
  },
  
  delete: async (id: number): Promise<void> => {
    await api.delete(`/posts/${id}`);
  },
};

export const platformApi = {
  syncFollowers: async (platform: string, campaignId: number): Promise<{ message: string; status: string }> => {
    const response = await api.get(`/platforms/${platform}/sync-followers/${campaignId}`);
    return response.data;
  },
  
  syncEngagements: async (platform: string, postId: number): Promise<{ message: string; status: string }> => {
    const response = await api.get(`/platforms/${platform}/sync-engagements/${postId}`);
    return response.data;
  },
  
  syncAll: async (platform: string, campaignId: number): Promise<{ message: string; status: string }> => {
    const response = await api.get(`/platforms/${platform}/sync-all/${campaignId}`);
    return response.data;
  },
};

export const validationApi = {
  validatePost: async (postId: number): Promise<ValidationResult> => {
    const response = await api.post(`/validate/votes/${postId}`);
    return response.data;
  },
  
  validateCampaign: async (campaignId: number): Promise<any> => {
    const response = await api.post(`/validate/campaign/${campaignId}`);
    return response.data;
  },
  
  getResults: async (postId: number, validOnly?: boolean): Promise<Vote[]> => {
    const params = validOnly !== undefined ? { valid_only: validOnly } : {};
    const response = await api.get(`/validate/results/${postId}`, { params });
    return response.data;
  },
  
  getSummary: async (campaignId: number): Promise<ValidationSummary> => {
    const response = await api.get(`/validate/summary/${campaignId}`);
    return response.data;
  },
};

export const exportApi = {
  downloadCsv: async (campaignId: number, postIds?: number[], includeInvalid: boolean = true): Promise<Blob> => {
    const params = new URLSearchParams();
    if (postIds) {
      params.append('post_ids', postIds.join(','));
    }
    params.append('include_invalid', includeInvalid.toString());
    
    const response = await api.get(`/export/csv/${campaignId}?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};
