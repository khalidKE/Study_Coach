"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Sparkles, Eye, EyeOff, Layers } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

type Resource = { id: number; name: string; upload_date?: string; topics_count?: number }
type Topic = { id: number; name: string; resource_id: number }

interface StudyPlanProps { resources: Resource[] }

export function StudyPlan({ resources }: StudyPlanProps) {
    const [goals, setGoals] = useState("")
    const [timeframeWeeks, setTimeframeWeeks] = useState<number>(4)
    const [weeklyHours, setWeeklyHours] = useState<number>(6)
    const [topics, setTopics] = useState("")
    const [loading, setLoading] = useState(false)
    const [plan, setPlan] = useState<string>("")
    const [viewMode, setViewMode] = useState<"text" | "flashcards">("text")
    const [revealed, setRevealed] = useState<Record<number, boolean>>({})
    const [selectedResource, setSelectedResource] = useState<number | null>(null)
    const [availableTopics, setAvailableTopics] = useState<Topic[]>([])
    const [selectedTopicIds, setSelectedTopicIds] = useState<Set<number>>(new Set())

    useEffect(() => {
        const fetchTopics = async () => {
            if (!selectedResource) {
                setAvailableTopics([])
                setSelectedTopicIds(new Set())
                return
            }
            try {
                const res = await fetch(`/api/topics?resourceId=${selectedResource}`)
                const data = await res.json()
                if (data?.success && Array.isArray(data.topics)) {
                    setAvailableTopics(data.topics as Topic[])
                } else {
                    setAvailableTopics([])
                }
            } catch {
                setAvailableTopics([])
            }
        }
        fetchTopics()
    }, [selectedResource])

    const generate = async () => {
        if (!goals || !timeframeWeeks || !weeklyHours) return
        setLoading(true)
        setPlan("")
        setViewMode("text")
        setRevealed({})
        try {
            const selectedNames: string[] = Array.from(selectedTopicIds)
                .map((id) => availableTopics.find((t) => t.id === id)?.name)
                .filter(Boolean) as string[]
            const res = await fetch("/api/generate-study-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    goals,
                    timeframeWeeks,
                    weeklyHours,
                    resourceName: selectedResource ? resources.find(r => r.id === selectedResource)?.name : undefined,
                    selectedTopicNames: selectedNames.length > 0
                        ? selectedNames
                        : topics
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

    type FlashCard = { title: string; bullets: string[] }

    const flashcards: FlashCard[] = useMemo(() => {
        if (!plan?.trim()) return []

        const lines = plan
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l.length > 0)

        const cards: FlashCard[] = []
        let current: FlashCard | null = null

        const isBullet = (s: string) => /^(?:[-*•]|\d+\.|\d+\))/i.test(s)
        const isLikelyTitle = (s: string) => !isBullet(s) && s.length <= 120

        for (const line of lines) {
            if (isLikelyTitle(line)) {
                if (current) cards.push(current)
                current = { title: line.replace(/:$/g, ""), bullets: [] }
            } else if (isBullet(line)) {
                const cleaned = line.replace(/^(?:[-*•]\s*|\d+[.)]\s*)/, "").trim()
                if (!current) current = { title: "Study Tip", bullets: [] }
                current.bullets.push(cleaned)
            } else {
                if (!current) current = { title: "Study Guidance", bullets: [] }
                current.bullets.push(line)
            }
        }
        if (current) cards.push(current)

        if (cards.length <= 2) {
            const paras = plan.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
            return paras.map((p, i) => ({ title: `Item ${i + 1}`, bullets: p.split(/\r?\n/).filter(Boolean) }))
        }

        return cards
    }, [plan])

    const toggleReveal = (idx: number) => setRevealed((r) => ({ ...r, [idx]: !r[idx] }))

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-balance mb-2">Personalized Study Plan</h2>
                <p className="text-muted-foreground">Enter your goals and time constraints. Optionally select an uploaded PDF and its topics to tailor the plan to your material. View as text or flashcards.</p>
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
                        <Label>Study material (optional)</Label>
                        <Select value={selectedResource?.toString()} onValueChange={(v) => setSelectedResource(Number(v))}>
                            <SelectTrigger>
                                <SelectValue placeholder={resources?.length ? "Choose a PDF resource..." : "Upload a PDF first in the Upload tab"} />
                            </SelectTrigger>
                            <SelectContent>
                                {resources?.map((r) => (
                                    <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedResource && availableTopics.length > 0 && (
                        <div className="space-y-2">
                            <Label>Select topics to emphasize (optional)</Label>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {availableTopics.map((t) => {
                                    const checked = selectedTopicIds.has(t.id)
                                    return (
                                        <label key={t.id} className="flex items-center gap-2 p-2 rounded-md border border-border/40 hover:bg-muted/40 cursor-pointer">
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={(v) => {
                                                    setSelectedTopicIds((prev) => {
                                                        const next = new Set(prev)
                                                        if (v) next.add(t.id); else next.delete(t.id)
                                                        return next
                                                    })
                                                }}
                                            />
                                            <span className="text-sm">{t.name}</span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )}

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
                        <Label>Extra focus topics (optional, comma or newline separated)</Label>
                        <Textarea placeholder="Supervised Learning, Neural Networks, ..." value={topics} onChange={(e) => setTopics(e.target.value)} />
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button onClick={generate} disabled={loading || !goals || !timeframeWeeks || !weeklyHours}>
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
                        {plan && (
                            <>
                                <Button
                                    type="button"
                                    variant={viewMode === "text" ? "default" : "outline"}
                                    onClick={() => setViewMode("text")}
                                >
                                    <Layers className="w-4 h-4 mr-2" /> Text
                                </Button>
                                <Button
                                    type="button"
                                    variant={viewMode === "flashcards" ? "default" : "outline"}
                                    onClick={() => setViewMode("flashcards")}
                                >
                                    <Layers className="w-4 h-4 mr-2" /> Flashcards
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {plan && viewMode === "text" && (
                <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Suggested Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="whitespace-pre-wrap text-sm leading-relaxed">{plan}</pre>
                    </CardContent>
                </Card>
            )}

            {plan && viewMode === "flashcards" && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {flashcards.map((fc, idx) => (
                        <Card key={idx} className="border-border/60">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{fc.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm text-muted-foreground">
                                    {revealed[idx] ? (
                                        <ul className="list-disc pl-5 space-y-1">
                                            {fc.bullets.map((b, i) => (
                                                <li key={i}>{b}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="italic">Tap reveal to view details</div>
                                    )}
                                </div>
                                <Button size="sm" variant="outline" onClick={() => toggleReveal(idx)}>
                                    {revealed[idx] ? (
                                        <>
                                            <EyeOff className="w-4 h-4 mr-2" /> Hide
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-4 h-4 mr-2" /> Reveal
                                        </>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
