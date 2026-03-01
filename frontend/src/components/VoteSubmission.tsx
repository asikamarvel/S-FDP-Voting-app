'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2, Twitter } from 'lucide-react';
import { api } from '@/lib/api';
import { SFDPFooter } from './Footer';

interface Post {
  id: number;
  platform_post_id: string;
  post_url?: string;
  caption?: string;
}

interface SubmissionResult {
  success: boolean;
  is_follower: boolean;
  username: string;
  message: string;
  vote_counted: boolean;
}

export function VoteSubmission({ campaignId }: { campaignId: number }) {
  const [username, setUsername] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  // Fetch available posts
  const { data: postsData, isLoading: loadingPosts } = useQuery({
    queryKey: ['vote-posts', campaignId],
    queryFn: async () => {
      const response = await api.get(`/vote/posts/${campaignId}`);
      return response.data;
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { username: string; post_id: number }) => {
      const response = await api.post('/vote/submit', data);
      return response.data as SubmissionResult;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: any) => {
      setResult({
        success: false,
        is_follower: false,
        username: username,
        message: error.response?.data?.detail || 'An error occurred',
        vote_counted: false,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPostId || !username) return;
    
    setResult(null);
    submitMutation.mutate({
      username: username.replace('@', ''),
      post_id: selectedPostId,
    });
  };

  const posts = postsData?.posts || [];

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Twitter className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Your Vote</h1>
          <p className="text-gray-500 mt-2">
            Enter your Twitter username to verify your vote
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {loadingPosts ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-center text-gray-500">No active posts to vote on</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Post
                </label>
                <select
                  value={selectedPostId || ''}
                  onChange={(e) => setSelectedPostId(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Choose a post...</option>
                  {posts.map((post: Post) => (
                    <option key={post.id} value={post.id}>
                      {post.caption || `Post ${post.platform_post_id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Twitter Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    @
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace('@', ''))}
                    placeholder="username"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  You must be following the official account for your vote to count
                </p>
              </div>

              <button
                type="submit"
                disabled={submitMutation.isPending || !username || !selectedPostId}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Submit Vote'
                )}
              </button>
            </>
          )}
        </form>

        {/* Result Display */}
        {result && (
          <div
            className={`mt-6 p-4 rounded-lg ${
              result.vote_counted
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.vote_counted ? (
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    result.vote_counted ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {result.vote_counted ? 'Vote Counted!' : 'Vote Not Counted'}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    result.vote_counted ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">How it works:</h3>
          <ol className="text-sm text-gray-500 space-y-1 list-decimal list-inside">
            <li>Follow the official account on Twitter</li>
            <li>Like the competition post</li>
            <li>Enter your Twitter username above</li>
            <li>Your vote will be verified automatically</li>
          </ol>
        </div>
        
        {/* Footer */}
        <div className="mt-6">
          <SFDPFooter />
        </div>
      </div>
    </div>
  );
}
