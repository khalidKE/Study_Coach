import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Mock resources data (in real implementation, fetch from database)
    const mockResources = [
      {
        id: 1,
        name: "machine-learning-textbook.pdf",
        upload_date: "2024-01-15",
        topics_count: 3,
      },
      {
        id: 2,
        name: "data-structures-guide.pdf",
        upload_date: "2024-01-14",
        topics_count: 5,
      },
    ]

    return NextResponse.json({
      success: true,
      resources: mockResources,
    })
  } catch (error) {
    console.error("Resources fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch resources" }, { status: 500 })
  }
}
