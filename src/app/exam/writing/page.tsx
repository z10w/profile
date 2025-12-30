'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WritingPrompt {
  id: string;
  taskType: 'TASK_1' | 'TASK_2';
  topic: string;
  description?: string;
  imageUrl?: string;
  timeLimit: number;
  wordCount?: number;
}

interface ExamData {
  examId: string;
  type: 'WRITING';
  prompt: WritingPrompt;
  duration: number;
}

export default function WritingExamPage() {
  const { user, refreshTokens } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [userText, setUserText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !showResults) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, showResults]);

  // Word counter
  useEffect(() => {
    const words = userText.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [userText]);

  // Start exam
  useEffect(() => {
    if (!user) return;
    startExam();
  }, [user]);

  const startExam = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/exam/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          type: 'WRITING',
          difficulty: 'MIXED',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start exam');
      }

      const data: ExamData = await response.json();
      setExamData(data);
      setTimeRemaining(data.duration * 60); // Convert to seconds
      setIsLoading(false);
    } catch (err) {
      console.error('Error starting exam:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to start exam',
      });
      router.push('/dashboard');
    }
  };

  const handleSubmit = async () => {
    if (!examData || userText.trim().length === 0) {
      setError('Please write something before submitting');
      return;
    }

    // Check minimum word count
    const minWords = examData.prompt.taskType === 'TASK_1' ? 150 : 250;
    const words = userText.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < minWords) {
      setError(`Your response is too short. Minimum: ${minWords} words`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/exam/writing/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          examId: examData.examId,
          text: userText,
          timeSpent: examData.duration * 60 - timeRemaining,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit exam');
      }

      const data = await response.json();
      setResult(data);
      setShowResults(true);
      setTimeRemaining(0);

      // Refresh user data to update credits
      await refreshTokens();

      toast({
        title: 'Exam Submitted',
        description: `Your score: ${data.score}`,
      });
    } catch (err) {
      console.error('Error submitting exam:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to submit exam',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!examData) {
    return null;
  }

  if (showResults && result) {
    return (
      <div className="min-h-screen bg-muted/20">
        <header className="border-b bg-background sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Writing Exam Results</h1>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Score: {result.score?.toFixed(1)}
              </Badge>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <div className="text-6xl font-bold mb-2">
                {result.score?.toFixed(1)}
              </div>
              <p className="text-muted-foreground text-lg">IELTS Band Score</p>
            </CardContent>
          </Card>

          {/* Sub-scores */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Score Breakdown</CardTitle>
              <CardDescription>Your performance across IELTS criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Task Response</span>
                  <Badge variant="outline">
                    {result.subScores?.taskResponse?.toFixed(1)}
                  </Badge>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${((result.subScores?.taskResponse || 0) / 9) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Coherence & Cohesion</span>
                  <Badge variant="outline">
                    {result.subScores?.coherence?.toFixed(1)}
                  </Badge>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${((result.subScores?.coherence || 0) / 9) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Lexical Resource (Vocabulary)</span>
                  <Badge variant="outline">
                    {result.subScores?.vocabulary?.toFixed(1)}
                  </Badge>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${((result.subScores?.vocabulary || 0) / 9) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Grammatical Range & Accuracy</span>
                  <Badge variant="outline">
                    {result.subScores?.grammar?.toFixed(1)}
                  </Badge>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${((result.subScores?.grammar || 0) / 9) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>Detailed analysis of your writing</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap">
                {result.feedback}
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Exam Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Word Count</p>
                  <p className="text-2xl font-bold">
                    {result.subScores?.wordCount || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                  <p className="text-2xl font-bold">
                    {Math.floor((result.subScores?.timeSpent || 0) / 60)}m {((result.subScores?.timeSpent || 0) % 60).toString().padStart(2, '0')}s
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Answer */}
          <Card>
            <CardHeader>
              <CardTitle>Model Answer</CardTitle>
              <CardDescription>
                A band 8+ sample answer for reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                {result.improvedAnswerExample}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-center gap-4 mt-8">
            <Button
              size="lg"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/exam/writing')}
            >
              Try Another Writing Exam
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header with Timer */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Writing Exam</h1>
              <p className="text-sm text-muted-foreground">
                {examData.prompt.taskType} • {examData.prompt.topic}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant={timeRemaining < 300 ? 'destructive' : 'outline'}
                className="text-lg px-4 py-2 flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6" style={{ gridTemplateRows: 'auto 1fr' }}>
          {/* Writing Prompt (Top) */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24 z-20">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 mt-1" />
                  <div>
                    <CardTitle className="text-lg">Writing Prompt</CardTitle>
                    <CardDescription>
                      Task Type: <Badge variant="outline" className="ml-2">
                        {examData.prompt.taskType}
                      </Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-1">Topic:</p>
                  <p className="text-lg">{examData.prompt.topic}</p>
                </div>

                {examData.prompt.description && (
                  <div>
                    <p className="text-sm font-semibold mb-1">Description:</p>
                    <p className="text-base">{examData.prompt.description}</p>
                  </div>
                )}

                {examData.prompt.imageUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-semibold mb-2">Image/Chart:</p>
                    <img
                      src={examData.prompt.imageUrl}
                      alt="Writing prompt image"
                      className="w-full rounded-lg border"
                    />
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Time Limit: {examData.prompt.timeLimit} minutes</span>
                    </div>
                    {examData.prompt.wordCount && (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span>Minimum: {examData.prompt.wordCount} words</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Text Editor (Bottom) */}
          <div className="lg:col-span-2 h-full">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Your Response</CardTitle>
                  <Badge variant="outline" className="text-base">
                    {wordCount} words
                  </Badge>
                </div>
                <CardDescription>
                  Write your response below. Minimum: {examData.prompt.taskType === 'TASK_1' ? 150 : 250} words
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <textarea
                  value={userText}
                  onChange={(e) => setUserText(e.target.value)}
                  placeholder="Start writing your response here..."
                  className="flex-1 w-full min-h-[400px] p-4 border rounded-lg text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  disabled={showResults}
                />

                {error && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 mt-auto">
                  <div className="text-sm text-muted-foreground">
                    Current: {wordCount} / {examData.prompt.wordCount || (examData.prompt.taskType === 'TASK_1' ? '150' : '250')} words
                  </div>
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting || showResults}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Exam'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
