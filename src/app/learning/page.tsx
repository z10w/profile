'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Bookmark, Play, Clock, Tag, Video, TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Lesson {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  level: string;
  videoUrl?: string;
  isPublished: boolean;
}

interface Bookmark {
  id: string;
  userId: string;
  lessonId: string;
  createdAt: Date;
}

export default function LearningHubPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string | null>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>('ALL');
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Levels and tags
  const levels = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const tags = ['ALL', 'Grammar', 'Vocabulary', 'Reading Tips', 'Writing Tips', 'Speaking Tips'];

  useEffect(() => {
    if (!user) return;
    fetchLessons();
    fetchBookmarks();
  }, [user]);

  const fetchLessons = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const levelParam = selectedLevel === 'ALL' ? '' : selectedLevel;
      const tagParam = selectedTag === 'ALL' ? '' : selectedTag;

      const url = `/api/learning/lessons${levelParam ? `?level=${levelParam}` : ''}${tagParam ? `&tag=${tagParam}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch lessons');
      }

      const data = await response.json();
      setLessons(data.lessons || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError('Failed to load lessons');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/learning/bookmarks', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bookmarks');
      }

      const data = await response.json();
      setBookmarks(data.bookmarks || []);
    } catch (err) {
      console.error('Error fetching bookmarks:', err);
    }
  };

  const toggleBookmark = async (lessonId: string) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const isBookmarked = bookmarks.some(b => b.lessonId === lessonId);

      if (isBookmarked) {
        // Delete bookmark
        const response = await fetch(`/api/learning/bookmarks/${lessonId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to remove bookmark');
        }

        toast({
          title: 'Bookmark Removed',
          description: 'Lesson removed from your bookmarks',
        });
      } else {
        // Add bookmark
        const response = await fetch('/api/learning/bookmarks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ lessonId }),
        });

        if (!response.ok) {
          throw new Error('Failed to add bookmark');
        }

        toast({
          title: 'Lesson Bookmarked',
          description: 'Lesson added to your bookmarks',
        });
      }

      // Refresh bookmarks
      await fetchBookmarks();
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update bookmark',
      });
    }
  };

  const getRecommendations = () => {
    // Simple recommendations based on fixed criteria
    // In a real app, this would analyze user's exam history
    const recommendations = [];

    // Recommendation based on level
    if (selectedLevel && selectedLevel !== 'ALL') {
      const levelNum = parseInt(selectedLevel.replace(/\D/g, ''));
      if (levelNum <= 2) {
        recommendations.push({
          level: selectedLevel,
          title: 'Grammar Basics',
          description: `Build your foundation with ${selectedLevel} level grammar lessons`,
          icon: 'Book',
        });
      } else {
        recommendations.push({
          level: selectedLevel,
          title: 'Advanced Topics',
          description: `Challenge yourself with complex topics at ${selectedLevel} level`,
          icon: 'TrendingUp',
        });
      }
    }

    // Recommendation based on tag
    if (selectedTag && selectedTag !== 'ALL') {
      recommendations.push({
        level: selectedTag,
        title: `More ${selectedTag}`,
        description: `Discover additional ${selectedTag.toLowerCase()} content`,
        icon: 'Tag',
      });
    }

    return recommendations;
  };

  const filteredLessons = lessons.filter(lesson => {
    const levelMatch = selectedLevel === 'ALL' || lesson.level === selectedLevel;
    const tagMatch = selectedTag === 'ALL' || (lesson.tags || []).includes(selectedTag);
    return levelMatch && tagMatch;
  });

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
              <h1 className="text-2xl font-bold">Learning Hub</h1>
              <p className="text-sm text-muted-foreground">
                Educational content and practice resources
              </p>
            </div>
            <button
              onClick={() => router.push('/community')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Community →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Recommendations Section */}
        {getRecommendations().length > 0 && (
          <Card className="mb-6 bg-primary/5 border-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recommended for You</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {getRecommendations().map((rec, index) => (
                  <Card key={index} className="bg-background hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-2">
                        {rec.icon === 'Book' && <BookOpen className="h-5 w-5 text-primary" />}
                        {rec.icon === 'TrendingUp' && <TrendingUp className="h-5 w-5 text-primary" />}
                        {rec.icon === 'Tag' && <Tag className="h-5 w-5 text-primary" />}
                        <div>
                          <p className="font-semibold text-base">{rec.title}</p>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedLevel(rec.level)}
                      >
                        View
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Level:</span>
                <div className="flex gap-2">
                  {levels.map(level => (
                    <Badge
                      key={level}
                      variant={selectedLevel === level ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedLevel(level)}
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Category:</span>
                <div className="flex gap-2 flex-wrap">
                  {tags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTag === tag ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Grid */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No lessons found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLessons.map((lesson) => {
              const isBookmarked = bookmarks.some(b => b.lessonId === lesson.id);
              return (
                <Card key={lesson.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={lesson.level as any}>{lesson.level}</Badge>
                          {(lesson.tags || []).slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <CardTitle className="text-lg">{lesson.title}</CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleBookmark(lesson.id)}
                      >
                        <Bookmark className={`h-5 w-5 ${isBookmarked ? 'text-primary fill-current' : 'text-muted-foreground'}`} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {lesson.content}
                    </p>
                    {lesson.videoUrl && (
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Video className="h-4 w-4" />
                        <span>Watch Video</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/learning/${lesson.id}`)}
                      >
                        View Lesson
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
