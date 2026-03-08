'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { campaignApi, postApi, Post } from '@/lib/api';
import { SFDPFooter } from './Footer';

// SFDP Brand Colors (Dark Navy with metallic orange accent)
const SFDP_NAVY = '#171c2e';
const SFDP_NAVY_LIGHT = '#252e54';
const SFDP_ORANGE = '#d97706';
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

interface PublicDashboardProps {
  campaignId: number;
}

export function PublicDashboard({ campaignId }: PublicDashboardProps) {
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

  // Fetch posts for the active campaign
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

  // Prepare histogram data for each metric
  const getHistogramData = (metricKey: string) => {
    return posts.map((post, index) => ({
      name: post.caption 
        ? (post.caption.length > 12 ? post.caption.substring(0, 12) + '…' : post.caption)
        : `Post ${index + 1}`,
      value: getMetricValue(post, metricKey),
      fullName: post.caption || `Post ${index + 1}`,
    }));
  };

  // Prepare pie chart data - distribution among posts (using total engagement)
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
      return (
        <div className="bg-gray-900/95 backdrop-blur text-white rounded-lg shadow-2xl px-4 py-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-1">{payload[0].name}</p>
          <p className="font-bold text-xl">{payload[0].value.toLocaleString()}</p>
          <p className="text-xs text-gray-400">{((payload[0].value / posts.reduce((sum, p) => sum + platformConfig.metrics.reduce((s, m) => s + getMetricValue(p, m.key), 0), 0)) * 100).toFixed(1)}%</p>
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
          
          {/* Final Results Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs font-semibold text-white">Final Results</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 sm:py-8">
        <div className="max-w-5xl mx-auto px-4">
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
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
              <p className="text-sm text-gray-500">Loading performance data...</p>
            </div>
          ) : !selectedCampaign ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-lg font-medium text-gray-900">No campaign found for {platformConfig.name}</p>
              <p className="text-gray-500 text-sm mt-1">Please set up a campaign first.</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900">No posts tracked yet</p>
              <p className="text-gray-500 text-sm mt-1">Check back soon for updates!</p>
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
                  const total = posts.reduce((sum, p) => sum + getMetricValue(p, metric.key), 0);
                  const maxValue = Math.max(...data.map(d => d.value));
                  
                  return (
                    <div 
                      key={metric.key} 
                      className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Card Header */}
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: metric.color }}
                          ></div>
                          <h3 className="text-sm font-semibold text-gray-800">{metric.label}</h3>
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
