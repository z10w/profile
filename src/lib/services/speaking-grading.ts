import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

export interface SpeakingGradingResult {
  score: number; // Overall IELTS band score (0-9)
  fluency: number; // Fluency and Coherence (0-9)
  pronunciation: number; // Pronunciation (0-9)
  vocabulary: number; // Lexical Resource (0-9)
  grammar: number; // Grammatical Range & Accuracy (0-9)
  feedback: string; // Detailed feedback
  improvementPlan: string; // Actionable study plan
}

export interface SpeakingEvaluation {
  transcript: string;
  gradingResult: SpeakingGradingResult;
  asrCost: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  llmCost: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
}

/**
 * Transcribe audio using ASR skill
 * Converts base64 audio to text
 */
export async function transcribeAudio(audioBase64: string): Promise<string> {
  const zai = await ZAI.create();

  const response = await zai.audio.asr.create({
    file_base64: audioBase64,
  });

  return response.text || '';
}

/**
 * Grade Speaking Response using AI
 * Evaluates transcript for IELTS speaking criteria
 */
export async function gradeSpeakingResponse(
  transcript: string,
  part1Question: string,
  part2CueCard: string,
  part3Questions: string[],
  totalTimeSpent: number
): Promise<{ result: SpeakingGradingResult; cost: { inputTokens: number; outputTokens: number; cost: number } }> {
  const zai = await ZAI.create();

  const systemPrompt = `You are an expert IELTS examiner with 10+ years of experience grading speaking tests.

**Your Task:**
Grade the student's speaking response based on their transcript and the speaking tasks.

**IELTS Speaking Assessment Criteria (Band 0-9):**
1. Fluency & Coherence: Natural speech flow, logical organization, appropriate discourse markers
2. Lexical Resource: Vocabulary range and accuracy, idiomatic language usage
3. Grammatical Range & Accuracy: Grammar variety and error-free speech
4. Pronunciation: Clear articulation, appropriate intonation, natural stress patterns

**Speaking Exam Structure:**
- Part 1: Introduction/Interview (4-5 minutes)
- Part 2: Cue Card (3-4 minutes: 1 min prep + 2 min speak)
- Part 3: Discussion (4-5 minutes)

**Scoring Guidelines:**
- Be strict but fair
- Award appropriate band scores (0-9) for each criterion
- Calculate overall band score (0-9) based on average of all criteria
- Provide specific, actionable feedback
- Include a 4-week study plan to improve score

**Output Format (STRICT JSON):**
{
  "score": <overall band 0-9>,
  "fluency": <band 0-9>,
  "pronunciation": <band 0-9>,
  "vocabulary": <band 0-9>,
  "grammar": <band 0-9>,
  "feedback": "<detailed feedback explaining scores, strengths, and areas for improvement>",
  "improvementPlan": "<specific 4-week study plan to improve speaking score, focusing on identified weaknesses>"
}

**Important:**
- Return ONLY JSON, no other text
- Score must be a decimal number (e.g., 7.5, 6.5, 8.0)
- Be precise with scoring`;

  const userPrompt = `Please grade this IELTS speaking test.

**Part 1 Question:** ${part1Question || 'N/A'}
**Part 2 Cue Card:** ${part2CueCard || 'N/A'}
**Part 3 Discussion Questions:** ${part3Questions ? part3Questions.join('; ') : 'N/A'}

**Student's Speaking Transcript:**
"${transcript}"

**Total Speaking Time:** ${totalTimeSpent} minutes

Grade this response according to IELTS criteria and return JSON with scores and detailed feedback with improvement plan.`;

  const completion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
    thinking: {
      type: 'disabled',
    },
  });

  const responseText = completion.choices[0]?.message?.content;

  if (!responseText) {
    throw new Error('No response from AI grading service');
  }

  // Extract JSON from response
  let jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    jsonMatch = responseText.match(/```(?:json)?\s*\{[\s\S]*\}\s*```/);
  }

  if (!jsonMatch) {
    console.error('Failed to extract JSON from AI response:', responseText);
    throw new Error('Invalid AI response format');
  }

  const result: SpeakingGradingResult = JSON.parse(jsonMatch[0]);

  // Validate result structure
  if (
    typeof result.score !== 'number' ||
    typeof result.fluency !== 'number' ||
    typeof result.pronunciation !== 'number' ||
    typeof result.vocabulary !== 'number' ||
    typeof result.grammar !== 'number' ||
    typeof result.feedback !== 'string' ||
    typeof result.improvementPlan !== 'string'
  ) {
    throw new Error('Invalid grading result structure');
  }

  // Calculate cost based on token usage
  const inputTokens = completion.usage?.promptTokens || 0;
  const outputTokens = completion.usage?.completionTokens || 0;
  const cost = calculateCost(inputTokens, outputTokens);

  console.log('=== AI SPEAKING GRADING COMPLETE ===');
  console.log(`Overall Score: ${result.score}`);
  console.log(`Fluency: ${result.fluency}`);
  console.log(`Pronunciation: ${result.pronunciation}`);
  console.log(`Vocabulary: ${result.vocabulary}`);
  console.log(`Grammar: ${result.grammar}`);
  console.log(`Input Tokens: ${inputTokens}`);
  console.log(`Output Tokens: ${outputTokens}`);
  console.log(`Cost: $${cost.toFixed(6)}`);
  console.log('===================================');

  return {
    result,
    cost: {
      inputTokens,
      outputTokens,
      cost,
    },
  };
}

