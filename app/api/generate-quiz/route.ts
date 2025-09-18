import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
  try {
    const { topicId, topicName, numQuestions } = await request.json()

    if (!topicId || !topicName || !numQuestions) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    if (numQuestions < 1 || numQuestions > 10) {
      return NextResponse.json({ error: "Number of questions must be between 1 and 10" }, { status: 400 })
    }

    // Mock topic content (in real implementation, fetch from database)
    const mockTopicContent = `
    Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience. Key concepts include supervised learning, unsupervised learning, reinforcement learning, neural networks, and deep learning.
    `

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `
        Create ${numQuestions} multiple-choice quiz questions based on this specific topic.
        
        Topic: ${topicName}
        
        For each question, ensure:
        - Questions test understanding, not just memorization
        - All 4 options are plausible
        - Only one option is clearly correct
        - Explanations are educational and helpful
        
        Return ONLY a JSON array with no additional text:
        [
            {
                "topic_name": "${topicName}",
                "question": "Question text here",
                "options": {"a": "Option A", "b": "Option B", "c": "Option C", "d": "Option D"},
                "correct": "a",
                "explanation": "Clear explanation of why this answer is correct"
            }
        ]
        
        Topic content:
        ${mockTopicContent}
      `,
    })

    let quizData
    try {
      quizData = JSON.parse(text)
    } catch {
      // Fallback mock quiz if AI parsing fails
      quizData = [
        {
          topic_name: topicName,
          question: "What is machine learning?",
          options: {
            a: "A subset of artificial intelligence",
            b: "A programming language",
            c: "A database system",
            d: "A web framework",
          },
          correct: "a",
          explanation:
            "Machine learning is indeed a subset of artificial intelligence that focuses on algorithms that can learn from data.",
        },
      ]
    }

    return NextResponse.json({
      success: true,
      quiz: quizData,
      message: `Generated ${quizData.length} questions for ${topicName}`,
    })
  } catch (error) {
    console.error("Quiz generation error:", error)
    return NextResponse.json({ error: "Quiz generation failed" }, { status: 500 })
  }
}
