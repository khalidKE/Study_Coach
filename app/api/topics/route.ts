import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const resourceId = searchParams.get("resourceId")

    if (!resourceId) {
      return NextResponse.json({ error: "Missing resource ID" }, { status: 400 })
    }

    // Mock topics data (in real implementation, fetch from database)
    const mockTopics = [
      {
        id: 1,
        name: "Introduction to Machine Learning",
        resource_id: Number.parseInt(resourceId),
      },
      {
        id: 2,
        name: "Supervised Learning",
        resource_id: Number.parseInt(resourceId),
      },
      {
        id: 3,
        name: "Unsupervised Learning",
        resource_id: Number.parseInt(resourceId),
      },
    ]

    return NextResponse.json({
      success: true,
      topics: mockTopics,
    })
  } catch (error) {
    console.error("Topics fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch topics" }, { status: 500 })
  }
}
