"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sparkles, UploadCloud, ClipboardList, CheckCircle2, ArrowLeft } from "lucide-react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export type ChatMessage = {
    role: "user" | "assistant" | "system"
    content: string
}

type QuizItem = {
    topic_name: string
    question: string
    options: { a: string; b: string; c: string; d: string }
    correct: "a" | "b" | "c" | "d"
    explanation: string
}

export function ChatBot() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content:
                "Hi! I'm StudyCoach AI. You can chat with me, optionally upload a PDF, and I can generate a short quiz for you. I'll first show questions without answers; after you respond, I'll give you a detailed report.",
        },
    ])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement | null>(null)

    // Upload + quiz state
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedInfo, setUploadedInfo] = useState<{ filename: string; filepath: string } | null>(null)

    const [topicName, setTopicName] = useState("")
    const [numQuestions, setNumQuestions] = useState<number>(3)
    const [generatingQuiz, setGeneratingQuiz] = useState(false)
    const [quiz, setQuiz] = useState<QuizItem[] | null>(null)
    const [answers, setAnswers] = useState<Record<number, "a" | "b" | "c" | "d" | "">>({})
    const [showReport, setShowReport] = useState(false)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const send = async () => {
        const trimmed = input.trim()
        if (!trimmed || loading) return

        const next = [...messages, { role: "user" as const, content: trimmed }]
        setMessages(next)
        setInput("")
        setLoading(true)

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: next }),
            })
            const data = await res.json()
            if (!res.ok || data?.error) {
                throw new Error(data?.error || "Chat failed")
            }
            setMessages((curr) => [...curr, { role: "assistant", content: data.reply as string }])
        } catch (e: any) {
            setMessages((curr) => [
                ...curr,
                { role: "assistant", content: `Sorry, I ran into an error: ${e?.message || e}` },
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            void send()
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        try {
            const form = new FormData()
            form.append("file", file)
            const res = await fetch("/api/upload-pdf", { method: "POST", body: form })
            const data = await res.json()
            if (!res.ok || data?.error) throw new Error(data?.error || "Upload failed")
            setUploadedInfo({ filename: data.filename, filepath: data.filepath })
            setMessages((curr) => [
                ...curr,
                {
                    role: "assistant",
                    content: `Uploaded ${data.originalName}. Now set a topic and number of questions, then click Generate Quiz.`,
                },
            ])
        } catch (e: any) {
            setMessages((curr) => [...curr, { role: "assistant", content: `Upload error: ${e?.message || e}` }])
        } finally {
            setUploading(false)
        }
    }

    const generateQuiz = async () => {
        if (!topicName || numQuestions < 1 || numQuestions > 10) {
            setMessages((curr) => [
                ...curr,
                { role: "assistant", content: "Please provide a topic name and choose 1 to 10 questions." },
            ])
            return
        }
        setGeneratingQuiz(true)
        setShowReport(false)
        setQuiz(null)
        setAnswers({})
        try {
            const res = await fetch("/api/generate-quiz", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ topicId: 1, topicName, numQuestions }),
            })
            const data = await res.json()
            if (!res.ok || data?.error) throw new Error(data?.error || "Quiz generation failed")
            const items: QuizItem[] = data.quiz
            setQuiz(items)
            setMessages((curr) => [
                ...curr,
                {
                    role: "assistant",
                    content: `I created ${items.length} questions about "${topicName}". Please answer below, then submit to see your report.`,
                },
            ])
        } catch (e: any) {
            setMessages((curr) => [...curr, { role: "assistant", content: `Quiz error: ${e?.message || e}` }])
        } finally {
            setGeneratingQuiz(false)
        }
    }

    const submitAnswers = () => {
        if (!quiz) return
        const unanswered = quiz.findIndex((_, idx) => !answers[idx])
        if (unanswered !== -1) {
            setMessages((curr) => [
                ...curr,
                { role: "assistant", content: `You missed question ${unanswered + 1}. Please answer all questions.` },
            ])
            return
        }
        setShowReport(true)
    }

    return (
        <div className="grid grid-rows-[auto,auto,1fr,auto] gap-4 h-[80vh]">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        <Sparkles className="w-3 h-3 mr-1" /> AI Chat
                    </Badge>
                    <span className="text-sm text-muted-foreground">Chat, optionally upload a PDF, then generate a quiz.</span>
                </div>
            </div>

            {/* Upload + Quiz setup */}
            <Card className="p-4 border-border/60">
                <div className="grid md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2">
                        <Label className="text-sm">Optional: Upload PDF</Label>
                        <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                        <Button onClick={handleUpload} disabled={!file || uploading} variant="secondary" className="w-full">
                            <UploadCloud className="w-4 h-4 mr-2" /> {uploading ? "Uploading..." : uploadedInfo ? "Re-upload" : "Upload"}
                        </Button>
                        {uploadedInfo && <div className="text-xs text-muted-foreground">Uploaded: {uploadedInfo.filename}</div>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm">Topic</Label>
                        <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="e.g., Neural Networks" />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm">Number of Questions (1-10)</Label>
                        <Input type="number" min={1} max={10} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} />
                        <Button onClick={generateQuiz} disabled={generatingQuiz} className="w-full">
                            <ClipboardList className="w-4 h-4 mr-2" /> {generatingQuiz ? "Generating..." : "Generate Quiz"}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-4 overflow-y-auto space-y-4 border-border/60">
                {messages.map((m, i) => (
                    <div key={i} className="flex">
                        <div
                            className={
                                m.role === "user"
                                    ? "ml-auto max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2"
                                    : "mr-auto max-w-[85%] rounded-lg bg-muted px-3 py-2"
                            }
                        >
                            <div className="text-xs opacity-80 mb-1">{m.role === "user" ? "You" : "StudyCoach"}</div>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </Card>

            {/* Quiz area without answers, collect responses */}
            {quiz && !showReport && (
                <Card className="p-4 border-border/60 space-y-6">
                    {quiz.map((q, idx) => (
                        <div key={idx} className="space-y-2">
                            <div className="font-medium">{idx + 1}. {q.question}</div>
                            <RadioGroup
                                value={answers[idx] || ""}
                                onValueChange={(val) => setAnswers((a) => ({ ...a, [idx]: val as any }))}
                                className="grid gap-2"
                            >
                                {(["a", "b", "c", "d"] as const).map((letter) => (
                                    <div key={letter} className="flex items-center space-x-2">
                                        <RadioGroupItem id={`q${idx}-${letter}`} value={letter} />
                                        <Label htmlFor={`q${idx}-${letter}`}>{letter.toUpperCase()}. {q.options[letter]}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    ))}
                    <div className="flex justify-end">
                        <Button onClick={submitAnswers}>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Submit Answers
                        </Button>
                    </div>
                </Card>
            )}

            {/* Report with correct answers and explanations */}
            {quiz && showReport && (
                <Card className="p-4 border-border/60 space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" /> Quiz Report
                    </div>
                    {quiz.map((q, idx) => {
                        const user = answers[idx]!
                        const correct = q.correct
                        const isCorrect = user === correct
                        return (
                            <div key={idx} className="space-y-1">
                                <div className="font-medium">{idx + 1}. {q.question}</div>
                                <div className="text-sm">Your answer: {user?.toUpperCase()} — {q.options[user]}</div>
                                <div className="text-sm">Correct answer: {correct.toUpperCase()} — {q.options[correct]}</div>
                                <div className={`text-sm ${isCorrect ? "text-green-600" : "text-red-600"}`}>{isCorrect ? "Correct" : "Incorrect"}</div>
                                <div className="text-sm text-muted-foreground">Explanation: {q.explanation}</div>
                            </div>
                        )
                    })}
                    <div className="flex justify-between">
                        <Button variant="secondary" onClick={() => { setShowReport(false) }}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to answers
                        </Button>
                        <Button onClick={() => { setQuiz(null); setAnswers({}); setShowReport(false); }}>
                            Start New Quiz
                        </Button>
                    </div>
                </Card>
            )}

            <div className="flex gap-2 items-end">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your question... (Shift+Enter for newline)"
                    className="min-h-[56px]"
                />
                <Button onClick={() => void send()} disabled={loading}>
                    {loading ? "Sending..." : "Send"}
                </Button>
            </div>
        </div>
    )
}
