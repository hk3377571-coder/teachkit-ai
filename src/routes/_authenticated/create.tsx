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
import { Sparkles, Loader2 } from "lucide-react";
import { getWebhookUrl } from "@/lib/webhook";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff } from "lucide-react";
import { useRef } from "react";

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
  const [result, setResult] = useState<any | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const parseVoiceInput = (transcript: string) => {
    const t = transcript.toLowerCase();
    const updates: Partial<typeof form> = {};

    const subjectMatch = SUBJECTS.find((s) => t.includes(s.toLowerCase()));
    if (subjectMatch) { updates.subject = subjectMatch; setSubjectChoice(subjectMatch); }

    const semMatch = t.match(/semester\s*(\d+)/);
    if (semMatch) {
      const n = parseInt(semMatch[1], 10);
      if (n >= 1 && n <= 8) updates.grade = `Semester ${n}`;
    }

    const durMatch = t.match(/(30|45|60)\s*(minutes?|min)/);
    if (durMatch) updates.duration = `${durMatch[1]} min` as any;

    if (/\bhindi\b/.test(t)) updates.language = "Hindi";
    else if (/\benglish\b/.test(t)) updates.language = "English";

    if (/\badvanced\b/.test(t)) updates.difficulty = "Advanced";
    else if (/\bintermediate\b/.test(t)) updates.difficulty = "Intermediate";
    else if (/\bbeginner\b/.test(t)) updates.difficulty = "Beginner";

    const topicMatch = transcript.match(/topic(?:\s+is)?\s+([^.,;]+?)(?:[.,;]|\s+(?:for|in|with|duration|objective|semester|grade|language|difficulty)\b|$)/i);
    if (topicMatch) updates.topic = topicMatch[1].trim();

    const objMatch = transcript.match(/objectives?(?:\s+(?:is|are))?\s+(.+?)(?:[.;]|$)/i);
    if (objMatch) updates.objectives = objMatch[1].trim();

    if (Object.keys(updates).length === 0 && !form.topic) {
      updates.topic = transcript.trim();
    }

    setForm((p) => ({ ...p, ...updates }));
    toast.success(`Filled ${Object.keys(updates).length} field(s) from voice`);
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice recognition not supported in this browser"); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      parseVoiceInput(transcript);
    };
    rec.onerror = (e: any) => { toast.error(`Voice error: ${e.error}`); setListening(false); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const sanitizeText = (text: string) =>
    text
      .replace(/```/g, "")
      .replace(/[#"{}]/g, "")
      .replace(/[^a-zA-Z0-9\s.,!?';:()\-/]/g, "");

  const noNewlines = (text: string) => text.replace(/\n/g, " ");

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    setResponse(null);
    setResult(null);

    let pdfUrl: string | null = null;
    if (pdfFile && user) {
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
      // Bucket is private; store the object path. Generate signed URLs on read.
      pdfUrl = path;
    } else if (pdfFile && !user) {
      toast.message("PDF uploads require sign in — continuing without attachment.");
    }

    const safeTopic = sanitizeText(parsed.data.topic);
    const safeObjectives = sanitizeText(parsed.data.objectives);

    const { data: lesson, error } = await supabase.from("lessons").insert({
      user_id: user?.id ?? null,
      subject: parsed.data.subject,
      grade: parsed.data.grade,
      topic: safeTopic,
      duration: parsed.data.duration,
      objectives: safeObjectives,
      language: parsed.data.language,
      difficulty: parsed.data.difficulty,
      status: "generating",
      pdf_url: pdfUrl,
    }).select().single();
    if (error || !lesson) { setLoading(false); return toast.error(error?.message ?? "Failed"); }

    try {
      const webhookBody = {
        subject: noNewlines(parsed.data.subject),
        grade: noNewlines(parsed.data.grade),
        topic: noNewlines(safeTopic),
        duration: noNewlines(parsed.data.duration),
        objectives: noNewlines(safeObjectives),
        language: noNewlines(parsed.data.language),
        difficulty_level: noNewlines(parsed.data.difficulty),
        board: noNewlines(parsed.data.board),
        num_questions: parsed.data.num_questions,
        lesson_style: noNewlines(parsed.data.lesson_style),
      };
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookBody),
      });
      if (!res.ok) throw new Error(`Webhook ${res.status}`);
      const text = await res.text();
      console.log("[Create] raw webhook response:", text);
      setResponse(text);
      let json: any = null;
      try {
        const outer = text ? JSON.parse(text) : null;
        console.log("[Create] outer parsed:", outer);
        let inner = outer?.choices?.[0]?.message?.content ?? outer;
        if (typeof inner === "string") {
          const stripped = inner.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
          try { inner = JSON.parse(stripped); } catch { /* keep string */ }
        }
        json = inner;
        console.log("[Create] parsed lesson json:", json);
      } catch { json = null; }
      if (json) {
        await supabase.from("lesson_content").insert({ lesson_id: lesson.id, lesson_json: json });
        await supabase.from("lessons").update({
          status: "ready",
          lesson_plan: json.lesson_plan ?? null,
          worksheet: json.worksheet ?? null,
          quiz: json.quiz ?? null,
          answer_key: json.answer_key ?? null,
        }).eq("id", lesson.id);
        setResult(json);
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
          <div className="flex gap-2">
            <Input value={form.topic} onChange={(e) => set("topic", e.target.value)} placeholder="e.g. Photosynthesis" />
            <Button
              type="button"
              variant={listening ? "destructive" : "outline"}
              size="icon"
              onClick={listening ? stopListening : startListening}
              title={listening ? "Stop recording" : "Voice fill"}
              className={listening ? "animate-pulse" : ""}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          </div>
          {listening && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Listening… try: "Subject Mathematics, Semester 3, topic is Algebra, 45 minutes, English, beginner"
            </p>
          )}
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
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading PDF…</>
          ) : loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-1" /> Generate Lesson Kit</>
          )}
        </Button>

        {loading && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Generating your lesson kit…</span>
          </div>
        )}

        {result && (
          <div className="grid gap-4 pt-4">
            <ResultCard title="Lesson Plan" data={result.lesson_plan} />
            <ResultCard title="Worksheet" data={result.worksheet} />
            <ResultCard title="Quiz" data={result.quiz} />
            <ResultCard title="Answer Key" data={result.answer_key} />
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

function ResultCard({ title, data }: { title: string; data: any }) {
  if (data == null) return null;
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{text}</pre>
      </CardContent>
    </Card>
  );
}
