"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Brain, FileText, TrendingUp, Clock, Target, ChevronRight, Sparkles } from "lucide-react"

interface DashboardProps {
  resources: any[]
  onNavigate: (tab: "upload" | "topics" | "quiz") => void
}

export function Dashboard({ resources, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState({
    totalResources: 0,
    totalTopics: 0,
    totalQuizzes: 0,
    studyStreak: 7,
  })

  useEffect(() => {
    // Calculate stats from resources
    const totalTopics = resources.reduce((sum, resource) => sum + (resource.topics_count || 0), 0)
    setStats({
      totalResources: resources.length,
      totalTopics,
      totalQuizzes: Math.floor(totalTopics * 1.5), // Mock calculation
      studyStreak: 7,
    })
  }, [resources])

  const recentActivity = [
    {
      id: 1,
      type: "upload",
      title: "Uploaded Machine Learning Textbook",
      time: "2 hours ago",
      icon: FileText,
    },
    {
      id: 2,
      type: "topics",
      title: "Extracted 5 topics from Data Structures Guide",
      time: "1 day ago",
      icon: BookOpen,
    },
    {
      id: 3,
      type: "quiz",
      title: "Generated quiz for Neural Networks",
      time: "2 days ago",
      icon: Brain,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-balance mb-4">Welcome back to your Study Dashboard</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Track your learning progress and continue building your knowledge with AI-powered study tools.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalResources}</div>
            <p className="text-xs text-muted-foreground">PDF files uploaded</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topics</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTopics}</div>
            <p className="text-xs text-muted-foreground">Topics extracted</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground">Questions generated</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studyStreak}</div>
            <p className="text-xs text-muted-foreground">Days in a row</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card
          className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/70 transition-colors cursor-pointer group"
          onClick={() => onNavigate("upload")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-lg">Upload New PDF</CardTitle>
            <CardDescription>Add study materials and let AI extract key topics automatically</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/70 transition-colors cursor-pointer group"
          onClick={() => onNavigate("topics")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-lg">Manage Topics</CardTitle>
            <CardDescription>Review and organize extracted topics from your study materials</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="bg-card/50 border-border/50 backdrop-blur-sm hover:bg-card/70 transition-colors cursor-pointer group"
          onClick={() => onNavigate("quiz")}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <CardTitle className="text-lg">Generate Quiz</CardTitle>
            <CardDescription>Create personalized quizzes from any topic to test your knowledge</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Activity & Study Progress */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest study sessions and achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <activity.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Study Progress */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Study Progress
            </CardTitle>
            <CardDescription>Track your learning journey and goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Weekly Goal</span>
                <span className="text-muted-foreground">5/7 days</span>
              </div>
              <Progress value={71} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Topics Mastered</span>
                <span className="text-muted-foreground">12/20</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Quiz Accuracy</span>
                <span className="text-muted-foreground">85%</span>
              </div>
              <Progress value={85} className="h-2" />
            </div>

            <div className="pt-4 border-t border-border/50">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Sparkles className="w-3 h-3 mr-1" />
                Great Progress!
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
