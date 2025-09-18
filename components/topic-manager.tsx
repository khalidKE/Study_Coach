"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Brain, FileText, Loader2, CheckCircle, AlertCircle, Eye, Sparkles, ChevronRight } from "lucide-react"

interface TopicManagerProps {
  resources: any[]
}

interface Topic {
  id: number
  name: string
  content: string
  resource_id: number
}

export function TopicManager({ resources }: TopicManagerProps) {
  const [selectedResource, setSelectedResource] = useState<number | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [showTopicContent, setShowTopicContent] = useState(false)

  useEffect(() => {
    if (selectedResource) {
      fetchTopics(selectedResource)
    }
  }, [selectedResource])

  const fetchTopics = async (resourceId: number) => {
    try {
      const response = await fetch(`/api/topics?resourceId=${resourceId}`)
      const data = await response.json()
      if (data.success) {
        setTopics(data.topics)
      }
    } catch (error) {
      console.error("Failed to fetch topics:", error)
    }
  }

  const extractTopics = async () => {
    if (!selectedResource) return

    setIsExtracting(true)
    setExtractionProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExtractionProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 500)

      const response = await fetch("/api/extract-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: selectedResource }),
      })

      clearInterval(progressInterval)
      setExtractionProgress(100)

      if (!response.ok) {
        throw new Error("Topic extraction failed")
      }

      const data = await response.json()
      if (data.success) {
        setTopics(data.topics)
        setTimeout(() => {
          setIsExtracting(false)
          setExtractionProgress(0)
        }, 1000)
      }
    } catch (error) {
      console.error("Topic extraction error:", error)
      setIsExtracting(false)
      setExtractionProgress(0)
    }
  }

  const viewTopicContent = (topic: Topic) => {
    setSelectedTopic(topic)
    setShowTopicContent(true)
  }

  const selectedResourceData = resources.find((r) => r.id === selectedResource)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-balance mb-4">Manage Your Study Topics</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Extract and organize key topics from your uploaded materials using AI-powered analysis.
        </p>
      </div>

      {/* Resource Selection */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Select Study Material
          </CardTitle>
          <CardDescription>Choose a resource to extract topics from or view existing topics</CardDescription>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>No resources found. Please upload a PDF file first in the Upload tab.</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Select
                value={selectedResource?.toString()}
                onValueChange={(value) => setSelectedResource(Number.parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a study material..." />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((resource) => (
                    <SelectItem key={resource.id} value={resource.id.toString()}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{resource.name}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {resource.topics_count || 0} topics
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedResourceData && (
                <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{selectedResourceData.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Uploaded on {selectedResourceData.upload_date} • {selectedResourceData.topics_count || 0} topics
                        extracted
                      </p>
                    </div>
                    {topics.length === 0 && (
                      <Button onClick={extractTopics} disabled={isExtracting} className="glow-effect">
                        {isExtracting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Extract Topics
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {isExtracting && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Analyzing content with AI...</span>
                        <span>{extractionProgress}%</span>
                      </div>
                      <Progress value={extractionProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Topics List */}
      {topics.length > 0 && (
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Extracted Topics ({topics.length})
            </CardTitle>
            <CardDescription>AI-identified topics and concepts from your study material</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {topics.map((topic, index) => (
                <div
                  key={topic.id}
                  className="p-4 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-balance">{topic.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Topic ID: {topic.id} • Ready for quiz generation
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Extracted
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => viewTopicContent(topic)}>
                        <Eye className="w-4 h-4 mr-2" />
                        View Content
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {topics.length > 0 && (
              <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <h4 className="font-medium text-primary">Ready for Quiz Generation</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  All topics have been successfully extracted and are ready for personalized quiz creation.
                </p>
                <Button variant="outline" className="border-primary/30 hover:bg-primary/10 bg-transparent">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Go to Quiz Generation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Topic Content Modal */}
      {showTopicContent && selectedTopic && (
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  {selectedTopic.name}
                </CardTitle>
                <CardDescription>Topic content extracted by AI</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowTopicContent(false)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{selectedTopic.content}</pre>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button className="glow-effect">
                <Brain className="w-4 h-4 mr-2" />
                Generate Quiz from This Topic
              </Button>
              <Badge variant="secondary">Topic ID: {selectedTopic.id}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Topic Management Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI Topic Extraction
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Automatically identifies key concepts and chapters</li>
                <li>• Filters out non-educational content (TOC, references)</li>
                <li>• Organizes content into digestible learning segments</li>
                <li>• Preserves context and relationships between topics</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Next Steps
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Review extracted topics for accuracy</li>
                <li>• View topic content to understand scope</li>
                <li>• Generate targeted quizzes from specific topics</li>
                <li>• Create comprehensive tests from all topics</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
