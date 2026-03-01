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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { campaignApi, postApi, Post } from '@/lib/api';
import { SFDPFooter } from './Footer';

// SFDP Brand Colors
const CHART_COLORS = ['#171c2e', '#3d4a7a', '#6b7db3', '#d97706', '#f59e0b', '#252e54'];

// Platform configurations - Only X and YouTube
type PlatformKey = 'twitter' | 'youtube';

const platformConfigs: Record<PlatformKey, { name: string; icon: string; bgColor: string; metrics: { key: string; label: string; color: string }[] }> = {
  twitter: {
    name: 'X (Twitter)',
    icon: '𝕏',
    bgColor: 'bg-black',
    metrics: [
      { key: 'likes', label: 'Likes', color: '#171c2e' },
      { key: 'comments', label: 'Comments', color: '#3d4a7a' },
      { key: 'valid', label: 'Valid Retweets', color: '#d97706' },
    ],
  },
  youtube: {
    name: 'YouTube',
    icon: '▶',
    bgColor: 'bg-red-600',
    metrics: [
      { key: 'likes', label: 'Likes', color: '#171c2e' },
      { key: 'uniqueCommenters', label: 'Unique Comments', color: '#d97706' },
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
  const [activePlatform, setActivePlatform] = useState<PlatformKey>('twitter');

  // Fetch campaigns
  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.list,
  });

  // Get campaigns for each platform
  const twitterCampaign = campaignsData?.campaigns?.find(c => c.platform === 'twitter');
  const youtubeCampaign = campaignsData?.campaigns?.find(c => c.platform === 'youtube');

  // Select campaign based on active platform
  const selectedCampaign = activePlatform === 'twitter' ? twitterCampaign : youtubeCampaign;
  const platformConfig = platformConfigs[activePlatform];

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
      case 'valid': return post.valid_vote_count || 0;
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
    platformConfig.metrics.forEach(metric => {
      data[metric.key] = getMetricValue(post, metric.key);
    });
    return data;
  });

  // Prepare individual metric data for histogram charts
  const getHistogramData = (metricKey: string) => {
    return posts.map((post, index) => ({
      name: post.caption 
        ? (post.caption.length > 12 ? post.caption.substring(0, 12) + '…' : post.caption)
        : `Post ${index + 1}`,
      value: getMetricValue(post, metricKey),
      fullName: post.caption || `Post ${index + 1}`,
    }));
  };

  // Prepare pie chart data - distribution among posts
  const getPieData = () => {
    return posts.map((post, index) => {
      const total = platformConfig.metrics.reduce((sum, m) => sum + getMetricValue(post, m.key), 0);
      return {
        name: post.caption 
          ? (post.caption.length > 15 ? post.caption.substring(0, 15) + '…' : post.caption)
          : `Post ${index + 1}`,
        value: total,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
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

  const HistogramTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur text-white rounded-lg shadow-2xl px-4 py-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">{payload[0]?.payload?.fullName || label}</p>
          <p className="font-bold text-xl">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const total = posts.reduce((sum, p) => sum + platformConfig.metrics.reduce((s, m) => s + getMetricValue(p, m.key), 0), 0);
      return (
        <div className="bg-gray-900/95 backdrop-blur text-white rounded-lg shadow-2xl px-4 py-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">{payload[0].name}</p>
          <p className="font-bold text-xl">{payload[0].value.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{((payload[0].value / total) * 100).toFixed(1)}%</p>
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
        {/* Platform Toggle Buttons */}
        <div className="flex justify-center gap-3 mb-6">
          {(Object.keys(platformConfigs) as PlatformKey[]).map((platform) => {
            const config = platformConfigs[platform];
            const hasCampaign = platform === 'twitter' ? !!twitterCampaign : !!youtubeCampaign;
            return (
              <button
                key={platform}
                onClick={() => setActivePlatform(platform)}
                disabled={!hasCampaign}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                  activePlatform === platform
                    ? `${config.bgColor} text-white shadow-lg scale-105`
                    : hasCampaign
                      ? 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                }`}
              >
                <span className="text-xl">{config.icon}</span>
                <span>{config.name}</span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : !selectedCampaign ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-lg font-medium text-gray-600">No campaign found for {platformConfig.name}</p>
            <p className="text-gray-400 text-sm mt-1">Please set up a campaign first.</p>
            {!isPublic && (
              <button
                onClick={() => router.push('/')}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                Go to Dashboard
              </button>
            )}
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
          <div className="space-y-6">
            {/* Pie Chart - Data Distribution Among Posts */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Engagement Distribution by Post
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      dataKey="value"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {getPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Histogram Charts with Visible X and Y Axes */}
            <div className={`grid gap-4 ${platformConfig.metrics.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
              {platformConfig.metrics.map((metric) => {
                const data = getHistogramData(metric.key);
                const maxValue = Math.max(...data.map(d => d.value));
                
                return (
                  <div key={metric.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                    {/* Card Header */}
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: metric.color }}></div>
                          <h3 className="text-sm font-semibold text-gray-800">{metric.label}</h3>
                        </div>
                        <span className="text-lg font-bold" style={{ color: metric.color }}>
                          {posts.reduce((sum, p) => sum + getMetricValue(p, metric.key), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* Histogram Chart with Axes */}
                    <div className="p-4 h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            interval={0}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={{ stroke: '#d1d5db' }}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            axisLine={{ stroke: '#d1d5db' }}
                            tickLine={{ stroke: '#d1d5db' }}
                            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                            domain={[0, Math.ceil(maxValue * 1.1)]}
                          />
                          <Tooltip content={<HistogramTooltip />} cursor={{ fill: 'rgba(23, 28, 46, 0.08)' }} />
                          <Bar 
                            dataKey="value" 
                            fill={metric.color}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-800">Post-by-Post Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Post</th>
                      {platformConfig.metrics.map((metric) => (
                        <th 
                          key={metric.key} 
                          className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider"
                          style={{ color: metric.color }}
                        >
                          {metric.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {posts.map((post, index) => (
                      <tr key={post.id} className="hover:bg-primary-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 truncate max-w-[180px] sm:max-w-[250px]">
                            {post.caption || `Post ${index + 1}`}
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{post.platform_post_id}</div>
                        </td>
                        {platformConfig.metrics.map((metric) => (
                          <td 
                            key={metric.key} 
                            className="px-4 py-3 text-right font-bold tabular-nums"
                            style={{ color: metric.color }}
                          >
                            {getMetricValue(post, metric.key).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-primary-50/50">
                    <tr>
                      <td className="px-4 py-3 font-bold text-gray-900">Grand Total</td>
                      {platformConfig.metrics.map((metric) => (
                        <td 
                          key={metric.key} 
                          className="px-4 py-3 text-right font-bold text-lg tabular-nums"
                          style={{ color: metric.color }}
                        >
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
