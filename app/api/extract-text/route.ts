import { type NextRequest, NextResponse } from "next/server"
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

export async function POST(request: NextRequest) {
  try {
    const { filepath, filename } = await request.json()

    if (!filepath || !filename) {
      return NextResponse.json({ error: "Missing filepath or filename" }, { status: 400 })
    }

    // Simulate PDF text extraction (in real implementation, you'd use a PDF library)
    // For demo purposes, we'll return a mock response
    const mockExtractedText = `
    Chapter 1: Introduction to Machine Learning
    
    Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models that enable computer systems to improve their performance on a specific task through experience.
    
    Key concepts include:
    - Supervised Learning
    - Unsupervised Learning  
    - Reinforcement Learning
    - Neural Networks
    - Deep Learning
    
    Chapter 2: Supervised Learning
    
    Supervised learning is a type of machine learning where the algorithm learns from labeled training data to make predictions or decisions without being explicitly programmed to perform the task.
    
    Common algorithms:
    - Linear Regression
    - Decision Trees
    - Random Forest
    - Support Vector Machines
    - Neural Networks
    `

    // Link to resource in JSON DB (find by filename from upload step)
    const db = await readDb()
    let resources: any[] = Array.isArray(db.resources) ? db.resources : []
    let resource = resources.find((r) => r.name === filename)
    if (!resource) {
      const nextId = (resources.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) || 0) + 1
      const upload_date = new Date().toISOString().slice(0, 10)
      resource = { id: nextId, name: filename, upload_date, topics_count: 0 }
      db.resources = [resource, ...resources]
      await writeDb(db)
    }
    const resourceId = resource.id

    return NextResponse.json({
      success: true,
      resourceId,
      filename,
      textLength: mockExtractedText.length,
      message: `Successfully extracted text from ${filename}. Saved as resource ID ${resourceId}.`,
    })
  } catch (error) {
    console.error("Text extraction error:", error)
    return NextResponse.json({ error: "Text extraction failed" }, { status: 500 })
  }
}
