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
        const resourceId = searchParams.get("resourceId")
        const db = await readDb()
        const quizzes: any[] = Array.isArray(db.quizzes) ? db.quizzes : []
        const filtered = resourceId ? quizzes.filter((q) => String(q.resource_id) === resourceId) : quizzes
        return NextResponse.json({ success: true, quizzes: filtered })
    } catch (e) {
        return NextResponse.json({ error: "Failed to list quizzes" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { resource_id, topic_id, topic_name, items } = body || {}
        if (!topic_name || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "Missing topic_name or items" }, { status: 400 })
        }
        const db = await readDb()
        const quizzes: any[] = Array.isArray(db.quizzes) ? db.quizzes : []
        const nextId = (quizzes.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) || 0) + 1
        const created_at = new Date().toISOString()
        const quiz = { id: nextId, resource_id: resource_id ?? null, topic_id: topic_id ?? null, topic_name, items, created_at }
        db.quizzes = [quiz, ...quizzes]
        await writeDb(db)
        return NextResponse.json({ success: true, quiz })
    } catch (e) {
        return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 })
    }
}
