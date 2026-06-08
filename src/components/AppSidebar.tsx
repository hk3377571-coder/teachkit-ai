import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, Library, Settings, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const items = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/create", label: "Create Lesson", icon: PlusCircle },
  { to: "/lessons", label: "My Lessons", icon: Library },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/80 backdrop-blur relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <Link to="/" className="relative flex items-center gap-2.5 h-16 px-5 border-b border-border">
        <div className="h-9 w-9 rounded-lg bg-gradient-cta text-white grid place-items-center shadow-glow">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">Teaching Studio</span>
      </Link>
      <nav className="relative flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 overflow-hidden ${
                active
                  ? "bg-gradient-cta text-white font-medium shadow-glow"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground hover:translate-x-0.5"
              }`}
            >
              <it.icon className={`h-4 w-4 transition-transform duration-200 ${active ? "" : "group-hover:scale-110 group-hover:text-primary"}`} />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={async () => { await signOut(); toast.success("Logged out"); navigate({ to: "/" }); }}
        className="relative m-3 flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </aside>
  );
}
