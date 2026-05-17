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
interface Content {
  lesson_plan?: { warm_up?: string; concept_explanation?: string; activity?: string; recap?: string; homework?: string };
  worksheet?: any[];
  quiz?: { mcqs?: any[]; short_questions?: any[] };
  answer_key?: { worksheet_answers?: any[]; quiz_answers?: any[] };
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
      setContent((c?.lesson_json as Content) ?? null);
      setLoading(false);
    })();
  }, [id]);

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied"); };

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!lesson) return <div className="p-8">Lesson not found.</div>;

  const lp = content?.lesson_plan ?? {};

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
            </TabsList>

            <TabsContent value="plan" className="space-y-4">
              {[
                ["Warm Up", lp.warm_up],
                ["Concept Explanation", lp.concept_explanation],
                ["Activity", lp.activity],
                ["Recap", lp.recap],
                ["Homework", lp.homework],
              ].map(([title, body]) => (
                <Section key={title as string} title={title as string} onCopy={() => copy(String(body ?? ""))}>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{body || <span className="text-muted-foreground">—</span>}</p>
                </Section>
              ))}
            </TabsContent>

            <TabsContent value="worksheet">
              <Section title="Worksheet" onCopy={() => copy(JSON.stringify(content.worksheet, null, 2))}>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  {(content.worksheet ?? []).map((q, i) => <li key={i}>{typeof q === "string" ? q : q.question ?? JSON.stringify(q)}</li>)}
                  {(!content.worksheet || content.worksheet.length === 0) && <p className="text-muted-foreground">No worksheet items.</p>}
                </ol>
              </Section>
            </TabsContent>

            <TabsContent value="quiz" className="space-y-4">
              <Section title="Multiple Choice">
                <ol className="list-decimal pl-5 space-y-3 text-sm">
                  {(content.quiz?.mcqs ?? []).map((q: any, i) => (
                    <li key={i}>
                      <div className="font-medium">{q.question ?? String(q)}</div>
                      {q.options && <ul className="mt-1 space-y-0.5 text-muted-foreground">{q.options.map((o: string, j: number) => <li key={j}>{String.fromCharCode(65 + j)}. {o}</li>)}</ul>}
                    </li>
                  ))}
                </ol>
              </Section>
              <Section title="Short Questions">
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  {(content.quiz?.short_questions ?? []).map((q: any, i) => <li key={i}>{typeof q === "string" ? q : q.question ?? JSON.stringify(q)}</li>)}
                </ol>
              </Section>
            </TabsContent>

            <TabsContent value="answers" className="space-y-4">
              <Section title="Worksheet Answers">
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  {(content.answer_key?.worksheet_answers ?? []).map((a, i) => <li key={i}>{typeof a === "string" ? a : JSON.stringify(a)}</li>)}
                </ol>
              </Section>
              <Section title="Quiz Answers">
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  {(content.answer_key?.quiz_answers ?? []).map((a, i) => <li key={i}>{typeof a === "string" ? a : JSON.stringify(a)}</li>)}
                </ol>
              </Section>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
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
