'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, FileText, Headphones, Pen, Mic } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type ContentType = 'reading' | 'listening' | 'writing' | 'speaking';

export default function AdminContentPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ContentType>('reading');

  // Check if user is admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Admin Content Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage exam questions and content
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ContentType)}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="reading" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reading
            </TabsTrigger>
            <TabsTrigger value="listening" className="flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Listening
            </TabsTrigger>
            <TabsTrigger value="writing" className="flex items-center gap-2">
              <Pen className="h-4 w-4" />
              Writing
            </TabsTrigger>
            <TabsTrigger value="speaking" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Speaking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reading" className="mt-6">
            <ReadingContent />
          </TabsContent>

          <TabsContent value="listening" className="mt-6">
            <ListeningContent />
          </TabsContent>

          <TabsContent value="writing" className="mt-6">
            <WritingContent />
          </TabsContent>

          <TabsContent value="speaking" className="mt-6">
            <SpeakingContent />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ReadingContent() {
  const router = useRouter();
  const [passages, setPassages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPassages();
  }, []);

  const fetchPassages = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/content/reading/passages', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch passages');
      }

      const data = await response.json();
      setPassages(data.passages);
    } catch (error) {
      console.error('Error fetching passages:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load passages',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Reading Passages</h2>
          <p className="text-muted-foreground">
            Manage reading passages and questions
          </p>
        </div>
        <Button onClick={() => router.push('/admin/content/reading/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Passage
        </Button>
      </div>

      {passages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No passages yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first reading passage to get started
            </p>
            <Button onClick={() => router.push('/admin/content/reading/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Passage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {passages.map((passage) => (
            <Card key={passage.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{passage.title}</CardTitle>
                    <CardDescription>
                      Level: {passage.level} • {passage.questions.length} questions
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/content/reading/${passage.id}`)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {passage.text}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ListeningContent() {
  const router = useRouter();
  const [audioFiles, setAudioFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const fetchAudioFiles = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/content/listening/audio', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audio files');
      }

      const data = await response.json();
      setAudioFiles(data.audioFiles);
    } catch (error) {
      console.error('Error fetching audio files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Listening Audio</h2>
          <p className="text-muted-foreground">
            Manage listening audio and questions
          </p>
        </div>
        <Button onClick={() => router.push('/admin/content/listening/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Audio
        </Button>
      </div>

      {audioFiles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Headphones className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No audio files yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first audio file to get started
            </p>
            <Button onClick={() => router.push('/admin/content/listening/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Audio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audioFiles.map((audio) => (
            <Card key={audio.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{audio.s3Key || audio.url}</CardTitle>
                    <CardDescription>
                      Duration: {audio.duration}s • {audio.questions.length} questions
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/content/listening/${audio.id}`)}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function WritingContent() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/content/writing/prompts', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }

      const data = await response.json();
      setPrompts(data.prompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Writing Prompts</h2>
          <p className="text-muted-foreground">
            Manage writing prompts
          </p>
        </div>
        <Button onClick={() => router.push('/admin/content/writing/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Prompt
        </Button>
      </div>

      {prompts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Pen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first writing prompt to get started
            </p>
            <Button onClick={() => router.push('/admin/content/writing/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Prompt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{prompt.topic}</CardTitle>
                    <CardDescription>
                      {prompt.taskType} • {prompt.timeLimit} minutes
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/content/writing/${prompt.id}`)}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SpeakingContent() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/content/speaking/questions', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Speaking Questions</h2>
          <p className="text-muted-foreground">
            Manage speaking cue cards and questions
          </p>
        </div>
        <Button onClick={() => router.push('/admin/content/speaking/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mic className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No questions yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first speaking question to get started
            </p>
            <Button onClick={() => router.push('/admin/content/speaking/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Part {question.part}</CardTitle>
                    <CardDescription>
                      Prep: {question.prepTime}s • Record: {question.recordingTime}s
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/admin/content/speaking/${question.id}`)}
                  >
                    Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm line-clamp-2">
                  {question.cueCardText}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
