import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

interface Lesson { id: string; topic: string; subject: string; grade: string; created_at: string; status: string; }

function Dashboard() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[] | null>(null);

  useEffect(() => {
    supabase.from("lessons").select("*").order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setLessons((data ?? []) as Lesson[]));
  }, []);

  const total = lessons?.length ?? 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = (lessons ?? []).filter((l) => new Date(l.created_at).getTime() > weekAgo).length;
  const subjects = new Set((lessons ?? []).map((l) => l.subject)).size;

  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0];

  return (
    <div>
      <PageHeader title={`Welcome back, ${name}`} subtitle="Here's what's happening with your lessons.">
        <Button asChild><Link to="/create"><PlusCircle className="h-4 w-4 mr-1" /> Create New Lesson</Link></Button>
      </PageHeader>

      <div className="p-8 pt-6 space-y-8">
        <div className="grid sm:grid-cols-3 gap-4">
          <StatCard icon={BookOpen} label="Total Lessons" value={total} />
          <StatCard icon={CalendarDays} label="This Week" value={thisWeek} />
          <StatCard icon={Sparkles} label="Subjects Used" value={subjects} />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Recent lessons</h2>
          {lessons === null ? (
            <div className="grid gap-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-secondary animate-pulse" />)}</div>
          ) : lessons.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {lessons.slice(0, 6).map((l) => (
                <Link key={l.id} to="/lessons/$id" params={{ id: l.id }} className="flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors">
                  <div>
                    <div className="font-medium">{l.topic}</div>
                    <div className="text-sm text-muted-foreground">{l.subject} · {l.grade}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground text-sm"><Icon className="h-4 w-4" /> {label}</div>
      <div className="mt-2 text-3xl font-display">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <div className="mx-auto h-10 w-10 rounded-full bg-accent grid place-items-center mb-3"><Sparkles className="h-5 w-5" /></div>
      <h3 className="font-semibold">No lessons yet</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first AI lesson kit in seconds.</p>
      <Button asChild><Link to="/create">Create Lesson</Link></Button>
    </div>
  );
}
