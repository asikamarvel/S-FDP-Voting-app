'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { campaignApi, postApi, Post } from '@/lib/api';
import { SFDPFooter } from './Footer';

// SFDP Brand Colors (Dark Navy with metallic orange accent)
const SFDP_BLUE = '#171c2e';
const SFDP_BLUE_LIGHT = '#252e54';
const SFDP_BLUE_DARK = '#0f1219';
const SFDP_ORANGE = '#d97706';

// Platform-specific chart configurations with SFDP brand colors
const platformCharts = {
  twitter: {
    metrics: [
      { key: 'retweets', label: 'Retweets', color: '#171c2e' },
      { key: 'likes', label: 'Likes', color: '#3d4a7a' },
      { key: 'valid', label: 'Valid Followers', color: '#d97706' },
    ],
  },
  youtube: {
    metrics: [
      { key: 'views', label: 'Views', color: '#171c2e' },
      { key: 'likes', label: 'Likes', color: '#3d4a7a' },
      { key: 'uniqueCommenters', label: 'Unique Commenters', color: '#d97706' },
    ],
  },
  instagram: {
    metrics: [
      { key: 'likes', label: 'Likes', color: '#171c2e' },
      { key: 'comments', label: 'Comments', color: '#3d4a7a' },
    ],
  },
  facebook: {
    metrics: [
      { key: 'reactions', label: 'Reactions', color: '#171c2e' },
      { key: 'comments', label: 'Comments', color: '#3d4a7a' },
      { key: 'shares', label: 'Shares', color: '#d97706' },
    ],
  },
};

interface PublicDashboardProps {
  campaignId: number;
}

export function PublicDashboard({ campaignId }: PublicDashboardProps) {
  // Fetch campaigns
  const { data: campaignsData, isLoading: loadingCampaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.list,
  });

  // Get selected campaign
  const selectedCampaign = campaignsData?.campaigns?.find(c => c.id === campaignId);
  const platform = selectedCampaign?.platform || 'twitter';
  const chartConfig = platformCharts[platform as keyof typeof platformCharts] || platformCharts.twitter;

  // Fetch posts for the campaign
  const { data: postsData, isLoading: loadingPosts } = useQuery({
    queryKey: ['posts', campaignId],
    queryFn: () => postApi.list(campaignId),
    enabled: !!campaignId,
  });

  const posts = postsData?.posts || [];
  const isLoading = loadingCampaigns || loadingPosts;

  // Get value for a specific metric key from a post
  const getMetricValue = (post: Post, key: string): number => {
    switch (key) {
      case 'likes': return post.likes_count || 0;
      case 'comments': return post.comments_count || 0;
      case 'replies': return post.comments_count || 0;
      case 'retweets': return post.engagement_count || 0;
      case 'valid': return post.valid_vote_count || 0;
      case 'views': return post.views_count || 0;
      case 'reactions': return post.likes_count || 0;
      case 'shares': return post.shares_count || 0;
      case 'uniqueCommenters': return post.engagement_count || 0;
      default: return 0;
    }
  };

  // Prepare individual metric data for histogram charts
  const getMetricChartData = (metricKey: string) => {
    return posts.map((post, index) => ({
      name: post.caption 
        ? (post.caption.length > 10 ? post.caption.substring(0, 10) + '…' : post.caption)
        : `#${index + 1}`,
      value: getMetricValue(post, metricKey),
    }));
  };

  const SimpleTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 backdrop-blur text-white rounded-lg shadow-2xl px-4 py-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">{label}</p>
          <p className="font-bold text-xl">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Premium Header - Inspired by s-fdp.org */}
      <header className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        
        <div className="relative max-w-5xl mx-auto px-4 py-6 sm:py-8">
          {/* Top bar with logo and org name */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-4">
              <img 
                src="/SFDP PNG 3.png" 
                alt="SFDP Logo" 
                className="h-16 sm:h-20 w-auto object-contain"
              />
            </div>
            <p className="text-primary-200 text-xs sm:text-sm font-medium uppercase tracking-widest mb-2">
              Society for Disease Prevention
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
              Health Innovation Challenge
            </h1>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-accent-500/80 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                Stage 2
              </span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm">
                2026
              </span>
            </div>
          </div>
          
          {/* Live Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400"></span>
              </span>
              <span className="text-xs font-semibold text-white">Live Results</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
              <p className="text-sm text-gray-500">Loading performance data...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900">No submissions yet</p>
              <p className="text-gray-500 text-sm mt-1">Check back soon for updates!</p>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {/* Total Stats Banner */}
              <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-primary-500/20">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-primary-100 text-sm font-medium">Performance Overview</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1">{posts.length} Tracked Posts</p>
                  </div>
                  <div className="flex gap-6 sm:gap-8">
                    {chartConfig.metrics.map((metric) => (
                      <div key={metric.key} className="text-center">
                        <p className="text-3xl sm:text-4xl font-bold">
                          {posts.reduce((sum, p) => sum + getMetricValue(p, metric.key), 0).toLocaleString()}
                        </p>
                        <p className="text-primary-100 text-xs sm:text-sm mt-1">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Three Compact Chart Cards - Stack on mobile, row on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                {chartConfig.metrics.map((metric, idx) => {
                  const data = getMetricChartData(metric.key);
                  const total = posts.reduce((sum, p) => sum + getMetricValue(p, metric.key), 0);
                  return (
                    <div 
                      key={metric.key} 
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Card Header */}
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: metric.color }}
                            ></div>
                            <h3 className="text-sm font-semibold text-gray-800">{metric.label}</h3>
                          </div>
                          <span className="text-lg font-bold" style={{ color: metric.color }}>
                            {total.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      
                      {/* Chart */}
                      <div className="px-2 py-3 h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 20 }}>
                            <XAxis 
                              dataKey="name" 
                              angle={-45} 
                              textAnchor="end" 
                              interval={0}
                              tick={{ fontSize: 8, fill: '#9ca3af' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis hide />
                            <Tooltip content={<SimpleTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }} />
                            <Bar 
                              dataKey="value" 
                              fill={metric.color}
                              radius={[3, 3, 0, 0]}
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
                        {chartConfig.metrics.map((metric) => (
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
                          {chartConfig.metrics.map((metric) => (
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
                        {chartConfig.metrics.map((metric) => (
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
      </main>

      {/* SFDP Footer */}
      <SFDPFooter />
    </div>
  );
}
