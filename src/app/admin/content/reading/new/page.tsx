'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'HEADING' | 'GAP_FILL';

interface Question {
  id: string;
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string | string[];
  explanation: string;
}

interface ReadingPassageForm {
  title: string;
  text: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  isPublished: boolean;
}

export default function ReadingPassageFormPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const isNew = params.passageId === 'new';

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [passage, setPassage] = useState<ReadingPassageForm>({
    title: '',
    text: '',
    level: 'B2',
    isPublished: false,
  });
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (!isNew && user?.role === 'ADMIN') {
      fetchPassage();
    }
  }, [isNew, user, params.passageId]);

  const fetchPassage = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await fetch(`/api/admin/content/reading/passages/${params.passageId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch passage');
      }

      const data = await response.json();
      setPassage({
        title: data.passage.title,
        text: data.passage.text,
        level: data.passage.level,
        isPublished: data.passage.isPublished,
      });

      // Convert questions from API format to form format
      const formattedQuestions = data.passage.questions.map((q: any) => ({
        id: q.id,
        type: q.type,
        questionText: q.questionText,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
      }));

      setQuestions(formattedQuestions);
    } catch (error) {
      console.error('Error fetching passage:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load passage',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'MCQ',
      questionText: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: '',
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setQuestions(updatedQuestions);
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!passage.title || !passage.text) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Title and text are required',
      });
      return;
    }

    setIsSaving(true);

    try {
      const accessToken = localStorage.getItem('accessToken');

      // Create or update passage
      const passagePayload = {
        title: passage.title,
        text: passage.text,
        level: passage.level,
        isPublished: passage.isPublished,
      };

      let passageData;
      if (isNew) {
        const passageResponse = await fetch('/api/admin/content/reading/passages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(passagePayload),
        });

        if (!passageResponse.ok) {
          throw new Error('Failed to create passage');
        }

        passageData = await passageResponse.json();
      } else {
        const passageResponse = await fetch(`/api/admin/content/reading/passages/${params.passageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(passagePayload),
        });

        if (!passageResponse.ok) {
          throw new Error('Failed to update passage');
        }

        passageData = await passageResponse.json();
      }

      const passageId = isNew ? passageData.passage.id : params.passageId;

      // Create/update questions
      for (const question of questions) {
        const questionPayload = {
          passageId,
          type: question.type,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          isPublished: passage.isPublished,
        };

        if (typeof question.id === 'string' && !question.id.startsWith('temp')) {
          // Update existing question
          await fetch(`/api/admin/content/reading/questions/${question.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(questionPayload),
          });
        } else {
          // Create new question
          await fetch('/api/admin/content/reading/questions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(questionPayload),
          });
        }
      }

      toast({
        title: 'Success',
        description: isNew ? 'Passage created successfully' : 'Passage updated successfully',
      });

      router.push('/admin/content');
    } catch (error) {
      console.error('Error saving passage:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save passage',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {isNew ? 'Add Reading Passage' : 'Edit Reading Passage'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Create or update reading content
              </p>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Passage Details */}
          <Card>
            <CardHeader>
              <CardTitle>Passage Details</CardTitle>
              <CardDescription>
                Enter the passage text and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={passage.title}
                  onChange={(e) => setPassage({ ...passage, title: e.target.value })}
                  placeholder="Enter passage title"
                />
              </div>

              <div>
                <Label htmlFor="level">CEFR Level *</Label>
                <Select
                  value={passage.level}
                  onValueChange={(value: any) => setPassage({ ...passage, level: value })}
                >
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A1">A1 - Beginner</SelectItem>
                    <SelectItem value="A2">A2 - Elementary</SelectItem>
                    <SelectItem value="B1">B1 - Intermediate</SelectItem>
                    <SelectItem value="B2">B2 - Upper Intermediate</SelectItem>
                    <SelectItem value="C1">C1 - Advanced</SelectItem>
                    <SelectItem value="C2">C2 - Proficiency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="text">Passage Text *</Label>
                <Textarea
                  id="text"
                  value={passage.text}
                  onChange={(e) => setPassage({ ...passage, text: e.target.value })}
                  placeholder="Enter the reading passage text..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={passage.isPublished}
                  onChange={(e) => setPassage({ ...passage, isPublished: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPublished" className="cursor-pointer">
                  Publish immediately
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>
                    Add questions for this passage
                  </CardDescription>
                </div>
                <Button onClick={addQuestion} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No questions added yet. Click "Add Question" to create your first question.
                </div>
              ) : (
                questions.map((question, index) => (
                  <Card key={question.id} className="border-2">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Label>Question #{index + 1}</Label>
                          <Select
                            value={question.type}
                            onValueChange={(value: QuestionType) =>
                              updateQuestion(index, 'type', value)
                            }
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                              <SelectItem value="TRUE_FALSE">True/False</SelectItem>
                              <SelectItem value="HEADING">Heading Match</SelectItem>
                              <SelectItem value="GAP_FILL">Gap Fill</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div>
                        <Label>Question Text *</Label>
                        <Textarea
                          value={question.questionText}
                          onChange={(e) =>
                            updateQuestion(index, 'questionText', e.target.value)
                          }
                          placeholder="Enter the question..."
                          rows={2}
                        />
                      </div>

                      {(question.type === 'MCQ' || question.type === 'GAP_FILL') && (
                        <div className="space-y-3">
                          <Label>Options *</Label>
                          {question.options.map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="text-sm font-medium w-6">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <Input
                                value={option}
                                onChange={(e) =>
                                  updateQuestionOption(index, optIndex, e.target.value)
                                }
                                placeholder={`Option ${optIndex + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <Label>Correct Answer *</Label>
                        <Input
                          value={
                            Array.isArray(question.correctAnswer)
                              ? question.correctAnswer.join(', ')
                              : String(question.correctAnswer)
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            // Determine if answer should be array based on type
                            if (question.type === 'TRUE_FALSE') {
                              updateQuestion(index, 'correctAnswer', value);
                            } else if (question.type === 'MCQ' || question.type === 'GAP_FILL') {
                              // For MCQ/GAP_FILL, support multiple correct answers separated by comma
                              const parts = value.split(',').map((p) => p.trim());
                              updateQuestion(
                                index,
                                'correctAnswer',
                                parts.length > 1 ? parts : parts[0]
                              );
                            } else {
                              // HEADING - array of correct headings
                              updateQuestion(index, 'correctAnswer', value);
                            }
                          }}
                          placeholder={
                            question.type === 'TRUE_FALSE'
                              ? 'true or false'
                              : question.type === 'HEADING'
                              ? 'Enter correct heading(s)'
                              : 'A, B, C, D or A,B for multiple'
                          }
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Format examples: "A", "A,B,C", "true", "Heading Text"
                        </p>
                      </div>

                      <div>
                        <Label>Explanation</Label>
                        <Textarea
                          value={question.explanation}
                          onChange={(e) =>
                            updateQuestion(index, 'explanation', e.target.value)
                          }
                          placeholder="Explain why this is the correct answer..."
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Passage
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
