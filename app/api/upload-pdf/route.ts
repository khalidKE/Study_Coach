import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { existsSync } from "fs"
import path from "path"
import { promises as fs } from "fs"

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
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  const dbPath = path.join(dir, "db.json")
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8")
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `${Date.now()}-${file.name}`
    const filepath = path.join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    // Persist resource metadata in JSON DB
    const db = await readDb()
    const list: any[] = Array.isArray(db.resources) ? db.resources : []
    const nextId = (list.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) || 0) + 1
    const upload_date = new Date().toISOString().slice(0, 10)
    const resource = { id: nextId, name: file.name, upload_date, topics_count: 0 }
    db.resources = [resource, ...list]
    await writeDb(db)

    return NextResponse.json({
      success: true,
      filename,
      filepath,
      originalName: file.name,
      size: file.size,
      resource,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
