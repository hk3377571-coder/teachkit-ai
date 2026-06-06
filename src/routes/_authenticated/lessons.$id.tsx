import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, BookOpen, FileText, HelpCircle, CheckCircle2, ClipboardList, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lessons/$id")({ component: LessonViewer });

interface Lesson { id: string; topic: string; subject: string; grade: string; duration: string; status: string; }
type Content = Record<string, any>;

function unwrap(raw: any): Content | null {
  if (!raw) return null;
  let inner: any = raw;
  if (inner?.choices?.[0]?.message?.content !== undefined) {
    inner = inner.choices[0].message.content;
  }
  if (typeof inner === "string") {
    const stripped = inner.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    try { inner = JSON.parse(stripped); } catch { return null; }
  }
  return inner && typeof inner === "object" ? inner : null;
}

function LessonViewer() {
  const { id } = Route.useParams();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: l } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
      setLesson(l as Lesson | null);
      const { data: c } = await supabase.from("lesson_content").select("lesson_json").eq("lesson_id", id).order("generated_at", { ascending: false }).limit(1).maybeSingle();
      const parsed = unwrap(c?.lesson_json);
      console.log("[LessonViewer] parsed lesson JSON:", parsed);
      setContent(parsed);
      setLoading(false);
    })();
  }, [id]);

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!lesson) return <div className="p-8">Lesson not found.</div>;

  const lp: any = content?.lesson_plan ?? {};
  const ws: any = content?.worksheet ?? {};
  const quiz: any = content?.quiz ?? {};
  const ak: any = content?.answer_key ?? {};
  const tieredWorksheet =
    ws && typeof ws === "object" && (ws.easy || ws.medium || ws.hard)
      ? { easy: ws.easy ?? [], medium: ws.medium ?? [], hard: ws.hard ?? [] }
      : null;
  const worksheetQs: any[] = !tieredWorksheet
    ? Array.isArray(ws)
      ? ws
      : (ws.questions ?? [])
    : [];
  const mcqs: any[] = Array.isArray(quiz?.mcq) ? quiz.mcq : [];
  const shortAnswers: any[] = Array.isArray(quiz?.short_answer) ? quiz.short_answer : [];
  const hasTieredQuiz = mcqs.length > 0 || shortAnswers.length > 0;
  const quizQs: any[] = !hasTieredQuiz
    ? Array.isArray(quiz)
      ? quiz
      : (quiz.questions ?? quiz.mcqs ?? [])
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-3">
            <Link to="/lessons"><ArrowLeft className="h-4 w-4 mr-1" /> All lessons</Link>
          </Button>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/15 text-primary">{lesson.subject}</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground/70">{lesson.grade}</span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground/70">{lesson.duration}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">{lesson.topic}</h1>
          {lp.title && lp.title !== lesson.topic && (
  <p className="mt-3 text-lg text-muted-foreground">{lp.title}</p>
)}
<div className="flex gap-3 mt-6">
  <Button size="sm" variant="outline" onClick={() => window.print()}>
    <Printer className="h-4 w-4 mr-1.5" /> Print
  </Button>
