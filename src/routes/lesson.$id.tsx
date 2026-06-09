import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, FileText, HelpCircle, Sparkles, GraduationCap, Trophy, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/lesson/$id")({ component: PublicLesson });

interface Lesson { id: string; topic: string; subject: string; grade: string; duration: string; status: string; }
type Content = Record<string, any>;

function unwrap(raw: any): Content | null {
  if (!raw) return null;
  let inner: any = raw;
  if (inner?.choices?.[0]?.message?.content !== undefined) inner = inner.choices[0].message.content;
  if (typeof inner === "string") {
    const stripped = inner.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try { inner = JSON.parse(stripped); } catch { return null; }
  }
  return inner && typeof inner === "object" ? inner : null;
}

type QMode = "intro" | "taking" | "result";

function PublicLesson() {
  const { id } = Route.useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<QMode>("intro");
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [step, setStep] = useState(0);
  const [score, setScore] = useState<{ correct: number; total: number; details: any[] } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
      setLesson(l as Lesson | null);
      const { data: c } = await supabase.from("lesson_content").select("lesson_json").eq("lesson_id", id).order("generated_at", { ascending: false }).limit(1).maybeSingle();
      setContent(unwrap(c?.lesson_json));
      setLoading(false);
    })();
  }, [id]);

  const lp: any = content?.lesson_plan ?? {};
  const ws: any = content?.worksheet ?? {};
  const quiz: any = content?.quiz ?? {};
  const ak: any = content?.answer_key ?? {};

  // Build flat quiz question list
  const questions = useMemo(() => {
    const list: { kind: "mcq" | "short"; prompt: string; options?: string[]; answer?: any; idx: number }[] = [];
    const mcqs: any[] = Array.isArray(quiz?.mcq) ? quiz.mcq : [];
    const shorts: any[] = Array.isArray(quiz?.short_answer) ? quiz.short_answer : [];
    let i = 0;
    const akMcq = ak?.mcq ?? ak?.quiz?.mcq;
    const akShort = ak?.short_answer ?? ak?.quiz?.short_answer;
    mcqs.forEach((q, j) => list.push({
      kind: "mcq",
      prompt: q.prompt ?? q.question ?? "",
      options: q.options ?? [],
      answer: q.answer ?? q.correct_answer ?? q.correct ?? (Array.isArray(akMcq) ? (akMcq[j]?.answer ?? akMcq[j]?.correct_answer ?? akMcq[j]) : undefined),
      idx: i++,
    }));
    shorts.forEach((q, j) => list.push({
      kind: "short",
      prompt: q.prompt ?? q.question ?? "",
      answer: q.answer ?? q.correct_answer ?? (Array.isArray(akShort) ? (akShort[j]?.answer ?? akShort[j]?.correct_answer ?? akShort[j]) : undefined),
      idx: i++,
    }));
    if (list.length === 0) {
      const fallback: any[] = Array.isArray(quiz) ? quiz : (quiz.questions ?? quiz.mcqs ?? []);
      fallback.forEach((q: any) => list.push({
        kind: q.options ? "mcq" : "short",
        prompt: q.prompt ?? q.question ?? "",
        options: q.options,
        answer: q.answer ?? q.correct_answer ?? q.correct,
        idx: i++,
      }));
    }
    return list;
  }, [quiz, ak]);

  const normalizeMcq = (q: { options?: string[]; answer?: any }, given: string): boolean => {
    if (q.answer == null || given == null) return false;
    const a = String(q.answer).trim();
    const g = String(given).trim();
    if (a.toLowerCase() === g.toLowerCase()) return true;
    // Answer might be letter (A/B/C) or index
    const letter = a.toUpperCase();
    if (/^[A-Z]$/.test(letter) && q.options) {
      const idx = letter.charCodeAt(0) - 65;
      if (q.options[idx] && q.options[idx].trim().toLowerCase() === g.toLowerCase()) return true;
    }
    const num = parseInt(a, 10);
    if (!isNaN(num) && q.options && q.options[num] && q.options[num].trim().toLowerCase() === g.toLowerCase()) return true;
    return false;
  };

  const submit = () => {
    let correct = 0;
    const details = questions.map((q) => {
      const given = answers[q.idx] ?? "";
      let isRight = false;
      if (q.kind === "mcq") isRight = normalizeMcq(q, given);
      else {
        const a = String(q.answer ?? "").trim().toLowerCase();
        const g = given.trim().toLowerCase();
        isRight = a !== "" && g !== "" && (a === g || a.includes(g) || g.includes(a));
      }
      if (isRight) correct++;
      return { ...q, given, isRight };
    });
    setScore({ correct, total: questions.length, details });
    setMode("result");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading lesson…</div>;
  if (!lesson) return <div className="min-h-screen flex items-center justify-center">Lesson not found.</div>;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-hero text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-dots-pattern opacity-20" />
        <div className="max-w-4xl mx-auto px-6 py-12 relative">
          <div className="flex items-center gap-2 text-sm opacity-90 mb-3">
            <Sparkles className="h-4 w-4" /> Shared Lesson
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">{lesson.topic}</h1>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 backdrop-blur">{lesson.subject}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 backdrop-blur">{lesson.grade}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/15 backdrop-blur">{lesson.duration}</span>
          </div>
          {questions.length > 0 && mode === "intro" && (
            <Button size="lg" className="mt-6 btn-gradient" onClick={() => setMode("taking")}>
              <GraduationCap className="h-4 w-4 mr-2" /> Take Quiz ({questions.length} questions)
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {mode === "taking" ? (
          <QuizTaker
            questions={questions}
            studentName={studentName}
            setStudentName={setStudentName}
            answers={answers}
            setAnswers={setAnswers}
            step={step}
            setStep={setStep}
            onSubmit={submit}
            onCancel={() => setMode("intro")}
          />
        ) : mode === "result" && score ? (
          <ResultView
            score={score}
            studentName={studentName}
            onRetry={() => { setAnswers({}); setStep(0); setScore(null); setMode("taking"); }}
            onBack={() => setMode("intro")}
          />
        ) : !content ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <h3 className="font-semibold">Lesson content is still being prepared.</h3>
            <p className="text-sm text-muted-foreground mt-1">Please check back shortly.</p>
          </div>
        ) : (
          <div className="space-y-12">
            <Section icon={<BookOpen className="h-5 w-5" />} title="Lesson Overview">
              {lp.learning_objectives && (
                <Sub title="What you'll learn">
                  <ul className="list-disc pl-5 space-y-1.5">
                    {lp.learning_objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                </Sub>
              )}
              {lp.procedure && (
                <Sub title="How the lesson flows">
                  <ol className="space-y-3">
                    {lp.procedure.map((p: any, i: number) => (
                      <li key={i} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">{i + 1}</div>
                        <div className="flex-1 pt-1">{p.activity ?? (typeof p === "string" ? p : JSON.stringify(p))}</div>
                      </li>
                    ))}
                  </ol>
                </Sub>
              )}
            </Section>

            <Section icon={<FileText className="h-5 w-5" />} title="Practice Worksheet">
              <WorksheetView ws={ws} />
            </Section>

            <Section icon={<HelpCircle className="h-5 w-5" />} title="Quiz Preview">
              {questions.length === 0 ? (
                <p className="text-muted-foreground">No quiz available.</p>
              ) : (
                <>
                  <ol className="space-y-4">
                    {questions.slice(0, 3).map((q, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="font-semibold text-primary">{i + 1}.</span>
                        <span>{q.prompt}</span>
                      </li>
                    ))}
                    {questions.length > 3 && <li className="text-muted-foreground text-sm">…and {questions.length - 3} more</li>}
                  </ol>
                  <Button className="mt-6 btn-gradient" onClick={() => setMode("taking")}>
                    <GraduationCap className="h-4 w-4 mr-2" /> Take Quiz
                  </Button>
                </>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function WorksheetView({ ws }: { ws: any }) {
  if (!ws || (typeof ws === "object" && Object.keys(ws).length === 0)) return <p className="text-muted-foreground">No worksheet.</p>;
  const tiers = ws.easy || ws.medium || ws.hard ? { easy: ws.easy ?? [], medium: ws.medium ?? [], hard: ws.hard ?? [] } : null;
  const items: any[] = !tiers ? (Array.isArray(ws) ? ws : (ws.questions ?? [])) : [];
  if (tiers) {
    return (
      <div className="space-y-6">
        {(["easy", "medium", "hard"] as const).map((t) => tiers[t]?.length > 0 && (
          <div key={t}>
            <h4 className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">{t}</h4>
            <ol className="space-y-2">
              {tiers[t].map((q: any, i: number) => <li key={i} className="flex gap-3"><span className="font-semibold text-primary">{i + 1}.</span><span>{q.prompt ?? q.question ?? (typeof q === "string" ? q : JSON.stringify(q))}</span></li>)}
            </ol>
          </div>
        ))}
      </div>
    );
  }
  return (
    <ol className="space-y-2">
      {items.map((q, i) => <li key={i} className="flex gap-3"><span className="font-semibold text-primary">{i + 1}.</span><span>{q.prompt ?? q.question ?? (typeof q === "string" ? q : JSON.stringify(q))}</span></li>)}
    </ol>
  );
}

function QuizTaker({ questions, studentName, setStudentName, answers, setAnswers, step, setStep, onSubmit, onCancel }: any) {
  if (!studentName) {
    const [name, setName] = useState("");
    return (
      <div className="rounded-2xl border border-border bg-card p-8 max-w-lg mx-auto shadow-card-hover">
        <h2 className="text-2xl font-bold mb-2">Ready to start?</h2>
        <p className="text-muted-foreground mb-6">Enter your name to begin the quiz.</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mb-4" />
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button className="btn-gradient flex-1" disabled={!name.trim()} onClick={() => setStudentName(name.trim())}>Start Quiz</Button>
        </div>
      </div>
    );
  }

  const q = questions[step];
  if (!q) return null;
  const given = answers[q.idx] ?? "";
  const isLast = step === questions.length - 1;

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-card-hover">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Question {step + 1} of {questions.length}</div>
          <div className="text-sm text-muted-foreground">Good luck, {studentName}!</div>
        </div>
        <div className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase">{q.kind === "mcq" ? "Multiple Choice" : "Short Answer"}</div>
      </div>
      <div className="w-full bg-secondary rounded-full h-1.5 mb-6">
        <div className="bg-gradient-cta h-1.5 rounded-full transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
      </div>

      <h3 className="text-xl font-semibold mb-6">{q.prompt}</h3>

      {q.kind === "mcq" ? (
        <div className="space-y-2">
          {(q.options ?? []).map((opt: string, i: number) => {
            const active = given === opt;
            return (
              <button
                key={i}
                onClick={() => setAnswers({ ...answers, [q.idx]: opt })}
                className={`w-full text-left p-4 rounded-lg border transition-all ${active ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-primary/40 hover:bg-secondary"}`}
              >
                <span className="font-semibold mr-2 text-primary">{String.fromCharCode(65 + i)}.</span>{opt}
              </button>
            );
          })}
        </div>
      ) : (
        <Textarea value={given} onChange={(e) => setAnswers({ ...answers, [q.idx]: e.target.value })} placeholder="Type your answer…" rows={4} />
      )}

      <div className="flex justify-between mt-8">
        <Button variant="ghost" onClick={() => step === 0 ? onCancel() : setStep(step - 1)}>{step === 0 ? "Cancel" : "Previous"}</Button>
        {isLast ? (
          <Button className="btn-gradient" onClick={onSubmit}>Submit Quiz</Button>
        ) : (
          <Button className="btn-gradient" onClick={() => setStep(step + 1)}>Next</Button>
        )}
      </div>
    </div>
  );
}

function ResultView({ score, studentName, onRetry, onBack }: any) {
  const pct = score.total ? Math.round((score.correct / score.total) * 100) : 0;
  const passed = pct >= 70;
  return (
    <div className="space-y-8">
      <div className={`rounded-2xl p-8 text-center text-white relative overflow-hidden ${passed ? "bg-gradient-cta shadow-glow-strong" : "bg-gradient-hero"}`}>
        <div className="absolute inset-0 bg-dots-pattern opacity-20" />
        <div className="relative">
          <Trophy className="h-12 w-12 mx-auto mb-3" />
          <div className="text-sm opacity-90">{passed ? "🎉 Congratulations" : "Keep practicing"}, {studentName}!</div>
          <div className="text-6xl font-bold mt-3">{pct}%</div>
          <div className="text-lg mt-2 opacity-90">{score.correct} / {score.total} correct</div>
          {passed && <p className="mt-3 opacity-95">Great work — you've mastered this material!</p>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Review your answers</h3>
        {score.details.map((d: any, i: number) => (
          <div key={i} className={`rounded-xl border p-5 ${d.isRight ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="font-medium">{i + 1}. {d.prompt}</div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${d.isRight ? "bg-green-500/20 text-green-700 dark:text-green-300" : "bg-red-500/20 text-red-700 dark:text-red-300"}`}>{d.isRight ? "Correct" : "Incorrect"}</span>
            </div>
            <div className="text-sm space-y-1 mt-2">
              <div><span className="text-muted-foreground">Your answer:</span> {d.given || <em className="text-muted-foreground">No answer</em>}</div>
              {!d.isRight && d.answer != null && (
                <div><span className="text-muted-foreground">Correct answer:</span> <span className="font-medium text-foreground">{String(d.answer)}</span></div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={onBack}>Back to lesson</Button>
        <Button className="btn-gradient" onClick={onRetry}><RotateCcw className="h-4 w-4 mr-2" /> Try again</Button>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="space-y-6 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}