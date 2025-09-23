"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Brain,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Target,
  Sparkles,
  RotateCcw,
  ChevronRight,
  Lightbulb,
} from "lucide-react"

interface QuizInterfaceProps {
  resources: any[]
}

interface Topic {
  id: number
  name: string
  resource_id: number
}

interface QuizQuestion {
  topic_name: string
  question: string
  options: {
    a: string
    b: string
    c: string
    d: string
  }
  correct: string
  explanation: string
}

interface QuizResult {
  questionIndex: number
  selectedAnswer: string
  isCorrect: boolean
}

export function QuizInterface({ resources }: QuizInterfaceProps) {
  const [selectedResource, setSelectedResource] = useState<number | null>(null)
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null)
  const [numQuestions, setNumQuestions] = useState<number>(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [quiz, setQuiz] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([])
  const [showResults, setShowResults] = useState(false)
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [quizMode, setQuizMode] = useState<"setup" | "taking" | "results">("setup")
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisText, setAnalysisText] = useState("")

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

  const generateQuiz = async () => {
    if (!selectedTopic || !numQuestions) return

    setIsGenerating(true)
    setGenerationProgress(0)
    setQuizMode("setup")

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 15
        })
      }, 300)

      const selectedTopicData = topics.find((t) => t.id === selectedTopic)

      const response = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId: selectedTopic,
          topicName: selectedTopicData?.name,
          numQuestions,
        }),
      })

      clearInterval(progressInterval)
      setGenerationProgress(100)

      if (!response.ok) {
        throw new Error("Quiz generation failed")
      }

      const data = await response.json()
      if (data.success) {
        setQuiz(data.quiz)
        setSelectedAnswers(new Array(data.quiz.length).fill(""))
        setCurrentQuestionIndex(0)
        setTimeout(() => {
          setIsGenerating(false)
          setGenerationProgress(0)
          setQuizMode("taking")
        }, 1000)
      }
    } catch (error) {
      console.error("Quiz generation error:", error)
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const handleAnswerSelect = (answer: string) => {
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answer
    setSelectedAnswers(newAnswers)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const submitQuiz = () => {
    const results: QuizResult[] = quiz.map((question, index) => ({
      questionIndex: index,
      selectedAnswer: selectedAnswers[index],
      isCorrect: selectedAnswers[index] === question.correct,
    }))

    setQuizResults(results)
    setQuizMode("results")
  }

  const resetQuiz = () => {
    setQuiz([])
    setSelectedAnswers([])
    setCurrentQuestionIndex(0)
    setQuizResults([])
    setQuizMode("setup")
    setAnalysisText("")
  }

  const calculateScore = () => {
    const correct = quizResults.filter((r) => r.isCorrect).length
    return Math.round((correct / quiz.length) * 100)
  }

  const analyzeWithAI = async () => {
    if (!quiz.length || !quizResults.length) return
    setAnalysisLoading(true)
    setAnalysisText("")
    try {
      const answers: Record<number, "a" | "b" | "c" | "d"> = {}
      quizResults.forEach((r) => {
        const ans = selectedAnswers[r.questionIndex]
        if (ans) answers[r.questionIndex] = ans as any
      })
      const res = await fetch("/api/analyze-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz, answers }),
      })
      const data = await res.json()
      if (!res.ok || data?.error) throw new Error(data?.error || "Analysis failed")
      setAnalysisText(data.analysis as string)
    } catch (e: any) {
      setAnalysisText(`Error: ${e?.message || e}`)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const selectedResourceData = resources.find((r) => r.id === selectedResource)
  const selectedTopicData = topics.find((t) => t.id === selectedTopic)
  const currentQuestion = quiz[currentQuestionIndex]

  if (quizMode === "taking" && quiz.length > 0) {
    return (
      <div className="space-y-8">
        {/* Quiz Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-balance mb-4">Quiz: {selectedTopicData?.name}</h2>
          <div className="flex items-center justify-center gap-4">
            <Badge variant="secondary">
              Question {currentQuestionIndex + 1} of {quiz.length}
            </Badge>
            <Badge variant="outline">{selectedResourceData?.name}</Badge>
          </div>
        </div>

        {/* Progress Bar */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Quiz Progress</span>
              <span>{Math.round(((currentQuestionIndex + 1) / quiz.length) * 100)}%</span>
            </div>
            <Progress value={((currentQuestionIndex + 1) / quiz.length) * 100} className="h-2" />
          </CardContent>
        </Card>

        {/* Question Card */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl text-balance">{currentQuestion.question}</CardTitle>
            <CardDescription>Select the best answer from the options below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={selectedAnswers[currentQuestionIndex]} onValueChange={handleAnswerSelect}>
              {Object.entries(currentQuestion.options).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="flex-1 cursor-pointer text-balance">
                    <span className="font-medium mr-2">{key.toUpperCase()})</span>
                    {value}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0}>
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentQuestionIndex === quiz.length - 1 ? (
                  <Button
                    onClick={submitQuiz}
                    disabled={selectedAnswers.some((answer) => !answer)}
                    className="glow-effect"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Submit Quiz
                  </Button>
                ) : (
                  <Button onClick={nextQuestion} disabled={!selectedAnswers[currentQuestionIndex]}>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (quizMode === "results") {
    const score = calculateScore()
    const correctAnswers = quizResults.filter((r) => r.isCorrect).length

    return (
      <div className="space-y-8">
        {/* Results Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-balance mb-4">Quiz Results</h2>
          <div className="flex items-center justify-center gap-4">
            <Badge variant={score >= 70 ? "default" : "destructive"} className="text-lg px-4 py-2">
              {score}% Score
            </Badge>
            <Badge variant="outline">
              {correctAnswers}/{quiz.length} Correct
            </Badge>
          </div>
        </div>

        {/* Score Card */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {score >= 70 ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              )}
              {score >= 90 ? "Excellent!" : score >= 70 ? "Good Job!" : "Keep Studying!"}
            </CardTitle>
            <CardDescription>
              {score >= 90
                ? "Outstanding performance! You have mastered this topic."
                : score >= 70
                  ? "Well done! You have a good understanding of this topic."
                  : "Review the material and try again to improve your understanding."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={score} className="h-4" />
              <div className="flex items-center justify-between text-sm">
                <span>Your Score</span>
                <span className="font-semibold">
                  {correctAnswers} out of {quiz.length} questions
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>Review your answers and learn from explanations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {quiz.map((question, index) => {
              const result = quizResults[index]
              const isCorrect = result.isCorrect

              return (
                <div key={index} className="p-4 rounded-lg border border-border/50">
                  <div className="flex items-start gap-3 mb-3">
                    {isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium text-balance mb-2">
                        {index + 1}. {question.question}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Your answer:</span>
                          <Badge variant={isCorrect ? "default" : "destructive"}>
                            {selectedAnswers[index]?.toUpperCase()}){" "}
                            {question.options[selectedAnswers[index] as keyof typeof question.options]}
                          </Badge>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Correct answer:</span>
                            <Badge variant="outline" className="border-green-500/50 text-green-600">
                              {question.correct.toUpperCase()}){" "}
                              {question.options[question.correct as keyof typeof question.options]}
                            </Badge>
                          </div>
                        )}
                        <div className="p-3 rounded-md bg-muted/30 border border-border/30">
                          <p className="text-muted-foreground text-sm">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" onClick={resetQuiz}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Take Another Quiz
          </Button>
          <Button onClick={analyzeWithAI} disabled={analysisLoading} className="glow-effect">
            {analysisLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Lightbulb className="w-4 h-4 mr-2" /> AI Analysis
              </>
            )}
          </Button>
        </div>

        {analysisText && (
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>AI Insights & Suggestions</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{analysisText}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-balance mb-4">Generate Personalized Quizzes</h2>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Create custom quizzes from your study topics to test your knowledge and reinforce learning.
        </p>
      </div>

      {/* Quiz Setup */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Quiz Configuration
          </CardTitle>
          <CardDescription>Select your study material, topic, and quiz preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {resources.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No resources found. Please upload a PDF file and extract topics first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Resource Selection */}
              <div className="space-y-2">
                <Label>Study Material</Label>
                <Select
                  value={selectedResource?.toString()}
                  onValueChange={(value) => setSelectedResource(Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a study material..." />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id.toString()}>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>{resource.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Topic Selection */}
              {topics.length > 0 && (
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Select
                    value={selectedTopic?.toString()}
                    onValueChange={(value) => setSelectedTopic(Number.parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a topic..." />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id.toString()}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Number of Questions */}
              <div className="space-y-2">
                <Label>Number of Questions</Label>
                <Select
                  value={numQuestions.toString()}
                  onValueChange={(value) => setNumQuestions(Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <div className="pt-4">
                <Button
                  onClick={generateQuiz}
                  disabled={!selectedTopic || isGenerating}
                  className="w-full glow-effect"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>

                {isGenerating && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Creating personalized questions...</span>
                      <span>{generationProgress}%</span>
                    </div>
                    <Progress value={generationProgress} className="h-2" />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Quiz Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                AI-Generated Questions
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Multiple-choice questions tailored to your content</li>
                <li>• Questions test understanding, not just memorization</li>
                <li>• Detailed explanations for each answer</li>
                <li>• Adaptive difficulty based on topic complexity</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Learning Benefits
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Immediate feedback on your answers</li>
                <li>• Track your progress and identify weak areas</li>
                <li>• Reinforce learning through active recall</li>
                <li>• Build confidence before exams</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
