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
      likes: post.likes_count || 0,
      replies: post.comments_count || 0,
      valid: post.valid_vote_count || 0,
    };
  });

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
                  <span>@{selectedCampaign.official_account_username || selectedCampaign.official_account_id}</span>
                  <span>{posts.length} posts tracked</span>
                  <span>{selectedCampaign.follower_count.toLocaleString()} followers</span>
                </div>
              </div>
            )}

            {/* Likes Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 bg-pink-500 rounded-full"></span>
                Likes Comparison
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
                      dataKey="likes" 
                      name="Likes" 
                      fill="#ec4899" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Replies Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                Replies Comparison
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
                      dataKey="replies" 
                      name="Replies" 
                      fill="#3b82f6" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Valid (Followers) Chart */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-3 h-3 bg-primary-500 rounded-full"></span>
                Valid Votes (Followers) Comparison
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
                      dataKey="valid" 
                      name="Valid (Followers)" 
                      fill="#8b5cf6" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

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
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Likes</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Replies</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Valid (Followers)</th>
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
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-pink-600">{(post.likes_count || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-blue-600">{(post.comments_count || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-primary-600">{(post.valid_vote_count || 0).toLocaleString()}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">Total</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-pink-600">
                          {posts.reduce((sum, p) => sum + (p.likes_count || 0), 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-blue-600">
                          {posts.reduce((sum, p) => sum + (p.comments_count || 0), 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-bold text-primary-600">
                          {posts.reduce((sum, p) => sum + (p.valid_vote_count || 0), 0).toLocaleString()}
                        </span>
                      </td>
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
