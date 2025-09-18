"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Sparkles, CheckCircle2, ArrowLeft, UploadCloud, Plus } from "lucide-react"
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

    const [topicName, setTopicName] = useState("")
    const [numQuestions, setNumQuestions] = useState<number>(3)
    const [generatingQuiz, setGeneratingQuiz] = useState(false)
    const [quiz, setQuiz] = useState<QuizItem[] | null>(null)
    const [answers, setAnswers] = useState<Partial<Record<number, "a" | "b" | "c" | "d">>>({})
    const [showReport, setShowReport] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedInfo, setUploadedInfo] = useState<{ filename: string; filepath: string } | null>(null)

    // Conversational quiz flow state
    const [quizFlow, setQuizFlow] = useState<"idle" | "awaiting_topic" | "awaiting_count">("idle")
    const [pendingTopic, setPendingTopic] = useState<string>("")
    const chatFileInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    // Handle conversational quiz flow
    const handleQuizFlow = async (userText: string): Promise<boolean> => {
        const text = userText.toLowerCase()

        // Start flow if user expresses intent
        const wantsQuiz = /\b(quiz|generate quiz|make a quiz|start quiz)\b/.test(text) || quizFlow !== "idle"
        if (!wantsQuiz) return false

        // Ensure we have the user's message already appended by caller
        if (quizFlow === "idle") {
            setQuiz(null)
            setAnswers({})
            setShowReport(false)
            setQuizFlow("awaiting_topic")
            setMessages((curr) => [
                ...curr,
                { role: "assistant", content: "Great! What topic should the quiz cover?" },
            ])
            return true
        }

        if (quizFlow === "awaiting_topic") {
            const topic = userText.trim()
            if (!topic) {
                setMessages((curr) => [
                    ...curr,
                    { role: "assistant", content: "Please provide a topic for the quiz." },
                ])
                return true
            }
            setPendingTopic(topic)
            setQuizFlow("awaiting_count")
            setMessages((curr) => [
                ...curr,
                { role: "assistant", content: "How many questions would you like? Choose a number from 1 to 10." },
            ])
            return true
        }

        if (quizFlow === "awaiting_count") {
            const match = userText.match(/\b(\d{1,2})\b/)
            const n = match ? Number(match[1]) : NaN
            if (!Number.isFinite(n) || n < 1 || n > 10) {
                setMessages((curr) => [
                    ...curr,
                    { role: "assistant", content: "Please enter a valid number between 1 and 10." },
                ])
                return true
            }
            setTopicName(pendingTopic)
            setNumQuestions(n)
            setQuizFlow("idle")
            await generateQuizWith(pendingTopic, n)
            return true
        }

        return false
    }

    const generateQuizWith = async (topic: string, count: number) => {
        if (!topic || count < 1 || count > 10) {
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
                body: JSON.stringify({ topicId: 1, topicName: topic, numQuestions: count }),
            })
            const data = await res.json()
            if (!res.ok || data?.error) throw new Error(data?.error || "Quiz generation failed")
            const items: QuizItem[] = data.quiz
            setQuiz(items)
            setMessages((curr) => [
                ...curr,
                {
                    role: "assistant",
                    content: `I created ${items.length} questions about "${topic}". Please answer below, then submit to see your report.`,
                },
            ])
        } catch (e: any) {
            setMessages((curr) => [...curr, { role: "assistant", content: `Quiz error: ${e?.message || e}` }])
        } finally {
            setGeneratingQuiz(false)
        }
    }

    // Keep for potential programmatic triggers, fallback to conversational flow
    const generateQuiz = async () => {
        await generateQuizWith(topicName, numQuestions)
    }

    const send = async () => {
        const trimmed = input.trim()
        if (!trimmed || loading) return

        const next = [...messages, { role: "user" as const, content: trimmed }]
        setMessages(next)
        setInput("")
        setLoading(true)

        try {
            // Conversational quiz flow handling
            const consumed = await handleQuizFlow(trimmed)
            if (consumed) return

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

    const handleUpload = async (selectedFile?: File) => {
        const f = selectedFile ?? file
        if (!f) return
        setUploading(true)
        try {
            const form = new FormData()
            form.append("file", f)
            const res = await fetch("/api/upload-pdf", { method: "POST", body: form })
            const data = await res.json()
            if (!res.ok || data?.error) throw new Error(data?.error || "Upload failed")
            setUploadedInfo({ filename: data.filename, filepath: data.filepath })
            setMessages((curr) => [
                ...curr,
                { role: "assistant", content: `Uploaded ${data.originalName}. You can now continue chatting or say 'start quiz' to generate questions.` },
            ])
        } catch (e: any) {
            setMessages((curr) => [...curr, { role: "assistant", content: `Upload error: ${e?.message || e}` }])
        } finally {
            setUploading(false)
        }
    }

    function formatQuestion(idx: number, q: QuizItem) {
        return `${idx + 1}. ${q.question}\nA. ${q.options.a}\nB. ${q.options.b}\nC. ${q.options.c}\nD. ${q.options.d}\nReply with a, b, c, or d.`
    }

    function buildReport(items: QuizItem[], ans: Partial<Record<number, 'a' | 'b' | 'c' | 'd'>>) {
        let correctCount = 0
        const lines: string[] = ["Quiz Report"]
        items.forEach((q, idx) => {
            const user = ans[idx]!
            const isCorrect = user === q.correct
            if (isCorrect) correctCount++
            lines.push(`${idx + 1}. ${q.question}`)
            lines.push(`Your answer: ${user.toUpperCase()} — ${q.options[user]}`)
            lines.push(`Correct answer: ${q.correct.toUpperCase()} — ${q.options[q.correct]}`)
            lines.push(`Result: ${isCorrect ? "Correct" : "Incorrect"}`)
            lines.push(`Explanation: ${q.explanation}`)
            lines.push("")
        })
        lines.push(`Score: ${correctCount}/${items.length}`)
        return lines.join("\n")
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

            {/* Conversational flow replaces the manual setup UI */}

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

            {/* Quiz UI hidden in chat-driven mode */}
            {quiz && !showReport && false && (
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

            {/* Report UI hidden in chat-driven mode */}
            {quiz && showReport && false && (
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
                {/* Chat bar upload (+) icon */}
                <input
                    ref={chatFileInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) {
                            void handleUpload(f)
                        }
                        // reset value so same file can be reselected
                        e.currentTarget.value = ""
                    }}
                />
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={uploading}
                    title="Upload PDF"
                >
                    <Plus className="w-4 h-4" />
                </Button>
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
