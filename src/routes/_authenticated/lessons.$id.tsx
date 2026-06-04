import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy } from "lucide-react";
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
  const worksheetQs: any[] = Array.isArray(content?.worksheet)
    ? content!.worksheet
    : (content?.worksheet?.questions ?? []);
  const quizQs: any[] = Array.isArray(content?.quiz)
    ? content!.quiz
    : (content?.quiz?.questions ?? content?.quiz?.mcqs ?? []);
  const ak: any = content?.answer_key ?? {};
  const wsAnswers = ak.worksheet ?? ak.worksheet_answers ?? {};
  const quizAnswers = ak.quiz ?? ak.quiz_answers ?? {};

  return (
    <div>
      <PageHeader title={lesson.topic} subtitle={`${lesson.subject} · ${lesson.grade} · ${lesson.duration}`}>
        <Button variant="outline" size="sm" asChild><Link to="/lessons"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      </PageHeader>

      <div className="p-8 max-w-4xl mx-auto">
        {!content ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <h3 className="font-semibold">No generated content yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Status: {lesson.status}. Once your webhook returns content, it'll appear here.</p>
          </div>
        ) : (
          <Tabs defaultValue="plan">
            <TabsList className="mb-6">
              <TabsTrigger value="plan">Lesson Plan</TabsTrigger>
              <TabsTrigger value="worksheet">Worksheet</TabsTrigger>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
              <TabsTrigger value="answers">Answer Key</TabsTrigger>
              <TabsTrigger value="rubric">Rubric</TabsTrigger>
            </TabsList>

            <TabsContent value="plan" className="space-y-4">
              {lp.title && <h2 className="text-xl font-semibold">{lp.title}</h2>}
              {lp.learning_objectives && (
                <Section title="Learning Objectives">
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {lp.learning_objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
                  </ul>
                </Section>
              )}
              {lp.materials && (
                <Section title="Materials">
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {lp.materials.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </Section>
              )}
              {lp.procedure && (
                <Section title="Procedure">
                  <ol className="space-y-3 text-sm">
                    {lp.procedure.map((p: any, i: number) => (
                      <li key={i} className="border-l-2 border-primary/40 pl-3">
                        <div className="font-medium">Step {p.step ?? i + 1}{p.time ? ` · ${p.time}` : ""}</div>
                        <p className="text-muted-foreground whitespace-pre-wrap">{p.activity ?? (typeof p === "string" ? p : JSON.stringify(p))}</p>
                      </li>
                    ))}
                  </ol>
                </Section>
              )}
              {lp.differentiation && (
                <Section title="Differentiation">
                  <dl className="space-y-2 text-sm">
                    {Object.entries(lp.differentiation).map(([k, v]) => (
                      <div key={k}><dt className="font-medium capitalize">{k}</dt><dd className="text-muted-foreground">{String(v)}</dd></div>
                    ))}
                  </dl>
                </Section>
              )}
              {lp.assessment && (
                <Section title="Assessment">
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {(Array.isArray(lp.assessment) ? lp.assessment : [lp.assessment]).map((a: string, i: number) => <li key={i}>{a}</li>)}
                  </ul>
                </Section>
              )}
              {/* Legacy fields */}
              {["warm_up","concept_explanation","activity","recap","homework"].map((k) => lp[k] && (
                <Section key={k} title={k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}>
                  <p className="whitespace-pre-wrap text-sm">{lp[k]}</p>
                </Section>
              ))}
            </TabsContent>

            <TabsContent value="worksheet">
              <Section title={content.worksheet?.title ?? "Worksheet"} onCopy={() => copy(JSON.stringify(content.worksheet, null, 2))}>
                {content.worksheet?.instructions && <p className="text-sm text-muted-foreground mb-3 italic">{content.worksheet.instructions}</p>}
                <ol className="list-decimal pl-5 space-y-3 text-sm">
                  {worksheetQs.map((q: any, i: number) => <li key={i}><QuestionView q={q} /></li>)}
                  {worksheetQs.length === 0 && <p className="text-muted-foreground">No worksheet items.</p>}
                </ol>
              </Section>
            </TabsContent>

            <TabsContent value="quiz">
              <Section title={content.quiz?.title ?? "Quiz"} onCopy={() => copy(JSON.stringify(content.quiz, null, 2))}>
                {content.quiz?.instructions && <p className="text-sm text-muted-foreground mb-3 italic">{content.quiz.instructions}</p>}
                <ol className="list-decimal pl-5 space-y-3 text-sm">
                  {quizQs.map((q: any, i: number) => <li key={i}><QuestionView q={q} /></li>)}
                  {quizQs.length === 0 && <p className="text-muted-foreground">No quiz items.</p>}
                </ol>
              </Section>
            </TabsContent>

            <TabsContent value="answers" className="space-y-4">
              <Section title="Worksheet Answers">
                <AnswersView answers={wsAnswers} />
              </Section>
              <Section title="Quiz Answers">
                <AnswersView answers={quizAnswers} />
              </Section>
            </TabsContent>

            <TabsContent value="rubric">
              <Section title="Rubric" onCopy={() => copy(JSON.stringify(content.rubric, null, 2))}>
                <RubricView rubric={content.rubric} />
              </Section>
            </TabsContent>
          </Tabs>
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

function Section({ title, children, onCopy }: { title: string; children: React.ReactNode; onCopy?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {onCopy && <Button size="sm" variant="ghost" onClick={onCopy}><Copy className="h-3.5 w-3.5 mr-1" /> Copy</Button>}
      </div>
      {children}
    </div>
  );
}
