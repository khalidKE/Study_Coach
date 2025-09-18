"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Brain, Upload, Target, Sparkles } from "lucide-react"
import { Dashboard } from "@/components/dashboard"
import { PDFUploadComponent } from "@/components/pdf-upload"
import { TopicManager } from "@/components/topic-manager"
import { QuizInterface } from "@/components/quiz-interface"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "upload" | "topics" | "quiz">("dashboard")
  const [resources, setResources] = useState<any[]>([])

  // Load resources on component mount
  useEffect(() => {
    fetchResources()
  }, [])

  const fetchResources = async () => {
    try {
      const response = await fetch("/api/resources")
      const data = await response.json()
      if (data.success) {
        setResources(data.resources)
      }
    } catch (error) {
      console.error("Failed to fetch resources:", error)
    }
  }

  const handleResourcesUpdate = (newResources: any[]) => {
    setResources(newResources)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 border border-primary/30">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">StudyCoach AI</h1>
                <p className="text-sm text-muted-foreground">Intelligent Study Assistant</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Powered
            </Badge>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6">
          <div className="flex items-center gap-2 py-4">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("dashboard")}
              className={activeTab === "dashboard" ? "bg-primary text-primary-foreground" : ""}
            >
              <Target className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === "upload" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("upload")}
              className={activeTab === "upload" ? "bg-primary text-primary-foreground" : ""}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF
            </Button>
            <Button
              variant={activeTab === "topics" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("topics")}
              className={activeTab === "topics" ? "bg-primary text-primary-foreground" : ""}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Manage Topics
            </Button>
            <Button
              variant={activeTab === "quiz" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("quiz")}
              className={activeTab === "quiz" ? "bg-primary text-primary-foreground" : ""}
            >
              <Brain className="w-4 h-4 mr-2" />
              Generate Quiz
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === "dashboard" && <Dashboard resources={resources} onNavigate={setActiveTab} />}
        {activeTab === "upload" && <PDFUploadComponent onResourcesUpdate={handleResourcesUpdate} />}
        {activeTab === "topics" && <TopicManager resources={resources} />}
        {activeTab === "quiz" && <QuizInterface resources={resources} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-6 mt-20">
        <div className="container mx-auto text-center">
          <p className="text-muted-foreground">Built with AI SDK and powered by GROQ • StudyCoach AI © 2024</p>
        </div>
      </footer>
    </div>
  )
}
