import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, ListChecks, Library, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

const features = [
  { icon: BookOpen, title: "AI Lesson Plans", desc: "Structured plans with warm-ups, activities, recap and homework." },
  { icon: FileText, title: "Worksheet Generator", desc: "Print-ready worksheets aligned to your topic and grade." },
  { icon: ListChecks, title: "Quiz + Answer Keys", desc: "MCQs and short questions with auto-generated answer keys." },
  { icon: Library, title: "Saved Lesson Library", desc: "Every kit you create, organized and searchable." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">AI Teaching Studio</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/login">Log in</Link></Button>
            <Button asChild><Link to="/signup">Start free</Link></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3 w-3" /> Built for teachers, tutors and trainers
          </div>
          <h1 className="font-display text-5xl md:text-7xl leading-[1.05] tracking-tight">
            Generate Complete Lesson Kits in Seconds
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered lesson planning for teachers, tutors, and trainers. Plans, worksheets, quizzes and answer keys — ready to use.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/signup">Start Creating <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 pb-28">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 hover:shadow-sm transition-shadow">
                <div className="h-9 w-9 rounded-lg bg-accent grid place-items-center mb-4">
                  <f.icon className="h-4 w-4 text-foreground" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} AI Teaching Studio</span>
          <span>Crafted for educators.</span>
        </div>
      </footer>
    </div>
  );
}
