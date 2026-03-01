'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, BarChart3, Share2, Copy, Check, ExternalLink } from 'lucide-react';
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
import { campaignApi, postApi, Post } from '@/lib/api';
import { SFDPFooter } from './Footer';

// Platform-specific chart configurations
const platformCharts = {
  twitter: {
    metrics: [
      { key: 'likes', label: 'Likes', color: '#f472b6' },
      { key: 'replies', label: 'Replies', color: '#60a5fa' },
      { key: 'valid', label: 'Valid Followers', color: '#a78bfa' },
    ],
  },
  youtube: {
    metrics: [
      { key: 'views', label: 'Views', color: '#f87171' },
      { key: 'likes', label: 'Likes', color: '#f472b6' },
      { key: 'uniqueCommenters', label: 'Unique Commenters', color: '#60a5fa' },
    ],
  },
  instagram: {
    metrics: [
      { key: 'likes', label: 'Likes', color: '#f472b6' },
      { key: 'comments', label: 'Comments', color: '#60a5fa' },
    ],
  },
  facebook: {
    metrics: [
      { key: 'reactions', label: 'Reactions', color: '#f472b6' },
      { key: 'comments', label: 'Comments', color: '#60a5fa' },
      { key: 'shares', label: 'Shares', color: '#4ade80' },
    ],
  },
};

interface PerformanceDashboardProps {
  isPublic?: boolean;
  publicCampaignId?: number;
}