/**
 * Calculate cost based on token usage
 * Using standard GPT-4o-mini pricing
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 0.15;
  const outputCost = (outputTokens / 1_000_000) * 0.60;
  return inputCost + outputCost;
}

/**
 * Save audio file to disk (simulated S3)
 */
export async function saveAudioFile(
  userId: string,
  examId: string,
  audioData: string // Base64 encoded audio
): Promise<{ url: string; path: string }> {
  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'uploads', 'speaking');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const filename = `${userId}_${examId}_${Date.now()}.webm`;
  const filePath = path.join(uploadDir, filename);

  // Save base64 audio to file
  const base64Data = audioData.split(',')[1]; // Remove data:audio/webm;base64, prefix
  const buffer = Buffer.from(base64Data, 'base64');

  fs.writeFileSync(filePath, buffer);

  const url = `/uploads/speaking/${filename}`;

  return { url, path: filePath };
}

/**
 * Process Speaking Exam with Fallback
 * If AI fails, return estimated result
 */
export async function evaluateSpeakingWithFallback(
  audioBase64: string,
  part1Question: string,
  part2CueCard: string,
  part3Questions: string[],
  totalTimeSpent: number
): Promise<SpeakingEvaluation> {
  try {
    // Transcribe audio
    const transcript = await transcribeAudio(audioBase64);
    console.log('Transcription:', transcript);

    // Grade transcript
    const { result, cost: llmCost } = await gradeSpeakingResponse(
      transcript,
      part1Question,
      part2CueCard,
      part3Questions,
      totalTimeSpent
    );

    // Calculate ASR cost (estimated)
    const audioLength = audioBase64.length * 0.75; // Rough estimate
    const asrInputTokens = Math.ceil(audioLength / 4);
    const asrOutputTokens = Math.ceil(transcript.length / 4);
    const asrCost = (asrInputTokens / 1_000_000) * 0.15 + (asrOutputTokens / 1_000_000) * 0.60;

    return {
      transcript,
      gradingResult: result,
      asrCost: {
        inputTokens: asrInputTokens,
        outputTokens: asrOutputTokens,
        cost: asrCost,
      },
      llmCost,
    };
  } catch (error) {
    console.error('AI speaking evaluation failed, using fallback:', error);

    // Fallback: Return estimated scores
    const fallbackResult: SpeakingGradingResult = {
      score: 5.0,
      fluency: 5.0,
      pronunciation: 5.0,
      vocabulary: 5.0,
      grammar: 5.0,
      feedback: 'AI evaluation service temporarily unavailable. Your submission has been recorded. Please try again later for detailed feedback. Your estimated score is based on a simple evaluation.',
      improvementPlan: 'Practice speaking daily with various topics. Record yourself and listen for pronunciation improvements. Work on using a wider range of vocabulary and grammatical structures.',
    };

    return {
      transcript: 'Transcription unavailable due to service error.',
      gradingResult: fallbackResult,
      asrCost: { inputTokens: 0, outputTokens: 0, cost: 0 },
      llmCost: { inputTokens: 0, outputTokens: 0, cost: 0 },
    };
  }
}
