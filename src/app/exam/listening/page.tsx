'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Clock, Play, Pause, Volume2, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANKS' | 'MAP_LABELING';

interface Question {
  id: string;
  type: QuestionType;
  timestamp?: number;
  questionText: string;
  options?: string[];
  explanation?: string;
}

interface ExamResult {
  questionId: string;
  userAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  explanation?: string;
}

interface ExamData {
  examId: string;
  type: 'LISTENING';
  audio: {
    id: string;
    url: string;
    duration: number;
  };
  questions: Question[];
  duration: number;
}

export default function ListeningExamPage() {
  const { user, refreshTokens } = useAuth();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [audioTime, setAudioTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ExamResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [hasAttemptedSeek, setHasAttemptedSeek] = useState(false);

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

  // Start exam
  useEffect(() => {
    if (!user) return;
    startExam();
  }, [user]);

  // Audio time update
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setAudioTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setHasAttemptedSeek(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [examData]);

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
          type: 'LISTENING',
          difficulty: 'MIXED',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start exam');
      }

      const data: ExamData = await response.json();
      setExamData(data);
      setTimeRemaining(data.duration * 60);
      setIsLoading(false);
    } catch (error) {
      console.error('Error starting exam:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start exam',
      });
      router.push('/dashboard');
    }
  };

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    if (!showResults) {
      // Warn user about seeking during exam
      if (!hasAttemptedSeek) {
        setHasAttemptedSeek(true);
        toast({
          title: 'Warning',
          description: 'Seeking during the exam may affect your timing. Try to listen only once.',
          variant: 'default',
        });
      }
    }

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (!examData) return;

    setIsSubmitting(true);

    // Stop audio
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }

    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          examId: examData.examId,
          answers,
          timeSpent: examData.duration * 60 - timeRemaining,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit exam');
      }

      const data = await response.json();
      setScore(data.score);
      setResults(data.subScores?.results || []);
      setShowResults(true);
      setTimeRemaining(0);

      await refreshTokens();

      toast({
        title: 'Exam Submitted',
        description: `Your score: ${data.score}`,
      });
    } catch (error) {
      console.error('Error submitting exam:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit exam',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
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

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-muted/20">
        <header className="border-b bg-background sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Listening Exam Results</h1>
              <Badge variant="outline" className="text-lg px-4 py-2">
                Score: {score?.toFixed(1)}
              </Badge>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <Card className="mb-6">
            <CardContent className="py-8 text-center">
              <div className="text-6xl font-bold mb-2">
                {score?.toFixed(1)}
              </div>
              <p className="text-muted-foreground text-lg">IELTS Band Score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
              <CardDescription>
                Review your answers with explanations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {examData.questions.map((question, index) => {
                const result = results.find((r) => r.questionId === question.id);
                const isCorrect = result?.isCorrect;

                return (
                  <div
                    key={question.id}
                    className={`p-6 rounded-lg border-2 ${
                      isCorrect
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        {isCorrect ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-2">
                          Question {index + 1}: {question.questionText}
                        </p>
                        {question.timestamp && (
                          <Badge variant="outline" className="mb-2">
                            Timestamp: {formatTime(question.timestamp)}
                          </Badge>
                        )}
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Your answer: </span>
                            <span className="font-medium">
                              {result?.userAnswer || 'Not answered'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Correct answer: </span>
                            <span className="font-medium text-green-700">
                              {Array.isArray(result?.correctAnswer)
                                ? result.correctAnswer.join(', ')
                                : String(result?.correctAnswer)}
                            </span>
                          </div>
                          {result?.explanation && (
                            <div className="mt-3 p-3 bg-white rounded border">
                              <p className="text-sm text-muted-foreground">
                                <strong>Explanation:</strong>{' '}
                                {result.explanation}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Transcript Toggle */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transcript</CardTitle>
                <Switch
                  checked={showTranscript}
                  onCheckedChange={setShowTranscript}
                />
              </div>
            </CardHeader>
            {showTranscript && (
              <CardContent>
                <p className="text-sm text-muted-foreground italic">
                  [Note: Review the transcript to understand your mistakes. In a real exam, 
                  transcripts are not available.]
                </p>
              </CardContent>
            )}
          </Card>

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
              onClick={() => router.push('/exam/listening')}
            >
              Try Another Listening Exam
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
              <h1 className="text-2xl font-bold">Listening Exam</h1>
              <p className="text-sm text-muted-foreground">
                Listen carefully and answer all questions
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
        {/* Audio Player */}
        <Card className="mb-6 sticky top-24 z-20">
          <CardHeader>
            <CardTitle>Audio</CardTitle>
            <CardDescription>
              Listen to the audio and answer the questions below
            </CardDescription>
          </CardHeader>
          <CardContent>
            {examData.audio.url ? (
              <>
                <audio
                  ref={audioRef}
                  src={examData.audio.url}
                  className="w-full mb-4"
                  onTimeUpdate={() => {
                    const audio = audioRef.current;
                    if (audio) {
                      setAudioTime(audio.currentTime);
                    }
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Custom Controls */}
                <div className="flex items-center gap-4">
                  <Button
                    size="lg"
                    onClick={togglePlayPause}
                    disabled={showResults}
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5 mr-2" />
                    ) : (
                      <Play className="h-5 w-5 mr-2" />
                    )}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>

                  <Volume2 className="h-5 w-5 text-muted-foreground" />

                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max={examData.audio.duration || 100}
                      value={audioTime}
                      onChange={(e) => handleSeek(Number(e.target.value))}
                      className="w-full"
                      disabled={showResults}
                    />
                  </div>

                  <Badge variant="outline">
                    {formatTime(audioTime)} / {formatTime(examData.audio.duration || 0)}
                  </Badge>
                </div>

                {hasAttemptedSeek && !showResults && (
                  <p className="text-sm text-orange-600 mt-3">
                    <span className="font-semibold">Tip:</span> Try to listen only once 
                    for a better exam experience.
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Audio file not available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Questions</CardTitle>
              <CardDescription>
                Answer all questions below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {examData.questions.map((question, index) => (
                <div key={question.id} className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-1">
                      Q{index + 1}
                    </Badge>
                    <div>
                      {question.timestamp && (
                        <Badge variant="outline" className="mb-2 mr-2">
                          {formatTime(question.timestamp)}
                        </Badge>
                      )}
                      <p className="font-medium">{question.questionText}</p>
                    </div>
                  </div>

                  {/* MCQ Question */}
                  {question.type === 'MCQ' && question.options && (
                    <RadioGroup
                      value={answers[question.id] || ''}
                      onValueChange={(value) =>
                        handleAnswerChange(question.id, value)
                      }
                    >
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={option}
                            id={`${question.id}-${optIndex}`}
                          >
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </RadioGroupItem>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {/* True/False Question */}
                  {question.type === 'TRUE_FALSE' && (
                    <RadioGroup
                      value={answers[question.id] || ''}
                      onValueChange={(value) =>
                        handleAnswerChange(question.id, value)
                      }
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id={`${question.id}-true`}>
                          True
                        </RadioGroupItem>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id={`${question.id}-false`}>
                          False
                        </RadioGroupItem>
                      </div>
                    </RadioGroup>
                  )}

                  {/* Fill Blanks Question */}
                  {question.type === 'FILL_BLANKS' && (
                    <div className="p-4 bg-muted rounded-lg">
                      {Array.isArray(question.options) &&
                        question.options.map((_, gapIndex) => (
                          <div key={gapIndex} className="mb-3">
                            <label className="text-sm mb-1 block font-medium">
                              Answer {gapIndex + 1}
                            </label>
                            <Input
                              value={
                                Array.isArray(answers[question.id])
                                  ? answers[question.id][gapIndex]
                                  : ''
                              }
                              onChange={(e) => {
                                const currentAnswers =
                                  Array.isArray(answers[question.id])
                                    ? [...answers[question.id]]
                                    : [];
                                currentAnswers[gapIndex] = e.target.value;
                                handleAnswerChange(question.id, currentAnswers);
                              }}
                              placeholder="Enter your answer..."
                            />
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Map Labeling Question */}
                  {question.type === 'MAP_LABELING' && question.options && (
                    <div className="space-y-2">
                      <RadioGroup
                        value={answers[question.id] || ''}
                        onValueChange={(value) =>
                          handleAnswerChange(question.id, value)
                        }
                      >
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <RadioGroupItem
                              value={option}
                              id={`${question.id}-${optIndex}`}
                            >
                              {String.fromCharCode(65 + optIndex)}. {option}
                            </RadioGroupItem>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                size="lg"
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting || Object.keys(answers).length === 0}
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
              <p className="text-sm text-muted-foreground text-center mt-3">
                Make sure you have answered all questions before submitting.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
