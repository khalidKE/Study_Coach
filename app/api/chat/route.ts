import { NextResponse, type NextRequest } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"

export async function POST(request: NextRequest) {
    try {
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json(
                { success: false, error: "Server missing GROQ_API_KEY. Please set it in .env.local and restart the dev server." },
                { status: 500 },
            )
        }

        const body = await request.json().catch(() => ({}))
        const prompt: string | undefined = body?.prompt
        const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> | undefined = body?.messages

        if (!prompt && (!messages || messages.length === 0)) {
            return NextResponse.json({ error: "Missing prompt or messages" }, { status: 400 })
        }

        // Build a single prompt from messages if provided
        const composed = prompt
            ? prompt
            : messages!
                .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
                .join("\n")

        const system = `You are StudyCoach AI, a helpful study assistant. You can chat casually, explain topics, and also create short quizzes on demand. When the user asks for a quiz, generate a few multiple-choice questions (A-D) and clearly mark the correct answer with an explanation. Keep answers concise and helpful.`

        const { text } = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            prompt: `${system}\n\nUSER INPUT:\n${composed}`,
        })

        return NextResponse.json({ success: true, reply: text })
    } catch (error) {
        console.error("Chat error:", error)
        return NextResponse.json({ error: "Chat failed" }, { status: 500 })
    }
}
