'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Link as LinkIcon } from 'lucide-react';
import { postApi } from '@/lib/api';

interface PostFormProps {
  campaignId: number;
  platform: 'instagram' | 'twitter' | 'youtube' | 'tiktok' | 'facebook';
  onClose: () => void;
  onSuccess: () => void;
}

// Extract post ID from various social media URLs
function extractPostId(url: string, platform: string): string | null {
  try {
    const urlObj = new URL(url);
    
    if (platform === 'twitter') {
      // Twitter/X: https://twitter.com/user/status/1234567890 or https://x.com/user/status/1234567890
      const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
      return match ? match[1] : null;
    }
    
    if (platform === 'instagram') {
      // Instagram: https://www.instagram.com/p/ABC123/ or /reel/ABC123/
      const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
      return match ? match[1] : null;
    }
    
    if (platform === 'youtube') {
      // YouTube: https://www.youtube.com/watch?v=ABC123 or https://youtu.be/ABC123
      const watchMatch = urlObj.searchParams.get('v');
      if (watchMatch) return watchMatch;
      const shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]+)/);
      return shortMatch ? shortMatch[1] : null;
    }
    
    if (platform === 'tiktok') {
      // TikTok: https://www.tiktok.com/@user/video/1234567890
      const match = url.match(/tiktok\.com\/@[^\/]+\/video\/(\d+)/);
      return match ? match[1] : null;
    }
    
    if (platform === 'facebook') {
      // Facebook: https://www.facebook.com/pagename/posts/1234567890 or /permalink/
      const postsMatch = url.match(/facebook\.com\/[^\/]+\/posts\/(\d+)/);
      if (postsMatch) return postsMatch[1];
      const permalinkMatch = url.match(/facebook\.com\/permalink\.php\?.*story_fbid=(\d+)/);
      if (permalinkMatch) return permalinkMatch[1];
      const videoMatch = url.match(/facebook\.com\/.*\/videos\/(\d+)/);
      return videoMatch ? videoMatch[1] : null;
    }
    
    return null;
  } catch {
    return null;
  }
}

export function PostForm({ campaignId, platform, onClose, onSuccess }: PostFormProps) {
  const [postUrl, setPostUrl] = useState('');
  const [postId, setPostId] = useState('');
  const [caption, setCaption] = useState('');
  const [autoExtracted, setAutoExtracted] = useState(false);

  const handleUrlChange = (url: string) => {
    setPostUrl(url);
    const extracted = extractPostId(url, platform);
    if (extracted) {
      setPostId(extracted);
      setAutoExtracted(true);
    } else {
      setAutoExtracted(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: { platform_post_id: string; campaign_id: number; post_url?: string; caption?: string }) => 
      postApi.create(data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      platform_post_id: postId,
      campaign_id: campaignId,
      post_url: postUrl || undefined,
      caption: caption || undefined,
    });
  };

  const platformExamples = {
    twitter: 'https://twitter.com/username/status/1234567890123456789',
    instagram: 'https://www.instagram.com/p/ABC123xyz/',
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    tiktok: 'https://www.tiktok.com/@username/video/1234567890123456789',
    facebook: 'https://www.facebook.com/pagename/posts/1234567890',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Add Post to Track</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <LinkIcon className="w-4 h-4 inline mr-1" />
            Post URL
          </label>
          <input
            type="url"
            value={postUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder={platformExamples[platform]}
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste the full URL of the {platform === 'twitter' ? 'tweet' : 'post'} you want to track
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Post ID {autoExtracted && <span className="text-green-600">(auto-extracted ✓)</span>}
          </label>
          <input
            type="text"
            required
            value={postId}
            onChange={(e) => {
              setPostId(e.target.value);
              setAutoExtracted(false);
            }}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              autoExtracted ? 'border-green-300 bg-green-50' : 'border-gray-300'
            }`}
            placeholder={platform === 'twitter' ? '1234567890123456789' : 'Post ID'}
          />
          {!autoExtracted && (
            <p className="text-xs text-gray-500 mt-1">
              {platform === 'twitter' 
                ? 'The tweet ID (numbers at the end of the tweet URL)' 
                : 'Paste URL above to auto-extract, or enter manually'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={2}
            placeholder="Add a note to identify this post"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || !postId}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Adding...' : 'Add Post'}
          </button>
        </div>

        {createMutation.isError && (
          <p className="text-sm text-red-600">
            Error adding post. It may already exist in this campaign.
          </p>
        )}
      </form>
    </div>
  );
}
