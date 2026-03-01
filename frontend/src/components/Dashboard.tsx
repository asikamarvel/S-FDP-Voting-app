'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  ExternalLink,
  Users,
  MessageSquare,
  TrendingUp,
  Loader2,
  LogOut,
  BarChart3,
} from 'lucide-react';
import {
  campaignApi,
  postApi,
  platformApi,
  validationApi,
  Campaign,
  Post,
} from '@/lib/api';
import { CampaignForm } from './CampaignForm';
import { PostForm } from './PostForm';
import { useAuth } from '@/lib/auth';
import { SFDPFooter } from './Footer';

// Platform configuration
type PlatformKey = 'twitter' | 'youtube' | 'instagram' | 'facebook';

const platforms: { key: PlatformKey; name: string; icon: string; color: string; bgColor: string; engagementLabel: string; supportsValidation: boolean }[] = [
  // X/Twitter: only retweets are tracked/validated
  { key: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'text-black', bgColor: 'bg-black', engagementLabel: 'Retweets', supportsValidation: true },
  { key: 'youtube', name: 'YouTube', icon: '▶', color: 'text-red-600', bgColor: 'bg-red-600', engagementLabel: 'Comments', supportsValidation: false },
  { key: 'instagram', name: 'Instagram', icon: '📷', color: 'text-pink-600', bgColor: 'bg-gradient-to-r from-purple-500 to-pink-500', engagementLabel: 'Comments', supportsValidation: false },
  { key: 'facebook', name: 'Facebook', icon: 'f', color: 'text-blue-600', bgColor: 'bg-blue-600', engagementLabel: 'Comments', supportsValidation: false },
];