</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-10">
        {!content ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <h3 className="font-semibold">No generated content yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Status: {lesson.status}. Once your webhook returns content, it'll appear here.</p>
          </div>
        ) : (
          <div className="space-y-14">
            {/* Lesson Plan */}
            <SectionBlock icon={<BookOpen className="h-5 w-5" />} eyebrow="Module 1" title="Lesson Plan">
              {lp.learning_objectives && (
                <SubBlock title="Learning Objectives">
                  <ul className="list-disc pl-5 space-y-1.5">
                    {lp.learning_objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                </SubBlock>
              )}
              {lp.materials && (
                <SubBlock title="Materials">
                  <ul className="list-disc pl-5 space-y-1.5">
                    {lp.materials.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </SubBlock>
              )}
              {lp.procedure && (
                <SubBlock title="Procedure">
                  <ol className="space-y-4">
                    {lp.procedure.map((p: any, i: number) => (
                      <li key={i} className="flex gap-4">
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">
                          {p.step ?? i + 1}
                        </div>
                        <div className="flex-1 pt-1">
                          {p.time && <div className="text-xs font-medium text-primary mb-1">{p.time}</div>}
                          <p className="whitespace-pre-wrap leading-relaxed">{p.activity ?? (typeof p === "string" ? p : JSON.stringify(p))}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </SubBlock>
              )}
              {lp.differentiation && (
                <SubBlock title="Differentiation">
                  <dl className="space-y-3">
                    {Object.entries(lp.differentiation).map(([k, v]) => (
                      <div key={k} className="border-l-2 border-primary/40 pl-4">
                        <dt className="font-medium capitalize text-foreground">{k.replace(/_/g, " ")}</dt>
                        <dd className="text-muted-foreground mt-0.5">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </SubBlock>
              )}
              {lp.assessment && (
                <SubBlock title="Assessment">
                  <ul className="list-disc pl-5 space-y-1.5">
                    {(Array.isArray(lp.assessment) ? lp.assessment : [lp.assessment]).map((a: string, i: number) => <li key={i}>{a}</li>)}
                  </ul>
                </SubBlock>
              )}
              {["warm_up","concept_explanation","activity","recap","homework"].map((k) => lp[k] && (
                <SubBlock key={k} title={k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
                  <p className="whitespace-pre-wrap leading-relaxed">{lp[k]}</p>
                </SubBlock>
              ))}
            </SectionBlock>

            {/* Worksheet */}
            <SectionBlock
              icon={<FileText className="h-5 w-5" />}
              eyebrow="Module 2"
              title={ws?.title ?? "Worksheet"}
              onCopy={() => copy(JSON.stringify(content.worksheet, null, 2))}
            >
              {ws?.instructions && (
                <p className="text-muted-foreground italic mb-6 pb-4 border-b border-border">{ws.instructions}</p>
              )}
              {tieredWorksheet ? (
                <div className="space-y-8">
                  {(["easy", "medium", "hard"] as const).map((tier) =>
                    tieredWorksheet[tier]?.length > 0 ? (
                      <div key={tier}>
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">{tier}</h3>
                        <ol className="space-y-4">
                          {tieredWorksheet[tier].map((q: any, i: number) => (
                            <li key={i} className="flex gap-4">
                              <span className="flex-shrink-0 font-semibold text-primary w-7">{i + 1}.</span>
                              <div className="flex-1"><QuestionView q={q} /></div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null
                  )}
                </div>
              ) : worksheetQs.length > 0 ? (
                <ol className="space-y-6">
                  {worksheetQs.map((q: any, i: number) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex-shrink-0 font-semibold text-primary w-7">{i + 1}.</span>
                      <div className="flex-1"><QuestionView q={q} /></div>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-muted-foreground">No worksheet items.</p>}
            </SectionBlock>

            {/* Quiz */}
            <SectionBlock
              icon={<HelpCircle className="h-5 w-5" />}
              eyebrow="Module 3"
              title={quiz?.title ?? "Quiz"}
              onCopy={() => copy(JSON.stringify(content.quiz, null, 2))}
            >
              {quiz?.instructions && (
                <p className="text-muted-foreground italic mb-6 pb-4 border-b border-border">{quiz.instructions}</p>
              )}
              {hasTieredQuiz ? (
                <div className="space-y-8">
                  {mcqs.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">Multiple Choice</h3>
                      <ol className="space-y-6">
                        {mcqs.map((q: any, i: number) => (
                          <li key={i} className="flex gap-4">
                            <span className="flex-shrink-0 font-semibold text-primary w-7">{i + 1}.</span>
                            <div className="flex-1"><QuestionView q={q} /></div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {shortAnswers.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-primary mb-3">Short Answer</h3>
                      <ol className="space-y-4">
                        {shortAnswers.map((q: any, i: number) => (
                          <li key={i} className="flex gap-4">
                            <span className="flex-shrink-0 font-semibold text-primary w-7">{i + 1}.</span>
                            <div className="flex-1"><QuestionView q={q} /></div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ) : quizQs.length > 0 ? (
                <ol className="space-y-6">
                  {quizQs.map((q: any, i: number) => (
                    <li key={i} className="flex gap-4">
                      <span className="flex-shrink-0 font-semibold text-primary w-7">{i + 1}.</span>
                      <div className="flex-1"><QuestionView q={q} /></div>
                    </li>
                  ))}
                </ol>
              ) : <p className="text-muted-foreground">No quiz items.</p>}
            </SectionBlock>

            {/* Answer Key */}
            <SectionBlock icon={<CheckCircle2 className="h-5 w-5" />} eyebrow="Module 4" title="Answer Key">
              <AnswerKeyView ak={ak} />
            </SectionBlock>

            {/* Rubric */}
            <SectionBlock
              icon={<ClipboardList className="h-5 w-5" />}
              eyebrow="Module 5"
              title="Rubric"
              onCopy={() => copy(JSON.stringify(content.rubric, null, 2))}
            >
              <RubricView rubric={content.rubric} />
            </SectionBlock>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionView({ q }: { q: any }) {
  if (typeof q === "string") return <span>{q}</span>;
  const prompt = q.prompt ?? q.question ?? "";
  return (
    <div className="space-y-1">
      <div className="font-medium">{prompt}</div>
      {q.options && (
        <ul className="space-y-0.5 text-muted-foreground">
          {q.options.map((o: string, j: number) => <li key={j}>{String.fromCharCode(65 + j)}. {o}</li>)}
        </ul>
      )}
      {q.items && (
        <ul className="space-y-0.5 text-muted-foreground">
          {q.items.map((it: any, j: number) => <li key={j}>{it.term} — {it.definition}</li>)}
        </ul>
      )}
      {q.labels && <p className="text-muted-foreground text-xs">Labels: {q.labels.join(", ")}</p>}
      {q.diagram_description && <p className="text-muted-foreground text-xs italic">{q.diagram_description}</p>}
      {q.type && <p className="text-xs text-muted-foreground/70">Type: {q.type}</p>}
    </div>
  );
}

function AnswersView({ answers }: { answers: any }) {
  if (!answers || (typeof answers === "object" && Object.keys(answers).length === 0)) {
    return <p className="text-muted-foreground text-sm">No answers.</p>;
  }
  if (Array.isArray(answers)) {
    return (
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        {answers.map((a, i) => <li key={i}>{typeof a === "string" ? a : JSON.stringify(a)}</li>)}
      </ol>
    );
  }
  return (
    <dl className="space-y-2 text-sm">
      {Object.entries(answers).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="font-medium min-w-8">{k}.</dt>
          <dd className="text-muted-foreground whitespace-pre-wrap">{typeof v === "string" ? v : JSON.stringify(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function AnswerKeyView({ ak }: { ak: any }) {
  if (!ak || (typeof ak === "object" && Object.keys(ak).length === 0)) {
    return <p className="text-muted-foreground text-sm">No answer key.</p>;
  }
  if (typeof ak === "string") return <p className="whitespace-pre-wrap">{ak}</p>;
  return (
    <div className="space-y-8">
      {Object.entries(ak).map(([section, val]) => (
        <div key={section}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {section.replace(/_/g, " ")}
          </h3>
          <AnswerSectionView val={val} />
        </div>
      ))}
    </div>
  );
}

function AnswerSectionView({ val }: { val: any }) {
  if (val == null) return <p className="text-muted-foreground text-sm">—</p>;
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return <p className="whitespace-pre-wrap">{String(val)}</p>;
  }
  if (Array.isArray(val)) {
    return (
      <ol className="list-decimal pl-5 space-y-2">
        {val.map((item, i) => (
          <li key={i}><AnswerItemView item={item} /></li>
        ))}
      </ol>
    );
  }
  // object: could be tiered (easy/medium/hard) or numbered keys
  return (
    <div className="space-y-4">
      {Object.entries(val).map(([k, v]) => (
        <div key={k}>
          <div className="font-medium capitalize text-foreground mb-1">{k.replace(/_/g, " ")}</div>
          <div className="pl-3 border-l-2 border-primary/30"><AnswerSectionView val={v} /></div>
        </div>
      ))}
    </div>
  );
}

function AnswerItemView({ item }: { item: any }) {
  if (item == null) return <span>—</span>;
  if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
    return <span>{String(item)}</span>;
  }
  if (Array.isArray(item)) return <AnswerSectionView val={item} />;
  const q = item.question ?? item.prompt ?? item.q;
  const a = item.answer ?? item.correct_answer ?? item.correct ?? item.a;
  const explanation = item.explanation ?? item.rationale;
  if (q || a) {
    return (
      <div className="space-y-1">
        {q && <div className="font-medium">{String(q)}</div>}
        {a !== undefined && (
          <div><span className="text-primary font-medium">Answer:</span> {typeof a === "object" ? JSON.stringify(a) : String(a)}</div>
        )}
        {explanation && <div className="text-muted-foreground text-sm">{String(explanation)}</div>}
      </div>
    );
  }
  return (
    <dl className="space-y-1 text-sm">
      {Object.entries(item).map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <dt className="font-medium capitalize min-w-[120px]">{k.replace(/_/g, " ")}:</dt>
          <dd className="text-muted-foreground">{typeof v === "object" ? JSON.stringify(v) : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function RubricView({ rubric }: { rubric: any }) {
  if (!rubric) return <p className="text-muted-foreground text-sm">No rubric.</p>;
  const criteria = rubric.criteria;
  if (Array.isArray(criteria)) {
    return (
      <div className="space-y-4">
        {rubric.title && <h3 className="font-semibold">{rubric.title}</h3>}
        {criteria.map((c: any, i: number) => (
          <div key={i} className="border border-border rounded-lg p-3">
            <div className="font-medium mb-2">{c.name}</div>
            <ul className="space-y-1 text-sm">
              {(c.levels ?? []).map((l: any, j: number) => (
                <li key={j}><span className="font-medium">{l.score}:</span> <span className="text-muted-foreground">{l.description}</span></li>
              ))}
            </ul>
          </div>
        ))}
        {rubric.scoring_guide && <p className="text-sm text-muted-foreground italic">{rubric.scoring_guide}</p>}
      </div>
    );
  }
  return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(rubric, null, 2)}</pre>;
}

function SectionBlock({ icon, eyebrow, title, children, onCopy }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode; onCopy?: () => void }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mt-0.5">
            {icon}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{eyebrow}</div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{title}</h2>
          </div>
        </div>
        {onCopy && (
          <Button size="sm" variant="ghost" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy
          </Button>
        )}
      </div>
      <div className="space-y-8 text-[15px] leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function SubBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      <div>{children}</div>
    </div>
  );
}

