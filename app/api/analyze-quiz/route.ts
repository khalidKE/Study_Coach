import { NextResponse, type NextRequest } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
    try {
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Server missing GROQ_API_KEY. Please set it in .env.local",
                },
                { status: 500 },
            )
        }

        const body = await request.json().catch(() => ({}))
        const quiz = body?.quiz as Array<{
            topic_name: string
            question: string
            options: { a: string; b: string; c: string; d: string }
            correct: "a" | "b" | "c" | "d"
            explanation: string
        }>
        const answers = body?.answers as Record<number, "a" | "b" | "c" | "d">

        if (!quiz || !Array.isArray(quiz) || quiz.length === 0) {
            return NextResponse.json({ error: "Missing quiz data" }, { status: 400 })
        }

        if (!answers || typeof answers !== "object") {
            return NextResponse.json({ error: "Missing answers data" }, { status: 400 })
        }

        const summary = quiz
            .map((q, idx) => {
                const user = answers[idx]
                return `Q${idx + 1}: ${q.question}\nUser: ${user?.toUpperCase()} - ${user ? q.options[user] : "(no answer)"}\nCorrect: ${q.correct.toUpperCase()} - ${q.options[q.correct]}\nExplain: ${q.explanation}`
            })
            .join("\n\n")

        const system = `You are StudyCoach AI, an expert tutor. Analyze the student's quiz performance and provide:
- Overall score and quick summary
- Strengths (what they know)
- Weak areas (with brief explanations)
- 3-5 targeted, actionable study suggestions
- Optional: short practice tips or memory aids
Keep it concise and motivating.`

        const { text } = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            prompt: `${system}\n\nQUIZ REVIEW INPUT:\n${summary}`,
        })

        return NextResponse.json({ success: true, analysis: text })
    } catch (error) {
        console.error("Analyze quiz error:", error)

        // Minimal fallback if model fails
        return NextResponse.json(
            {
                success: true,
                analysis:
                    "I couldn't reach the AI model right now. Based on your responses, review questions you missed and revisit those topics. Practice with similar questions focusing on concepts behind the correct answers.",
            },
            { status: 200 },
        )
    }
}
