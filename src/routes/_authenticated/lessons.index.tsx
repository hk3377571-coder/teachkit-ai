import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ExternalLink, Search, PlusCircle, Library, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/lessons/")({ component: LessonsIndex });

interface Lesson { id: string; topic: string; subject: string; grade: string; created_at: string; status: string; }

function LessonsIndex() {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("all");

  const load = () => supabase.from("lessons").select("*").order("created_at", { ascending: false })
    .then(({ data }) => setLessons((data ?? []) as Lesson[]));

  useEffect(() => { load(); }, []);

  const subjects = Array.from(new Set((lessons ?? []).map((l) => l.subject)));
  const filtered = (lessons ?? []).filter((l) =>
    (subject === "all" || l.subject === subject) &&
    (q === "" || l.topic.toLowerCase().includes(q.toLowerCase()))
  );

  const del = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Lesson deleted");
    load();
  };

  const share = async (id: string) => {
    const url = `${window.location.origin}/lesson/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Public link copied", { description: url });
    } catch {
      toast.info(url);
    }
  };

  return (
    <div>
      <PageHeader title="My Lessons" subtitle="Search and manage your saved lesson kits.">
        <Button asChild><Link to="/create"><PlusCircle className="h-4 w-4 mr-1" /> New Lesson</Link></Button>
      </PageHeader>

      <div className="p-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by topic" className="pl-9" />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="All subjects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {lessons === null ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-secondary animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <Library className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No lessons found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try a different search, or create a new lesson.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((l) => (
              <div key={l.id} className="rounded-xl border border-border bg-card p-5 flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-primary/30">
                <div className="flex items-center justify-between gap-2">
                  <span className="subject-badge" data-subject={l.subject}>{l.subject}</span>
                  <span className="text-[11px] text-muted-foreground">{l.grade}</span>
                </div>
                <div className="font-semibold mt-3 line-clamp-2">{l.topic}</div>
                <div className="text-xs text-muted-foreground mt-2">{new Date(l.created_at).toLocaleDateString()}</div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" asChild className="flex-1">
                    <Link to="/lessons/$id" params={{ id: l.id }}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => share(l.id)} title="Share public link"><Share2 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
