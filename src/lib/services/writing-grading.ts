import ZAI from 'z-ai-web-dev-sdk';

// AI Grading Service for IELTS Writing

export interface WritingGradingResult {
  score: number; // Overall IELTS band score (0-9)
  taskResponse: number; // Task Response score (0-9)
  coherence: number; // Coherence & Cohesion score (0-9)
  vocabulary: number; // Lexical Resource score (0-9)
  grammar: number; // Grammatical Range & Accuracy score (0-9)
  feedback: string; // Detailed feedback
  improvedAnswerExample: string; // Sample answer
}

export interface GradingCost {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * Grade IELTS Writing Task using AI
 * 
 * @param taskType - TASK_1 or TASK_2
 * @param prompt - The writing prompt/topic
 * @param userText - The user's written response
 * @param timeSpent - Time spent in minutes (optional)
 * @returns Grading result with IELTS band scores
 */
export async function gradeWritingEssay(
  taskType: 'TASK_1' | 'TASK_2',
  prompt: string,
  userText: string,
  timeSpent?: number
): Promise<{ result: WritingGradingResult; cost: GradingCost }> {
  try {
    const zai = await ZAI.create();

    // Build the grading prompt
    const systemPrompt = `You are an expert IELTS examiner with 10+ years of experience grading writing tests.

**Your Task:**
Grade the student's IELTS writing response according to official IELTS assessment criteria.

**IELTS Assessment Criteria (Band 0-9):**
1. Task Response (TR) - Did the student fully address all parts of the task?
2. Coherence & Cohesion (CC) - Is the writing well-organized with logical flow?
3. Lexical Resource (LR) - Is the vocabulary range and accuracy appropriate?
4. Grammatical Range & Accuracy (GRA) - Is the grammar varied and error-free?

**Scoring Guidelines:**
- Be strict but fair
- Award appropriate band scores (0-9 for each criterion)
- Calculate an overall band score (0-9) based on the average of all four criteria
- Provide specific, actionable feedback
- Include a model answer demonstrating band 8+ level

**Output Format (STRICT JSON):**
{
  "score": <overall band 0-9>,
  "taskResponse": <band 0-9>,
  "coherence": <band 0-9>,
  "vocabulary": <band 0-9>,
  "grammar": <band 0-9>,
  "feedback": "<detailed feedback explaining scores, strengths, and areas for improvement>",
  "improvedAnswerExample": "<model band 8+ answer for this task>"
}

**Important:**
- Return ONLY the JSON, no other text
- Score must be a decimal number (e.g., 7.5, 6.5, 8.0)
- Be precise with scoring`;

    const userPrompt = `Please grade this ${taskType} IELTS writing response.

**Writing Task:** ${prompt}

**Student Response:** 
${userText}

${timeSpent ? `**Time Spent:** ${timeSpent} minutes` : ''}

Grade this response according to IELTS criteria and return the JSON with scores and feedback.`;

    // Call AI for grading
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
      // Try to find JSON in markdown code blocks
      jsonMatch = responseText.match(/```(?:json)?\s*\{[\s\S]*\}\s*```/);
    }

    if (!jsonMatch) {
      console.error('Failed to extract JSON from AI response:', responseText);
      throw new Error('Invalid AI response format');
    }

    const result: WritingGradingResult = JSON.parse(jsonMatch[0]);

    // Validate the result structure
    if (
      typeof result.score !== 'number' ||
      typeof result.taskResponse !== 'number' ||
      typeof result.coherence !== 'number' ||
      typeof result.vocabulary !== 'number' ||
      typeof result.grammar !== 'number' ||
      typeof result.feedback !== 'string' ||
      typeof result.improvedAnswerExample !== 'string'
    ) {
      throw new Error('Invalid grading result structure');
    }

    // Calculate cost based on token usage
    const inputTokens = completion.usage?.promptTokens || 0;
    const outputTokens = completion.usage?.completionTokens || 0;
    const cost = calculateCost(inputTokens, outputTokens);

    console.log('=== AI GRADING COMPLETE ===');
    console.log(`Task: ${taskType}`);
    console.log(`Overall Score: ${result.score}`);
    console.log(`Task Response: ${result.taskResponse}`);
    console.log(`Coherence: ${result.coherence}`);
    console.log(`Vocabulary: ${result.vocabulary}`);
    console.log(`Grammar: ${result.grammar}`);
    console.log(`Input Tokens: ${inputTokens}`);
    console.log(`Output Tokens: ${outputTokens}`);
    console.log(`Cost: $${cost.toFixed(6)}`);
    console.log('========================');

    return {
      result,
      cost: {
        inputTokens,
        outputTokens,
        cost,
      },
    };
  } catch (error) {
    console.error('AI grading error:', error);
    throw new Error(
      `Failed to grade writing essay: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Calculate cost based on token usage
 * Using standard GPT-4o-mini pricing as reference:
 * - Input: $0.15 per 1M tokens
 * - Output: $0.60 per 1M tokens
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 0.15;
  const outputCost = (outputTokens / 1_000_000) * 0.60;
  return inputCost + outputCost;
}

/**
 * Grade Writing Essay with Default Fallback
 * If AI grading fails, return a default result
 */
export async function gradeWritingEssayWithFallback(
  taskType: 'TASK_1' | 'TASK_2',
  prompt: string,
  userText: string,
  timeSpent?: number
): Promise<{ result: WritingGradingResult; cost: GradingCost }> {
  try {
    return await gradeWritingEssay(taskType, prompt, userText, timeSpent);
  } catch (error) {
    console.error('AI grading failed, using fallback:', error);

    // Calculate approximate score based on text length
    const wordCount = userText.trim().split(/\s+/).length;
    let estimatedScore = 5.0;

    if (wordCount >= 150 && taskType === 'TASK_1') {
      estimatedScore = 6.0;
    } else if (wordCount >= 250 && taskType === 'TASK_2') {
      estimatedScore = 6.0;
    }

    if (wordCount >= 250 && taskType === 'TASK_1') {
      estimatedScore = 6.5;
    } else if (wordCount >= 300 && taskType === 'TASK_2') {
      estimatedScore = 6.5;
    }

    if (wordCount >= 300 && taskType === 'TASK_1') {
      estimatedScore = 7.0;
    } else if (wordCount >= 350 && taskType === 'TASK_2') {
      estimatedScore = 7.0;
    }

    const fallbackResult: WritingGradingResult = {
      score: estimatedScore,
      taskResponse: estimatedScore,
      coherence: estimatedScore,
      vocabulary: estimatedScore,
      grammar: estimatedScore,
      feedback: `Your response has ${wordCount} words. This ${wordCount >= (taskType === 'TASK_1' ? 150 : 250) ? 'meets' : 'falls below'} the minimum word count requirements. Practice writing longer, more detailed responses to improve your score.`,
      improvedAnswerExample: 'AI grading service temporarily unavailable. Please try again later.',
    };

    return {
      result: fallbackResult,
      cost: {
        inputTokens: 0,
        outputTokens: 0,
        cost: 0,
      },
    };
  }
}
