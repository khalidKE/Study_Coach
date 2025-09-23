import { type NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get("resourceId")

    if (!resourceId) {
      return NextResponse.json({ error: "Missing resource ID" }, { status: 400 })
    }

    const dbPath = path.join(process.cwd(), "data", "db.json")
    let topics: any[] = []
    try {
      const raw = await fs.readFile(dbPath, "utf8")
      const json = JSON.parse(raw || "{}")
      const all = Array.isArray(json.topics) ? json.topics : []
      topics = all.filter((t: any) => Number(t.resource_id) === Number(resourceId))
    } catch {
      topics = []
    }

    return NextResponse.json({ success: true, topics })
  } catch (error) {
    console.error("Topics fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 })
  }
}