export function Dashboard() {
  const { logout } = useAuth();
  const router = useRouter();
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('twitter');
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncingPosts, setSyncingPosts] = useState<Set<number>>(new Set());
  const [validatingPosts, setValidatingPosts] = useState<Set<number>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);
  
  const queryClient = useQueryClient();
  // Smooth refresh - keeps existing data visible while fetching in background
  const forceRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  };

  // Get platform config
  const currentPlatform = platforms.find(p => p.key === activePlatform)!;

  // Fetch campaigns for current platform
  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.list,
    placeholderData: (prev) => prev, // Keep showing old data while refetching
  });

  // Filter campaigns for active platform
  const platformCampaigns = campaignsData?.campaigns?.filter(c => c.platform === activePlatform) || [];
  const activeCampaign = selectedCampaign && selectedCampaign.platform === activePlatform 
    ? platformCampaigns.find(c => c.id === selectedCampaign.id) 
    : platformCampaigns[0];

  // Update selected campaign when platform changes
  useEffect(() => {
    if (platformCampaigns.length > 0 && (!selectedCampaign || selectedCampaign.platform !== activePlatform)) {
      setSelectedCampaign(platformCampaigns[0]);
    }
  }, [activePlatform, platformCampaigns.length]);

  // Fetch posts for active campaign
  const { data: postsData, isLoading: loadingPosts } = useQuery({
    queryKey: ['posts', activeCampaign?.id],
    queryFn: () => postApi.list(activeCampaign?.id),
    enabled: !!activeCampaign,
    placeholderData: (prev) => prev, // Keep showing old data while refetching
  });

  // Sort posts by ID to keep consistent order
  const posts = [...(postsData?.posts || [])].sort((a, b) => a.id - b.id);

  // Sync single post
  const syncPostMutation = useMutation({
    mutationFn: async (postId: number) => {
      setSyncingPosts(prev => new Set(prev).add(postId));
      return platformApi.syncEngagements(activePlatform, postId);
    },
    onSuccess: (data) => {
      forceRefresh();
      setStatusMessage({ type: 'success', text: data.message });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error: any) => {
      setStatusMessage({ type: 'error', text: error.response?.data?.detail || 'Sync failed' });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onSettled: (_, __, postId) => {
      setSyncingPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    },
  });

  // Validate single post
  const validatePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      setValidatingPosts(prev => new Set(prev).add(postId));
      return validationApi.validatePost(postId);
    },
    onSuccess: (data) => {
      forceRefresh();
      setStatusMessage({ type: 'success', text: `Validated: ${data.valid_votes} valid, ${data.invalid_votes} invalid` });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error: any) => {
      setStatusMessage({ type: 'error', text: error.response?.data?.detail || 'Validation failed' });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onSettled: (_, __, postId) => {
      setValidatingPosts(prev => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    },
  });

  // Sync followers for campaign
  const syncFollowersMutation = useMutation({
    mutationFn: () => platformApi.syncFollowers(activePlatform, activeCampaign!.id),
    onSuccess: (data) => {
      forceRefresh();
      setStatusMessage({ type: 'success', text: data.message });
      setTimeout(() => setStatusMessage(null), 3000);
    },
    onError: (error: any) => {
      setStatusMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to sync followers' });
      setTimeout(() => setStatusMessage(null), 3000);
    },
  });

  // Sync all posts
  const syncAllPosts = async () => {
    setSyncingAll(true);
    try {
      for (const post of posts) {
        setSyncingPosts(prev => new Set(prev).add(post.id));
        try {
          await platformApi.syncEngagements(activePlatform, post.id);
        } catch (e) {
          console.error(`Failed to sync post ${post.id}`, e);
        }
        setSyncingPosts(prev => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
      forceRefresh();
      setStatusMessage({ type: 'success', text: `Synced all ${posts.length} posts` });
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setSyncingAll(false);
    }
  };

  // Validate all posts (full workflow: sync followers -> sync posts -> validate)
  const validateAllPosts = async () => {
    if (!activeCampaign) return;
    setValidatingAll(true);
    try {
      // Step 1: Sync followers
      setStatusMessage({ type: 'success', text: 'Step 1/3: Syncing followers...' });
      try {
        await platformApi.syncFollowers(activePlatform, activeCampaign.id);
      } catch (e) {
        console.error('Failed to sync followers', e);
      }
      forceRefresh();

      // Step 2: Sync all posts
      setStatusMessage({ type: 'success', text: 'Step 2/3: Syncing all posts...' });
      for (const post of posts) {
        setSyncingPosts(prev => new Set(prev).add(post.id));
        try {
          await platformApi.syncEngagements(activePlatform, post.id);
        } catch (e) {
          console.error(`Failed to sync post ${post.id}`, e);
        }
        setSyncingPosts(prev => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
      forceRefresh();

      // Step 3: Validate all posts
      setStatusMessage({ type: 'success', text: 'Step 3/3: Validating all posts...' });
      for (const post of posts) {
        setValidatingPosts(prev => new Set(prev).add(post.id));
        try {
          await validationApi.validatePost(post.id);
        } catch (e) {
          console.error(`Failed to validate post ${post.id}`, e);
        }
        setValidatingPosts(prev => {
          const next = new Set(prev);
          next.delete(post.id);
          return next;
        });
      }
      forceRefresh();
      setStatusMessage({ type: 'success', text: `✓ Complete! Synced followers, ${posts.length} posts, and validated all` });
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setValidatingAll(false);
    }
  };

  // Delete post
  const deletePostMutation = useMutation({
    mutationFn: postApi.delete,
    onSuccess: () => forceRefresh(),
  });

  // Delete campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: campaignApi.delete,
    onSuccess: () => {
      setSelectedCampaign(null);
      forceRefresh();
    },
  });

  const isSyncing = syncingPosts.size > 0 || syncFollowersMutation.isPending || syncingAll;
  const isValidating = validatingPosts.size > 0 || validatingAll;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">SocialVote</h1>
                <p className="text-xs text-gray-500">by SFDP</p>
              </div>
            </div>
            
            {/* Status Message */}
            {statusMessage && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                statusMessage.type === 'success' 
                  ? 'bg-primary-50 text-primary-700 border border-primary-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {statusMessage.text}
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              {activeCampaign && (
                <span className="text-sm text-gray-500">
                  {activeCampaign.follower_count.toLocaleString()} followers
                </span>
              )}
              <button
                onClick={logout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Platform Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {platforms.map((platform) => {
            const campaignCount = campaignsData?.campaigns?.filter(c => c.platform === platform.key).length || 0;
            return (
              <button
                key={platform.key}
                onClick={() => setActivePlatform(platform.key)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  activePlatform === platform.key
                    ? `${platform.bgColor} text-white shadow-lg scale-105`
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span className="text-xl">{platform.icon}</span>
                <span>{platform.name}</span>
                {campaignCount > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    activePlatform === platform.key ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    {campaignCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Platform Dashboard */}
        <div className="space-y-6">
          {/* Campaign Selector & Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Campaign Selection */}
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Campaign</label>
                  {platformCampaigns.length > 0 ? (
                    <select
                      value={activeCampaign?.id || ''}
                      onChange={(e) => {
                        const campaign = platformCampaigns.find(c => c.id === Number(e.target.value));
                        setSelectedCampaign(campaign || null);
                      }}
                      className="block w-64 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {platformCampaigns.map((campaign) => (
                        <option key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-500 text-sm">No campaigns for {currentPlatform.name}</p>
                  )}
                </div>
                
                <button
                  onClick={() => setShowCampaignForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  New Campaign
                </button>
              </div>

              {/* Global Actions */}
              {activeCampaign && posts.length > 0 && (
                <div className="flex items-center gap-3">
                  {currentPlatform.supportsValidation && (
                    <button
                      onClick={() => syncFollowersMutation.mutate()}
                      disabled={syncFollowersMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50"
                    >
                      {syncFollowersMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                      Sync Followers
                    </button>
                  )}
                  
                  <button
                    onClick={syncAllPosts}
                    disabled={isSyncing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {syncingAll ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Sync All Posts
                  </button>

                  {currentPlatform.supportsValidation && (
                    <button
                      onClick={validateAllPosts}
                      disabled={isValidating}
                      className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50"
                    >
                      {validatingAll ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Validate All
                    </button>
                  )}

                  <button
                    onClick={() => router.push(`/performance?campaign=${activeCampaign.id}`)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
                  >
                    <BarChart3 className="w-4 h-4" />
                    See Performance
                  </button>
                </div>
              )}
            </div>

            {/* Campaign Info */}
            {activeCampaign && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>@{activeCampaign.official_account_username || activeCampaign.official_account_id}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {activeCampaign.follower_count.toLocaleString()} followers
                  </span>
                  <span>{activeCampaign.post_count} posts tracked</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this campaign and all its data?')) {
                      deleteCampaignMutation.mutate(activeCampaign.id);
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete Campaign
                </button>
              </div>
            )}
          </div>

          {/* Platform-specific Notice */}
          {!currentPlatform.supportsValidation && activeCampaign && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 font-medium">⚠️ {currentPlatform.name} Limitation</p>
              <p className="text-amber-600 text-sm mt-1">
                {currentPlatform.name} API does not expose subscriber/follower lists. 
                All {currentPlatform.engagementLabel.toLowerCase()} are counted as votes without validation.
              </p>
            </div>
          )}

          {/* Add Post Button */}
          {activeCampaign && (
            <button
              onClick={() => setShowPostForm(true)}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors group"
            >
              <Plus className="w-8 h-8 mx-auto text-gray-400 group-hover:text-primary-500" />
              <p className="mt-2 text-gray-600 font-medium group-hover:text-primary-600">
                Add Post to Track
              </p>
              <p className="text-sm text-gray-400">
                Track {currentPlatform.engagementLabel.toLowerCase()} on a new post
              </p>
            </button>
          )}

          {/* Posts Grid */}
          {loadingPosts ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : posts.length === 0 && activeCampaign ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="font-medium">No posts tracked yet</p>
              <p className="text-sm">Add a post to start tracking {currentPlatform.engagementLabel.toLowerCase()}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  platform={currentPlatform}
                  isSyncing={syncingPosts.has(post.id)}
                  isValidating={validatingPosts.has(post.id)}
                  onSync={() => syncPostMutation.mutate(post.id)}
                  onValidate={() => validatePostMutation.mutate(post.id)}
                  onDelete={() => {
                    if (confirm('Delete this post?')) {
                      deletePostMutation.mutate(post.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Form Modal */}
      {showCampaignForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <CampaignForm
              defaultPlatform={activePlatform}
              onClose={() => setShowCampaignForm(false)}
              onSuccess={() => {
                setShowCampaignForm(false);
                forceRefresh();
              }}
            />
          </div>
        </div>
      )}

      {/* Post Form Modal */}
      {showPostForm && activeCampaign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <PostForm
              campaignId={activeCampaign.id}
              platform={activePlatform}
              onClose={() => setShowPostForm(false)}
              onSuccess={() => {
                setShowPostForm(false);
                forceRefresh();
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <SFDPFooter />
    </div>
  );
}

// Post Card Component
function PostCard({
  post,
  platform,
  isSyncing,
  isValidating,
  onSync,
  onValidate,
  onDelete,
}: {
  post: Post;
  platform: typeof platforms[0];
  isSyncing: boolean;
  isValidating: boolean;
  onSync: () => void;
  onValidate: () => void;
  onDelete: () => void;
}) {
  // Invalid = Tracked - Valid, so totalVotes = engagement_count
  const totalVotes = post.engagement_count;
  const validationRate = totalVotes > 0 ? ((post.valid_vote_count / totalVotes) * 100).toFixed(1) : '—';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Post Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {post.caption || `Post ${post.platform_post_id}`}
            </p>
            <p className="text-xs text-gray-400 mt-1 font-mono">{post.platform_post_id}</p>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4">
        {/* Twitter: show all 3 API metrics */}
        {platform.key === 'twitter' && (
          <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
            <div className="text-center p-2 bg-pink-50 rounded-lg">
              <p className="text-lg font-bold text-pink-600">{post.likes_count || 0}</p>
              <p className="text-xs text-pink-600/70">Likes</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{post.shares_count || 0}</p>
              <p className="text-xs text-green-600/70">Retweets</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{post.comments_count || 0}</p>
              <p className="text-xs text-blue-600/70">Replies</p>
            </div>
          </div>
        )}

        {/* YouTube: Show Views, Likes, Comments */}
        {platform.key === 'youtube' && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-lg font-bold text-gray-600">{(post.views_count || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-600/70">Views</p>
            </div>
            <div className="text-center p-2 bg-pink-50 rounded-lg">
              <p className="text-lg font-bold text-pink-600">{post.likes_count || 0}</p>
              <p className="text-xs text-pink-600/70">Likes</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{post.comments_count || 0}</p>
              <p className="text-xs text-blue-600/70">Comments</p>
            </div>
          </div>
        )}

        {/* Instagram: Show Likes, Comments */}
        {platform.key === 'instagram' && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-2 bg-pink-50 rounded-lg">
              <p className="text-xl font-bold text-pink-600">{post.likes_count || 0}</p>
              <p className="text-xs text-pink-600/70">Likes</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{post.comments_count || 0}</p>
              <p className="text-xs text-blue-600/70">Comments</p>
            </div>
          </div>
        )}

        {/* Facebook: Show Reactions, Comments, Shares */}
        {platform.key === 'facebook' && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center p-2 bg-pink-50 rounded-lg">
              <p className="text-lg font-bold text-pink-600">{post.likes_count || 0}</p>
              <p className="text-xs text-pink-600/70">Reactions</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-600">{post.comments_count || 0}</p>
              <p className="text-xs text-blue-600/70">Comments</p>
            </div>
            <div className="text-center p-2 bg-green-50 rounded-lg">
              <p className="text-lg font-bold text-green-600">{post.shares_count || 0}</p>
              <p className="text-xs text-green-600/70">Shares</p>
            </div>
          </div>
        )}

        {/* Validation: retweeters checked against follower list */}
        {platform.supportsValidation && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{post.engagement_count}</p>
              <p className="text-xs text-blue-600/70">Retweeters Tracked</p>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">{post.valid_vote_count}</p>
              <p className="text-xs text-primary-600/70">Valid (Followers)</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{post.engagement_count - post.valid_vote_count}</p>
              <p className="text-xs text-red-600/70">Invalid (Non-Followers)</p>
            </div>
          </div>
        )}

        {/* Tracked Engagers (for non-validation platforms and YouTube) */}
        {(!platform.supportsValidation || platform.key === 'youtube') && post.engagement_count > 0 && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Tracked Users:</span>
            <span className="font-bold text-primary-600">{post.engagement_count}</span>
            <span className="text-xs text-gray-400">
              {platform.key === 'youtube' ? '(commenters)' : '(visible to API)'}
            </span>
          </div>
        )}

        {/* Validation Rate */}
        {platform.supportsValidation && totalVotes > 0 && (
          <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">Validation Rate:</span>
            <span className="font-bold text-primary-600">{validationRate}%</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sync
          </button>
          {platform.supportsValidation && (
            <button
              onClick={onValidate}
              disabled={isValidating}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {isValidating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Validate
            </button>
          )}
        </div>
      </div>

      {/* Last Synced */}
      {post.last_synced_at && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Last synced: {new Date(post.last_synced_at).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}
