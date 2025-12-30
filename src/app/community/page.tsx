'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Plus, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  tags: string[];
  likesCount: number;
  createdAt: Date;
  comments?: Comment[];
  _count: {
    comments: number;
  };
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  createdAt: Date;
}

export default function CommunityPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = ['ALL', 'General', 'Study Abroad', 'Exam Tips', 'Writing', 'Speaking', 'Vocabulary', 'Grammar', 'Community'];

  // Fetch posts on mount
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    fetchPosts();
  }, [user, selectedTag]);

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const tagParam = selectedTag === 'ALL' ? '' : `&tag=${selectedTag}`;
      const response = await fetch(`/api/community/posts?limit=20${tagParam}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }

      const data = await response.json();
      setPosts(data.posts || []);
      setHasMore(data.posts.length >= 20);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
    if (comments[postId]) return; // Already loaded

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/community/comments/${postId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      setComments(prev => ({ ...prev, [postId]: data.comments || [] }));
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const toggleComments = async (postId: string) => {
    if (comments[postId]) {
      setComments(prev => ({ ...prev, [postId]: null }));
    }
  };

  const handleLike = async (postId: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/community/like/${postId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to like post');
      }

      // Update posts locally
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, likesCount: post.likesCount + 1 }
          : post
      ));

      toast({
        title: 'Post Liked',
        description: 'You liked this post',
      });
    } catch (err) {
      console.error('Error liking post:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to like post',
      });
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Post content cannot be empty',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          content: newPostContent,
          tags: newPostTags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const data = await response.json();
      setPosts(prev => [data.post, ...prev]);
      setNewPostContent('');
      setNewPostTags([]);
      setShowCreatePost(false);

      toast({
        title: 'Post Created',
        description: 'Your post has been shared with the community',
      });
    } catch (err) {
      console.error('Error creating post:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create post',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
    fetchPosts();
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Community</h1>
              <p className="text-sm text-muted-foreground">
                Share your learning journey with fellow students
              </p>
            </div>
            <Button
              onClick={() => router.push('/learning')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Learning Hub →
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Post</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCreatePost(false)}
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2">Content</label>
                  <Textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share your learning experience, ask a question, or discuss exam tips..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2">Tags (Optional)</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(1).map(tag => (
                      <Badge
                        key={tag}
                        variant={newPostTags.includes(tag) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => {
                          setNewPostTags(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreatePost(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={isSubmitting || !newPostContent.trim()}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting...
                      </>
                    ) : (
                      'Post'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tag Filter */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Filter by:</span>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedTag(tag);
                      setPage(1);
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No posts yet</p>
            <p className="text-sm">Be the first to share something!</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {posts.map((post) => (
                <Card key={post.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        {post.userAvatar ? (
                          <img
                            src={post.userAvatar}
                            alt={post.userName}
                            className="w-10 h-10"
                          />
                        ) : (
                          <AvatarFallback className="w-10 h-10 bg-primary text-primary-foreground text-lg">
                            {post.userName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{post.userName}</span>
                            {(post.tags || []).length > 0 && (
                              <div className="flex gap-1">
                                {post.tags.slice(0, 2).map((tag, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(new Date(post.createdAt))}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          className="flex items-center gap-1"
                        >
                          <Heart className={`h-4 w-4 ${post.userId === user.id ? 'text-red-500 fill-current' : 'text-muted-foreground'}`} />
                          <span className="text-sm">{post.likesCount}</span>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base leading-relaxed mb-4 whitespace-pre-wrap">
                      {post.content}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {post.comments && post.comments.length > 0 && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {post.comments.length}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleComments(post.id)}
                      >
                        {comments[post.id] ? 'Hide' : 'Show'} Comments
                      </Button>
                    </div>
                  </CardContent>

                  {/* Expandable Comments */}
                  {comments[post.id] && (
                    <CardContent className="pt-0 border-t bg-muted/30">
                      <div className="space-y-4 max-h-64 overflow-y-auto">
                        {(post.comments || []).map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              {comment.userAvatar ? (
                                <img
                                  src={comment.userAvatar}
                                  alt={comment.userName}
                                  className="w-full h-full"
                                />
                              ) : (
                                <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                                  {comment.userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-semibold">{comment.userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimeAgo(new Date(comment.createdAt))}
                                </span>
                              </div>
                              <p className="text-sm leading-relaxed">
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pb-8">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More Posts'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Create Post Button */}
      {!showCreatePost && user && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button
            onClick={() => setShowCreatePost(true)}
            size="lg"
            className="rounded-full shadow-lg"
          >
            <Plus className="mr-2 h-5 w-5" />
            New Post
          </Button>
        </div>
      )}
    </div>
  );
}
