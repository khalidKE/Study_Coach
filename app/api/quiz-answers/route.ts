import { NextResponse, type NextRequest } from "next/server"
import path from "path"
import { promises as fs } from "fs"
import { mkdir } from "fs/promises"
import { existsSync } from "fs"

async function readDb() {
    const dbPath = path.join(process.cwd(), "data", "db.json")
    try {
        const raw = await fs.readFile(dbPath, "utf8")
        return JSON.parse(raw || "{}")
    } catch {
        return {}
    }
}

async function writeDb(data: any) {
    const dir = path.join(process.cwd(), "data")
    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    const dbPath = path.join(dir, "db.json")
    await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8")
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const quizId = searchParams.get("quizId")
        const db = await readDb()
        const all: any[] = Array.isArray(db.quiz_answers) ? db.quiz_answers : []
        const filtered = quizId ? all.filter((a) => String(a.quiz_id) === quizId) : all
        return NextResponse.json({ success: true, answers: filtered })
    } catch (e) {
        return NextResponse.json({ error: "Failed to list quiz answers" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { quiz_id, topic_name, items, answers, score_percent } = body || {}
        if (!Array.isArray(items) || !answers) {
            return NextResponse.json({ error: "Missing items or answers" }, { status: 400 })
        }
        const db = await readDb()
        const all: any[] = Array.isArray(db.quiz_answers) ? db.quiz_answers : []
        const nextId = (all.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) || 0) + 1
        const created_at = new Date().toISOString()
        const row = { id: nextId, quiz_id: quiz_id ?? null, topic_name: topic_name ?? null, items, answers, score_percent: Number(score_percent) || 0, created_at }
        db.quiz_answers = [row, ...all]
        await writeDb(db)
        return NextResponse.json({ success: true, result: row })
    } catch (e) {
        return NextResponse.json({ error: "Failed to save quiz answers" }, { status: 500 })
    }
}
