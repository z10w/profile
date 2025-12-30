'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Mic, MicOff, Play, Pause, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SpeakingQuestion {
  part: number;
  cueCardText: string;
  prepTime: number;
  recordingTime: number;
  followUpQuestions?: string[];
}

interface ExamData {
  examId: string;
  type: 'SPEAKING';
  questions: SpeakingQuestion[];
  duration: number;
}

interface RecordingState {
  isRecording: boolean;
  audioUrl: string;
  duration: number;
}

export default function SpeakingExamPage() {
  const { user, refreshTokens } = useAuth();
  const router = useRouter();

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [part1Time, setPart1Time] = useState<number>(0); // prep + speak in seconds
  const [part2Time, setPart2Time] = useState<number>(0);
  const [part3Time, setPart3Time] = useState<number>(0);
  const [recordings, setRecordings] = useState<Record<string, RecordingState>>({
    part1: { isRecording: false, audioUrl: '', duration: 0 },
    part2: { isRecording: false, audioUrl: '', duration: 0 },
    part3: { isRecording: false, audioUrl: '', duration: 0 },
  });
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingPart, setCurrentPlayingPart] = useState<'part1' | 'part2' | 'part3' | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);

  // Questions
  const part1 = examData?.questions[0];
  const part2 = examData?.questions[1];
  const part3 = examData?.questions[2];

  // Start exam
  useEffect(() => {
    if (!user) return;
    startExam();
  }, [user]);

  // Timer for current part
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentPart === 1 && part1Time > 0) {
        setPart1Time((prev) => {
          if (prev <= 1) {
            // Transition to next part or finish
            if (part1 && recordings.part1.audioUrl) {
              setCurrentPart(2);
              return part2?.prepTime + part2?.recordingTime || 0;
            } else {
              return 0;
            }
          }
          return prev - 1;
        });
      } else if (currentPart === 2 && part2Time > 0) {
        setPart2Time((prev) => {
          if (prev <= 1) {
            if (part2 && recordings.part2.audioUrl) {
              setCurrentPart(3);
              return part3?.prepTime + part3?.recordingTime || 0;
            } else {
              return 0;
            }
          }
          return prev - 1;
        });
      } else if (currentPart === 3 && part3Time > 0) {
        setPart3Time((prev) => {
          if (prev <= 1) {
            // Finish exam
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPart, showResults]);

  // Audio progress update
  useEffect(() => {
    if (currentPlayingPart && isPlaying) {
      const audio = document.getElementById(`audio-${currentPlayingPart}`) as HTMLAudioElement;
      if (audio) {
        const handleTimeUpdate = () => {
          setAudioProgress((audio.currentTime / audio.duration) * 100);
        };
        audio.addEventListener('timeupdate', handleTimeUpdate);
        return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [currentPlayingPart, isPlaying]);

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
          type: 'SPEAKING',
          difficulty: 'MIXED',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start exam');
      }

      const data: ExamData = await response.json();
      setExamData(data);
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

  const startRecording = async (part: 'part1' | 'part2' | 'part3') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = mediaRecorderRef.current ? mediaRecorderRef.current.durationMs / 1000 : 0;

        setRecordings((prev) => ({
          ...prev,
          [part]: {
            isRecording: false,
            audioUrl,
            duration,
          },
        }));

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();

      setRecordings((prev) => ({
        ...prev,
        [part]: {
          ...prev[part],
          isRecording: true,
        },
      }));
    } catch (err) {
      console.error('Error starting recording:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to start recording. Please check microphone permissions.',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleNextPart = () => {
    const currentRecording = recordings[currentPart as 'part1' | 'part2' | 'part3'];
    
    if (!currentRecording || !currentRecording.audioUrl) {
      toast({
        variant: 'destructive',
        title: 'Recording Required',
        description: 'Please complete your recording before proceeding.',
      });
      return;
    }

    switch (currentPart) {
      case 1:
        setCurrentPart(2);
        setPart2Time(part2?.prepTime + part2?.recordingTime || 0);
        break;
      case 2:
        setCurrentPart(3);
        setPart3Time(part3?.prepTime + part3?.recordingTime || 0);
        break;
      case 3:
        // Will submit automatically
        break;
    }
  };

  const handleSubmit = async () => {
    if (!examData) return;

    // Check if all recordings are complete
    const part1Complete = !!recordings.part1.audioUrl;
    const part2Complete = !!recordings.part2.audioUrl;
    const part3Complete = !!recordings.part3.audioUrl;

    if (!part1Complete && !part2Complete && !part3Complete) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Recordings',
        description: 'Please complete all three parts before submitting.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = localStorage.getItem('accessToken');
      
      // Convert audio URLs to base64 for API
      const part1Base64 = recordings.part1.audioUrl ? await audioUrlToBase64(recordings.part1.audioUrl) : '';
      const part2Base64 = recordings.part2.audioUrl ? await audioUrlToBase64(recordings.part2.audioUrl) : '';
      const part3Base64 = recordings.part3.audioUrl ? await audioUrlToBase64(recordings.part3.audioUrl) : '';

      const response = await fetch('/api/exam/speaking/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          examId: examData.examId,
          part1Audio: part1Base64,
          part2Audio: part2Base64,
          part3Audio: part3Base64,
          timeSpent: part1Time + part2Time + part3Time,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit exam');
      }

      const data = await response.json();
      setResult(data);
      setShowResults(true);

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

  const audioUrlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayback = (part: 'part1' | 'part2' | 'part3') => {
    const audio = document.getElementById(`audio-${part}`) as HTMLAudioElement;
    if (audio) {
      if (currentPlayingPart === part && isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setCurrentPlayingPart(null);
        setAudioProgress(0);
      } else {
        audio.currentTime = 0;
        audio.play();
        setIsPlaying(true);
        setCurrentPlayingPart(part);
      }
    }
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
              <h1 className="text-2xl font-bold">Speaking Exam Results</h1>
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
              <CardDescription>Your performance across IELTS speaking criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Fluency & Coherence</span>
                  <Badge variant="outline">
                    {result.subScores?.fluency?.toFixed(1)}
                  </Badge>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${((result.subScores?.fluency || 0) / 9) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Pronunciation</span>
                  <Badge variant="outline">
                    {result.subScores?.pronunciation?.toFixed(1)}
                  </Badge>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-500"
                    style={{ width: `${((result.subScores?.pronunciation || 0) / 9) * 100}%` }}
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

          {/* Transcript */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Speaking Transcript</CardTitle>
              <CardDescription>AI-transcribed text of your responses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                {result.subScores?.transcript || 'Transcription not available'}
              </div>
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>Detailed analysis and improvement plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap">
                {result.feedback}
              </div>
            </CardContent>
          </Card>

          {/* 4-Week Improvement Plan */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>4-Week Improvement Plan</CardTitle>
              <CardDescription>Study recommendations based on your performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none whitespace-pre-wrap">
                {result.improvementPlan}
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
              onClick={() => router.push('/exam/speaking')}
            >
              Try Another Speaking Exam
            </Button>
          </div>
        </main>
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
              <h1 className="text-2xl font-bold">Speaking Exam</h1>
              <p className="text-sm text-muted-foreground">
                Part {currentPart} of 3
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatTime(
                  currentPart === 1 ? part1Time :
                  currentPart === 2 ? part2Time :
                  part3Time
                )}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Part 1: Introduction */}
        {part1 && currentPart === 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Part 1: Introduction</CardTitle>
              <CardDescription>
                4-5 minutes - Introduction & Interview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">{part1.cueCardText}</h3>
                <p className="text-sm text-muted-foreground">
                  The examiner will ask you general questions about yourself, your home, work, studies, hobbies, etc.
                </p>
              </div>

              <div className="flex items-center gap-6">
                {recordings.part1.isRecording ? (
                  <div className="flex items-center gap-2 text-red-600 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="font-medium">Recording...</span>
                  </div>
                ) : recordings.part1.audioUrl ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Recording Complete</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Ready to record
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    if (recordings.part1.isRecording) {
                      stopRecording();
                    } else {
                      startRecording('part1');
                    }
                  }}
                  disabled={recordings.part1.audioUrl || isSubmitting || showResults}
                  className="flex-1"
                >
                  {recordings.part1.isRecording ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Part 2: Cue Card */}
        {part2 && currentPart === 2 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Part 2: Cue Card</CardTitle>
              <CardDescription>
                3-4 minutes - Long Turn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Cue Card Topic:</h3>
                <p className="text-lg leading-relaxed">{part2.cueCardText}</p>
              </div>

              <div className="flex items-center gap-6">
                {recordings.part2.isRecording ? (
                  <div className="flex items-center gap-2 text-red-600 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="font-medium">Recording...</span>
                  </div>
                ) : recordings.part2.audioUrl ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Recording Complete</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Ready to record
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    if (recordings.part2.isRecording) {
                      stopRecording();
                    } else {
                      startRecording('part2');
                    }
                  }}
                  disabled={recordings.part2.audioUrl || isSubmitting || showResults}
                  className="flex-1"
                >
                  {recordings.part2.isRecording ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Part 3: Discussion */}
        {part3 && currentPart === 3 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Part 3: Discussion</CardTitle>
              <CardDescription>
                4-5 minutes - Two-way Discussion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Discussion Topics:</h3>
                <div className="space-y-2">
                  <ul className="list-disc list-inside space-y-2 text-base">
                    {part3.followUpQuestions?.map((question, index) => (
                      <li key={index}>{question}</li>
                    )) || (
                      <li>The examiner will ask follow-up questions related to your cue card topic.</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {recordings.part3.isRecording ? (
                  <div className="flex items-center gap-2 text-red-600 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-red-600" />
                    <span className="font-medium">Recording...</span>
                  </div>
                ) : recordings.part3.audioUrl ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Recording Complete</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    Ready to record
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    if (recordings.part3.isRecording) {
                      stopRecording();
                    } else {
                      startRecording('part3');
                    }
                  }}
                  disabled={recordings.part3.audioUrl || isSubmitting || showResults}
                  className="flex-1"
                >
                  {recordings.part3.isRecording ? (
                    <>
                      <MicOff className="mr-2 h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        {currentPart === 3 && (
          <Card>
            <CardContent className="pt-6">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={
                  !recordings.part1.audioUrl ||
                  !recordings.part2.audioUrl ||
                  !recordings.part3.audioUrl ||
                  isSubmitting
                }
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Exam...
                  </>
                ) : (
                  'Submit Speaking Exam'
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center mt-3">
                Complete all three parts before submitting.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Completed Parts Summary */}
        {currentPart > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`flex items-center gap-3 ${currentPart === 1 ? 'opacity-50' : ''}`}>
                  <div className={`w-3 h-3 rounded-full ${recordings.part1.audioUrl ? 'bg-green-500' : 'bg-muted'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Part 1: Introduction</p>
                    {recordings.part1.audioUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlayback('part1')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${currentPart === 2 ? 'opacity-50' : ''}`}>
                  <div className={`w-3 h-3 rounded-full ${recordings.part2.audioUrl ? 'bg-green-500' : 'bg-muted'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Part 2: Cue Card</p>
                    {recordings.part2.audioUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlayback('part2')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className={`flex items-center gap-3 ${currentPart === 3 ? 'opacity-50' : ''}`}>
                  <div className={`w-3 h-3 rounded-full ${recordings.part3.audioUrl ? 'bg-green-500' : 'bg-muted'}`} />
                  <div className="flex-1">
                    <p className="font-medium">Part 3: Discussion</p>
                    {recordings.part3.audioUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePlayback('part3')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
