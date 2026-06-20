import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addComment,
  fetchEngagement,
  toggleLike,
  toggleSave,
  type PostEngagement,
} from '../services/engagement';

export const ENGAGEMENT_QUERY_KEY = ['ailurus', 'engagement'] as const;

export function usePostEngagement(postId: string | undefined, viewerAddress?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...ENGAGEMENT_QUERY_KEY, postId],
    queryFn: async () => {
      const posts = await fetchEngagement([postId!]);
      return posts[0] ?? emptyEngagement(postId!);
    },
    enabled: Boolean(postId),
    staleTime: 10_000,
  });

  const engagement = query.data ?? (postId ? emptyEngagement(postId) : null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [...ENGAGEMENT_QUERY_KEY, postId] });

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(postId!, viewerAddress!),
    onSuccess: (result) => {
      queryClient.setQueryData([...ENGAGEMENT_QUERY_KEY, postId], result.post);
    },
  });

  const commentMutation = useMutation({
    mutationFn: (text: string) => addComment(postId!, viewerAddress!, text),
    onSuccess: (result) => {
      queryClient.setQueryData([...ENGAGEMENT_QUERY_KEY, postId], result.post);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => toggleSave(postId!, viewerAddress!),
    onSuccess: (result) => {
      queryClient.setQueryData([...ENGAGEMENT_QUERY_KEY, postId], result.post);
    },
  });

  const viewerLower = viewerAddress?.toLowerCase() ?? '';
  const isLiked = engagement?.likedBy.some((addr) => addr.toLowerCase() === viewerLower) ?? false;
  const isSaved = engagement?.savedBy.some((addr) => addr.toLowerCase() === viewerLower) ?? false;

  return {
    engagement,
    isLoading: query.isLoading,
    isLiked,
    isSaved,
    toggleLike: () => {
      if (!viewerAddress) throw new Error('Sign in to like');
      return likeMutation.mutateAsync();
    },
    addComment: (text: string) => {
      if (!viewerAddress) throw new Error('Sign in to comment');
      return commentMutation.mutateAsync(text);
    },
    toggleSave: () => {
      if (!viewerAddress) throw new Error('Sign in to save');
      return saveMutation.mutateAsync();
    },
    invalidate,
  };
}

export function useEngagementMap(postIds: string[]) {
  return useQuery({
    queryKey: [...ENGAGEMENT_QUERY_KEY, 'batch', postIds.join(',')],
    queryFn: () => fetchEngagement(postIds),
    enabled: postIds.length > 0,
    staleTime: 15_000,
  });
}

function emptyEngagement(postId: string): PostEngagement {
  return { postId, likes: 0, likedBy: [], comments: [], savedBy: [] };
}
