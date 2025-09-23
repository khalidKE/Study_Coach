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
        const sessionId = searchParams.get("sessionId")
        if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 })
        const db = await readDb()
        const chats: any[] = Array.isArray(db.chats) ? db.chats : []
        const found = chats.find((c) => c.session_id === sessionId)
        return NextResponse.json({ success: true, messages: found?.messages || [] })
    } catch (e) {
        return NextResponse.json({ error: "Failed to load chat" }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { sessionId, messages } = body || {}
        if (!sessionId || !Array.isArray(messages)) {
            return NextResponse.json({ error: "Missing sessionId or messages" }, { status: 400 })
        }
        const db = await readDb()
        const chats: any[] = Array.isArray(db.chats) ? db.chats : []
        const idx = chats.findIndex((c) => c.session_id === sessionId)
        const updated = { session_id: sessionId, messages, updated_at: new Date().toISOString() }
        if (idx >= 0) chats[idx] = updated
        else chats.unshift(updated)
        db.chats = chats
        await writeDb(db)
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: "Failed to save chat" }, { status: 500 })
    }
}
