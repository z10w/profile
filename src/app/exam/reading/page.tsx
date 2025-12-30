'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'HEADING' | 'GAP_FILL';

interface Question {
  id: string;
  type: QuestionType;
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
  type: 'READING';
  passage: {
    id: string;
    title: string;
    text: string;
    level: string;
  };
  questions: Question[];
  duration: number;
}

export default function ReadingExamPage() {
  const { user, refreshTokens } = useAuth();
  const router = useRouter();
  const passageRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<ExamResult[] | null>(null);
  const [score, setScore] = useState<number | null>(null);

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
          type: 'READING',
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

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    if (!examData) return;

    setIsSubmitting(true);

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

      // Refresh user data to update credits
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

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-muted/20">
        <header className="border-b bg-background sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Reading Exam Results</h1>
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
              onClick={() => router.push('/exam/reading')}
            >
              Try Another Reading Exam
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
              <h1 className="text-2xl font-bold">Reading Exam</h1>
              <p className="text-sm text-muted-foreground">
                {examData.passage.title} • Level: {examData.passage.level}
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
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Passage Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Reading Passage</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={passageRef}
                  className="prose max-w-none max-h-[calc(100vh-200px)] overflow-y-auto"
                >
                  {examData.passage.text.split('\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions Panel */}
          <div className="lg:col-span-1 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
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
                      <p className="font-medium">{question.questionText}</p>
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

                    {/* Gap Fill Question */}
                    {question.type === 'GAP_FILL' && (
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="mb-2 block">Fill in the gaps:</Label>
                        {Array.isArray(question.options) &&
                          question.options.map((_, gapIndex) => (
                            <div key={gapIndex} className="mb-3">
                              <Label
                                htmlFor={`${question.id}-gap-${gapIndex}`}
                                className="text-sm mb-1 block"
                              >
                                Gap {gapIndex + 1}
                              </Label>
                              <Input
                                id={`${question.id}-gap-${gapIndex}`}
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

                    {/* Heading Match Question */}
                    {question.type === 'HEADING' && question.options && (
                      <div className="space-y-2">
                        <Label className="mb-2 block">Select the correct heading:</Label>
                        <RadioGroup
                          value={answers[question.id] || ''}
                          onValueChange={(value) =>
                            handleAnswerChange(question.id, value)
                          }
                        >
                          {question.options.map((heading, headingIndex) => (
                            <div key={headingIndex} className="flex items-center space-x-2">
                              <RadioGroupItem
                                value={heading}
                                id={`${question.id}-${headingIndex}`}
                              >
                                {String.fromCharCode(65 + headingIndex)}. {heading}
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
        </div>
      </main>
    </div>
  );
}