export function PerformanceDashboard({ isPublic = false, publicCampaignId }: PerformanceDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const campaignId = publicCampaignId || searchParams.get('campaign');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

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
      case 'uniqueCommenters': return post.engagement_count || 0;
      default: return 0;
    }
  };

  // Prepare combined chart data for grouped bar chart
  const combinedChartData = posts.map((post, index) => {
    const label = post.caption 
      ? (post.caption.length > 15 ? post.caption.substring(0, 15) + '...' : post.caption)
      : `Post ${index + 1}`;
    
    const data: Record<string, string | number> = { name: label, postId: post.platform_post_id };
    chartConfig.metrics.forEach(metric => {
      data[metric.key] = getMetricValue(post, metric.key);
    });
    return data;
  });

  // Prepare individual metric data for histogram charts
  const getMetricChartData = (metricKey: string) => {
    return posts.map((post, index) => ({
      name: post.caption 
        ? (post.caption.length > 12 ? post.caption.substring(0, 12) + '...' : post.caption)
        : `P${index + 1}`,
      value: getMetricValue(post, metricKey),
      postId: post.platform_post_id,
    }));
  };

  // Generate share URL
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/dashboard/public/${selectedCampaign?.id}`
    : '';

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3 py-2 text-sm">
          <p className="font-medium mb-1 text-gray-300">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
              <span className="text-gray-400">{item.name}:</span>
              <span className="font-bold">{item.value.toLocaleString()}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const SimpleTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white rounded-lg shadow-xl px-3 py-2 text-sm">
          <p className="font-medium">{label}</p>
          <p className="font-bold text-lg">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Premium Header */}
      <header className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left - Back/Logo */}
            {!isPublic ? (
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1.5">
                  <img 
                    src="/SFDP PNG 3.png" 
                    alt="SFDP Logo" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div>
                  <p className="text-primary-200 text-xs font-medium uppercase tracking-wider">SFDP</p>
                  <h1 className="text-lg font-bold text-white">Performance Analytics</h1>
                </div>
              </div>
            )}
            
            {/* Center - Title */}
            <div className="hidden sm:block text-center">
              <h1 className="text-lg font-semibold text-white">
                {selectedCampaign?.name || 'Performance Dashboard'}
              </h1>
              <p className="text-xs text-primary-200">Analytics & Insights</p>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2">
              {/* Campaign Selector */}
              {!isPublic && campaignsData?.campaigns && campaignsData.campaigns.length > 1 && (
                <select
                  value={selectedCampaign?.id || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    router.push(`/performance${id ? `?campaign=${id}` : ''}`);
                  }}
                  className="px-3 py-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-sm text-white"
                >
                  {campaignsData.campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id} className="text-gray-900">
                      {campaign.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Share Button */}
              {!isPublic && selectedCampaign && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-600">No tracked posts yet</p>
            <p className="text-gray-400 text-sm mt-1">Add posts to see performance metrics</p>
            {!isPublic && (
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Campaign Header Card */}
            {selectedCampaign && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedCampaign.name}</h2>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <span className="capitalize px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full font-medium">{platform}</span>
                      <span className="flex items-center gap-1">
                        <span className="text-gray-400">@</span>
                        {selectedCampaign.official_account_username || selectedCampaign.official_account_id}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5" />
                        {posts.length} posts
                      </span>
                      {platform === 'twitter' && (
                        <span>{selectedCampaign.follower_count.toLocaleString()} followers</span>
                      )}
                    </div>
                  </div>
                  {/* Summary Stats */}
                  <div className="flex gap-4">
                    {chartConfig.metrics.map((metric) => (
                      <div key={metric.key} className="text-center">
                        <p className="text-xl font-bold" style={{ color: metric.color }}>
                          {posts.reduce((sum, p) => sum + getMetricValue(p, metric.key), 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Three Histogram Charts in a Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {chartConfig.metrics.map((metric) => {
                const data = getMetricChartData(metric.key);
                return (
                  <div key={metric.key} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: metric.color }}></span>
                      <h3 className="text-sm font-semibold text-gray-700">{metric.label}</h3>
                    </div>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 30 }}>
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            interval={0}
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={false}
                          />
                          <YAxis 
                            tick={{ fontSize: 9, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            width={35}
                          />
                          <Tooltip content={<SimpleTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                          <Bar 
                            dataKey="value" 
                            fill={metric.color}
                            radius={[2, 2, 0, 0]}
                            barSize={posts.length > 10 ? undefined : 24}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Combined Comparison Chart */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">All Metrics Comparison</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={combinedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      interval={0}
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                      width={45}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      iconType="square"
                      iconSize={10}
                    />
                    {chartConfig.metrics.map((metric) => (
                      <Bar 
                        key={metric.key}
                        dataKey={metric.key} 
                        name={metric.label} 
                        fill={metric.color}
                        radius={[2, 2, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Compact Summary Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">Detailed Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Post</th>
                      {chartConfig.metrics.map((metric) => (
                        <th key={metric.key} className="px-4 py-2 text-right text-xs font-medium uppercase" style={{ color: metric.color }}>
                          {metric.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {posts.map((post, index) => (
                      <tr key={post.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-900 truncate max-w-[200px]">
                            {post.caption || `Post ${index + 1}`}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">{post.platform_post_id}</div>
                        </td>
                        {chartConfig.metrics.map((metric) => (
                          <td key={metric.key} className="px-4 py-2.5 text-right font-semibold" style={{ color: metric.color }}>
                            {getMetricValue(post, metric.key).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-2.5 font-bold text-gray-900">Total</td>
                      {chartConfig.metrics.map((metric) => (
                        <td key={metric.key} className="px-4 py-2.5 text-right font-bold" style={{ color: metric.color }}>
                          {posts.reduce((sum, p) => sum + getMetricValue(p, metric.key), 0).toLocaleString()}
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

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Share Dashboard</h3>
            <p className="text-sm text-gray-500 mb-4">
              Anyone with this link can view this dashboard without logging in.
            </p>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 font-mono"
              />
              <button
                onClick={copyShareLink}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex items-center gap-2 p-3 bg-primary-50 rounded-lg mb-4">
              <ExternalLink className="w-4 h-4 text-primary-600" />
              <p className="text-sm text-primary-700">
                This link is view-only. Viewers cannot make changes.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!isPublic && <SFDPFooter />}
    </div>
  );
}
