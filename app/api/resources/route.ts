import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), "data", "db.json")
    let resources: any[] = []
    try {
      const raw = await fs.readFile(dbPath, "utf8")
      const json = JSON.parse(raw || "{}")
      resources = Array.isArray(json.resources) ? json.resources : []
    } catch {
      // no db yet -> empty
    }

    return NextResponse.json({ success: true, resources })
  } catch (error) {
    console.error("Resources fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 })
  }
}
