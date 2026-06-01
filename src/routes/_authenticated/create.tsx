import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { getWebhookUrl } from "@/lib/webhook";

export const Route = createFileRoute("/_authenticated/create")({ component: Create });

const SUBJECTS = ["Mathematics", "Science", "English", "History", "Geography", "Computer Science", "Physics", "Chemistry", "Biology", "Social Studies"];
const SUBJECT_OPTIONS = [...SUBJECTS, "Custom"];
const SEMESTERS = ["Semester 1","Semester 2","Semester 3","Semester 4","Semester 5","Semester 6","Semester 7","Semester 8"];
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "Cambridge", "Other"];
const LESSON_STYLES = ["Lecture", "Interactive", "Activity-based", "Discussion", "Project-based", "Flipped Classroom"];

const WEBHOOK_URL = "https://hook.us2.make.com/pr59tqaxqfc9fjje7oftoxfz8nlopxm6";

const schema = z.object({
  subject: z.string().min(1),
  grade: z.string().min(1),
  topic: z.string().trim().min(2).max(200),
  duration: z.enum(["30 min", "45 min", "60 min"]),
  objectives: z.string().trim().max(2000).optional().default(""),
  language: z.enum(["English", "Hindi"]),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]),
  board: z.string().min(1),
  num_questions: z.number().int().min(1).max(100),
  lesson_style: z.string().min(1),
});

export function LessonKitForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    subject: "", grade: "", topic: "", duration: "45 min" as const,
    objectives: "", language: "English" as const, difficulty: "Beginner" as const,
    board: "", num_questions: 10, lesson_style: "",
  });
  const [subjectChoice, setSubjectChoice] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const sanitizeText = (text: string) =>
    text
      .replace(/```/g, "")
      .replace(/[#"{}]/g, "")
      .replace(/[^a-zA-Z0-9\s.,!?';:()\-/]/g, "");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!user) return;
    setLoading(true);
    setResponse(null);

    let pdfUrl: string | null = null;
    if (pdfFile) {
      setUploading(true);
      const path = `${user.id}/${Date.now()}-${pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("lesson-pdfs")
        .upload(path, pdfFile, { contentType: "application/pdf", upsert: false });
      setUploading(false);
      if (upErr) {
        setLoading(false);
        return toast.error(`PDF upload failed: ${upErr.message}`);
      }
      pdfUrl = supabase.storage.from("lesson-pdfs").getPublicUrl(path).data.publicUrl;
    }

    const { data: lesson, error } = await supabase.from("lessons").insert({
      user_id: user.id,
      subject: parsed.data.subject,
      grade: parsed.data.grade,
      topic: parsed.data.topic,
      duration: parsed.data.duration,
      objectives: parsed.data.objectives,
      language: parsed.data.language,
      difficulty: parsed.data.difficulty,
      status: "generating",
      pdf_url: pdfUrl,
    }).select().single();
    if (error || !lesson) { setLoading(false); return toast.error(error?.message ?? "Failed"); }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, lesson_id: lesson.id, pdf_url: pdfUrl }),
      });
      if (!res.ok) throw new Error(`Webhook ${res.status}`);
      const text = await res.text();
      setResponse(text);
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }
      if (json) {
        await supabase.from("lesson_content").insert({ lesson_id: lesson.id, lesson_json: json });
        await supabase.from("lessons").update({ status: "ready" }).eq("id", lesson.id);
      } else {
        await supabase.from("lessons").update({ status: "ready" }).eq("id", lesson.id);
      }
      toast.success("Lesson generated");
    } catch (err: any) {
      await supabase.from("lessons").update({ status: "error" }).eq("id", lesson.id);
      toast.error(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Create Lesson" subtitle="Fill the details — we'll generate a complete kit." />
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto p-8 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Subject">
            <Select
              value={subjectChoice}
              onValueChange={(v) => {
                setSubjectChoice(v);
                set("subject", v === "Custom" ? "" : v);
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>{SUBJECT_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            {subjectChoice === "Custom" && (
              <Input
                className="mt-2"
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Enter your custom study"
              />
            )}
          </Field>
          <Field label="Semester">
            <Select value={form.grade} onValueChange={(v) => set("grade", v)}>
              <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
              <SelectContent>{SEMESTERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Topic">
          <Input value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Photosynthesis" />
        </Field>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Duration">
            <Select value={form.duration} onValueChange={(v) => set("duration", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["30 min","45 min","60 min"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Language">
            <Select value={form.language} onValueChange={(v) => set("language", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["English","Hindi"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Difficulty">
            <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Beginner","Intermediate","Advanced"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Board">
            <Select value={form.board} onValueChange={(v) => set("board", v)}>
              <SelectTrigger><SelectValue placeholder="Select board" /></SelectTrigger>
              <SelectContent>{BOARDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Number of Questions">
            <Input
              type="number"
              min={1}
              max={100}
              value={form.num_questions}
              onChange={(e) => set("num_questions", parseInt(e.target.value || "0", 10))}
            />
          </Field>
          <Field label="Lesson Style">
            <Select value={form.lesson_style} onValueChange={(v) => set("lesson_style", v)}>
              <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
              <SelectContent>{LESSON_STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Learning Objectives">
          <Textarea rows={4} value={form.objectives} onChange={(e) => set("objectives", e.target.value)} placeholder="What should students be able to do at the end?" />
        </Field>

        <Field label="Subject PDF (optional)">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 20 * 1024 * 1024) {
                toast.error("PDF must be under 20MB");
                e.target.value = "";
                return;
              }
              setPdfFile(f);
            }}
          />
          {pdfFile && (
            <p className="text-xs text-muted-foreground">
              {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </Field>

        <Button type="submit" disabled={loading} className="w-full" size="lg">
          {uploading ? "Uploading PDF…" : loading ? "Generating…" : <><Sparkles className="h-4 w-4 mr-1" /> Generate Lesson Kit</>}
        </Button>

        {response && (
          <div className="space-y-2">
            <Label>Response</Label>
            <pre className="rounded-md border bg-muted p-4 text-xs overflow-auto max-h-96 whitespace-pre-wrap">{response}</pre>
          </div>
        )}
      </form>
    </div>
  );
}

function Create() {
  return <LessonKitForm />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}
