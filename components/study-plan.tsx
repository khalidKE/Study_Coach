"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles } from "lucide-react"

export function StudyPlan() {
    const [goals, setGoals] = useState("")
    const [timeframeWeeks, setTimeframeWeeks] = useState<number>(4)
    const [weeklyHours, setWeeklyHours] = useState<number>(6)
    const [topics, setTopics] = useState("")
    const [loading, setLoading] = useState(false)
    const [plan, setPlan] = useState<string>("")

    const generate = async () => {
        if (!goals || !timeframeWeeks || !weeklyHours) return
        setLoading(true)
        setPlan("")
        try {
            const res = await fetch("/api/generate-study-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goals,
                    timeframeWeeks,
                    weeklyHours,
                    topics: topics
                        .split(/,|\n/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                }),
            })
            const data = await res.json()
            if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate plan")
            setPlan(data.plan as string)
        } catch (e: any) {
            setPlan(`Error: ${e?.message || e}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-balance mb-2">Personalized Study Plan</h2>
                <p className="text-muted-foreground">Enter your goals and time constraints to get a focused plan.</p>
            </div>

            <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" /> Plan Configuration
                    </CardTitle>
                    <CardDescription>Specify your study goals and availability</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Goals</Label>
                        <Textarea
                            placeholder="e.g., Master fundamentals of Machine Learning and score 85%+ on practice tests"
                            value={goals}
                            onChange={(e) => setGoals(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Timeframe (weeks)</Label>
                            <Input
                                type="number"
                                min={1}
                                max={52}
                                value={timeframeWeeks}
                                onChange={(e) => setTimeframeWeeks(Number.parseInt(e.target.value || "0"))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Hours per week</Label>
                            <Input
                                type="number"
                                min={1}
                                max={60}
                                value={weeklyHours}
                                onChange={(e) => setWeeklyHours(Number.parseInt(e.target.value || "0"))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Focus topics (optional, comma or newline separated)</Label>
                        <Textarea placeholder="Supervised Learning, Neural Networks, ..." value={topics} onChange={(e) => setTopics(e.target.value)} />
                    </div>

                    <Button onClick={generate} disabled={loading || !goals || !timeframeWeeks || !weeklyHours} className="w-full">
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" /> Generate Study Plan
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {plan && (
                <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Suggested Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{plan}</pre>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
