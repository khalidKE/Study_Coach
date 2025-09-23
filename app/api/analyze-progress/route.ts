import { NextResponse, type NextRequest } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
    try {
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { success: false, error: "Server missing GROQ_API_KEY. Please set it in .env.local" },
                { status: 500 },
            )
        }

        const body = await request.json().catch(() => ({}))
        const recentQuizzes = (body?.recentQuizzes ?? []) as Array<{
            topic: string
            scorePercent: number
            date?: string
            weakAreas?: string[]
        }>
        const activity = (body?.activity ?? {}) as {
            studyDaysThisWeek?: number
            totalTopics?: number
            totalQuizzes?: number
            notes?: string
        }

        const lines: string[] = []
        if (recentQuizzes.length > 0) {
            lines.push("Recent quiz performance:")
            for (const q of recentQuizzes.slice(0, 10)) {
                lines.push(`- ${q.topic}: ${q.scorePercent}%${q.date ? ` (${q.date})` : ""}${q.weakAreas?.length ? ` | weak: ${q.weakAreas.join(", ")}` : ""}`)
            }
        }
        lines.push(
            `Activity: studyDays=${activity.studyDaysThisWeek ?? "?"}, topics=${activity.totalTopics ?? "?"}, quizzes=${activity.totalQuizzes ?? "?"}`,
        )
        if (activity.notes) lines.push(`Notes: ${activity.notes}`)

        const system = `You are StudyCoach AI. Analyze the student's overall progress concisely. Provide:\n- A 2-3 sentence overview\n- Key strengths\n- Weak areas and probable causes\n- 3-5 concrete next steps (SMART and time-bound if possible)`

        const { text } = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            prompt: `${system}\n\nINPUT:\n${lines.join("\n")}`,
        })

        return NextResponse.json({ success: true, analysis: text })
    } catch (error) {
        console.error("Analyze progress error:", error)
        return NextResponse.json(
            {
                success: true,
                analysis:
                    "Progress analysis is temporarily unavailable. Continue consistent daily study, review weak topics, and schedule spaced practice sessions.",
            },
            { status: 200 },
        )
    }
}
