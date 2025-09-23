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

        const { goals, timeframeWeeks, weeklyHours, topics } = await request.json()

        if (!goals || !timeframeWeeks || !weeklyHours) {
            return NextResponse.json({ error: "Missing goals, timeframeWeeks, or weeklyHours" }, { status: 400 })
        }

        const system = `You are StudyCoach AI. Create a realistic, efficient study plan based on user's goals, timeframe, and available hours per week. Use spaced repetition, interleaving, and active recall. Provide:\n- High-level summary\n- Weekly breakdown with topics and hours\n- Daily or session-level suggestions\n- Checkpoints and self-assessment ideas\n- Tips to stay consistent. Keep output concise and skimmable.`

        const { text } = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            prompt: `${system}\n\nINPUT:\nGoals: ${goals}\nTimeframe (weeks): ${timeframeWeeks}\nHours/week: ${weeklyHours}\nFocus topics: ${Array.isArray(topics) ? topics.join(", ") : topics ?? "(not specified)"}`,
        })

        return NextResponse.json({ success: true, plan: text })
    } catch (error) {
        console.error("Generate study plan error:", error)
        return NextResponse.json(
            {
                success: true,
                plan:
                    "Study plan generation is temporarily unavailable. Start with 3-5 sessions/week, 60-90 minutes each. Alternate topics, include recall practice, and schedule a weekly review with a short quiz.",
            },
            { status: 200 },
        )
    }
}
