import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { groq } from "@ai-sdk/groq"
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
    const { resourceId } = await request.json()

    if (!resourceId) {
      return NextResponse.json({ error: "Missing resource ID" }, { status: 400 })
    }

    // Mock content for demo (in real implementation, fetch from database)
    const mockContent = `
    Chapter 1: Introduction to Machine Learning
    Machine learning is a subset of artificial intelligence...
    
    Chapter 2: Supervised Learning  
    Supervised learning is a type of machine learning...
    
    Chapter 3: Unsupervised Learning
    Unsupervised learning finds hidden patterns...
    `

    const { text } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      prompt: `
        Analyze this document and extract the main topics/chapters/sections. 
        
        IMPORTANT: IGNORE and SKIP any of these sections:
        - Table of Contents
        - Syllabus 
        - Index
        - References
        - Bibliography
        - Preface
        - Introduction pages
        - Course outline
        - Grading information
        
        Only extract actual subject matter topics/chapters with substantial educational content.
        
        For each topic, provide:
        - A clear, descriptive topic name
        - The full content for that topic
        
        Return ONLY a JSON array with no additional text:
        [
            {
                "topic_name": "Clear topic name here",
                "content": "Full topic content here"
            }
        ]
        
        Document content:
        ${mockContent}
      `,
    })

    let topics
    try {
      topics = JSON.parse(text)
    } catch {
      // Fallback mock topics if AI parsing fails
      topics = [
        {
          topic_name: "Introduction to Machine Learning",
          content:
            "Machine learning is a subset of artificial intelligence that focuses on the development of algorithms and statistical models...",
        },
        {
          topic_name: "Supervised Learning",
          content:
            "Supervised learning is a type of machine learning where the algorithm learns from labeled training data...",
        },
        {
          topic_name: "Unsupervised Learning",
          content: "Unsupervised learning finds hidden patterns in data without labeled examples...",
        },
      ]
    }

    // Persist to JSON DB
    const db = await readDb()
    const existing: any[] = Array.isArray(db.topics) ? db.topics : []
    const startId = (existing.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) || 0) + 1
    const topicsWithIds = topics.map((topic: any, index: number) => ({
      id: startId + index,
      name: topic.topic_name,
      content: topic.content,
      resource_id: Number(resourceId),
    }))
    db.topics = [...topicsWithIds, ...existing]
    // update resource topics_count
    if (Array.isArray(db.resources)) {
      db.resources = db.resources.map((r: any) =>
        Number(r.id) === Number(resourceId) ? { ...r, topics_count: (r.topics_count || 0) + topicsWithIds.length } : r,
      )
    }
    await writeDb(db)

    return NextResponse.json({
      success: true,
      topics: topicsWithIds.map(({ content, ...t }) => t),
      message: `Successfully extracted ${topics.length} topics from resource ${resourceId}`,
    })
  } catch (error) {
    console.error("Topic extraction error:", error)
    return NextResponse.json({ error: "Topic extraction failed" }, { status: 500 })
  }
}
