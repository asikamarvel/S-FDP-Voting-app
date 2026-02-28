'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { campaignApi, postApi, Campaign, Post } from '@/lib/api';

// Platform-specific chart configurations
const platformCharts = {
  twitter: {
    charts: [
      { key: 'likes', label: 'Likes', color: '#ec4899', bgClass: 'bg-pink-500' },
      { key: 'replies', label: 'Replies', color: '#3b82f6', bgClass: 'bg-blue-500' },
      { key: 'valid', label: 'Valid (Followers)', color: '#8b5cf6', bgClass: 'bg-purple-500' },
    ],
    tableHeaders: ['Likes', 'Replies', 'Valid (Followers)'],
  },
  youtube: {
    charts: [
      { key: 'views', label: 'Views', color: '#ef4444', bgClass: 'bg-red-500' },
      { key: 'likes', label: 'Likes', color: '#ec4899', bgClass: 'bg-pink-500' },
      { key: 'comments', label: 'Comments', color: '#3b82f6', bgClass: 'bg-blue-500' },
    ],
    tableHeaders: ['Views', 'Likes', 'Comments'],
  },
  instagram: {
    charts: [
      { key: 'likes', label: 'Likes', color: '#ec4899', bgClass: 'bg-pink-500' },
      { key: 'comments', label: 'Comments', color: '#3b82f6', bgClass: 'bg-blue-500' },
    ],
    tableHeaders: ['Likes', 'Comments'],
  },
  facebook: {
    charts: [
      { key: 'reactions', label: 'Reactions', color: '#ec4899', bgClass: 'bg-pink-500' },
      { key: 'comments', label: 'Comments', color: '#3b82f6', bgClass: 'bg-blue-500' },
      { key: 'shares', label: 'Shares', color: '#22c55e', bgClass: 'bg-green-500' },
    ],
    tableHeaders: ['Reactions', 'Comments', 'Shares'],
  },
};

export function PerformanceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaign');

  // Fetch campaigns
  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.list,
  });

  // Get selected campaign
  const selectedCampaign = campaignId
    ? campaignsData?.campaigns?.find(c => c.id === Number(campaignId))
    : campaignsData?.campaigns?.[0];

  const platform = selectedCampaign?.platform || 'twitter';
  const chartConfig = platformCharts[platform as keyof typeof platformCharts] || platformCharts.twitter;

  // Fetch posts for the campaign
  const { data: postsData, isLoading: loadingPosts } = useQuery({
    queryKey: ['posts', selectedCampaign?.id],
    queryFn: () => postApi.list(selectedCampaign?.id),
    enabled: !!selectedCampaign,
  });

  const posts = postsData?.posts || [];
  const isLoading = loadingCampaigns || loadingPosts;

  // Prepare chart data - truncate long post names
  const chartData = posts.map((post, index) => {
    const label = post.caption 
      ? (post.caption.length > 20 ? post.caption.substring(0, 20) + '...' : post.caption)
      : `Post ${index + 1}`;
    return {
      name: label,
      postId: post.platform_post_id,
      // Common metrics
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      // Twitter-specific
      replies: post.comments_count || 0,
      valid: post.valid_vote_count || 0,
      // YouTube-specific
      views: post.views_count || 0,
      // Facebook-specific
      reactions: post.likes_count || 0,
      shares: post.shares_count || 0,
    };
  });

  // Get value for a specific metric key from a post
  const getMetricValue = (post: Post, key: string): number => {
    switch (key) {
      case 'likes': return post.likes_count || 0;
      case 'comments': return post.comments_count || 0;
      case 'replies': return post.comments_count || 0;
      case 'valid': return post.valid_vote_count || 0;
      case 'views': return post.views_count || 0;
      case 'reactions': return post.likes_count || 0;
      case 'shares': return post.shares_count || 0;
      default: return 0;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: item.color }}>
              {item.name}: {item.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-primary-600" />
              <h1 className="text-lg font-bold text-gray-900">Performance Analytics</h1>
            </div>

            {/* Campaign Selector */}
            {campaignsData?.campaigns && campaignsData.campaigns.length > 1 && (
              <select
                value={selectedCampaign?.id || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  router.push(`/performance${id ? `?campaign=${id}` : ''}`);
                }}
                className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium"
              >
                {campaignsData.campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-gray-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl font-medium text-gray-600">No tracked posts yet</p>
            <p className="text-gray-400 mt-2">Add posts to your campaign to see performance metrics</p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Campaign Info */}
            {selectedCampaign && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedCampaign.name}</h2>
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span className="capitalize">{platform}</span>
                  <span>@{selectedCampaign.official_account_username || selectedCampaign.official_account_id}</span>
                  <span>{posts.length} posts tracked</span>
                  {platform === 'twitter' && (
                    <span>{selectedCampaign.follower_count.toLocaleString()} followers</span>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Charts based on platform */}
            {chartConfig.charts.map((chart) => (
              <div key={chart.key} className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <span className={`w-3 h-3 ${chart.bgClass} rounded-full`}></span>
                  {chart.label} Comparison
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        interval={0}
                        tick={{ fontSize: 12 }}
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey={chart.key} 
                        name={chart.label} 
                        fill={chart.color} 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}

            {/* Summary Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Summary Table</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Post</th>
                      {chartConfig.charts.map((chart) => (
                        <th key={chart.key} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {chart.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {posts.map((post, index) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {post.caption || `Post ${index + 1}`}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{post.platform_post_id}</div>
                        </td>
                        {chartConfig.charts.map((chart) => (
                          <td key={chart.key} className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm font-bold" style={{ color: chart.color }}>
                              {getMetricValue(post, chart.key).toLocaleString()}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                      {chartConfig.charts.map((chart) => (
                        <td key={chart.key} className="px-6 py-4 text-center">
                          <span className="text-sm font-bold" style={{ color: chart.color }}>
                            {posts.reduce((sum, p) => sum + getMetricValue(p, chart.key), 0).toLocaleString()}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
