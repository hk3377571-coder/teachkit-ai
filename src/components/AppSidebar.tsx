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
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <Link to="/" className="flex items-center gap-2 h-16 px-5 border-b border-border">
        <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center">
          <Sparkles className="h-4 w-4" />
        </div>
        <span className="font-semibold tracking-tight">Teaching Studio</span>
      </Link>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const active = path === it.to || (it.to !== "/dashboard" && path.startsWith(it.to));
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <it.icon className="h-4 w-4" /> {it.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={async () => { await signOut(); toast.success("Logged out"); navigate({ to: "/" }); }}
        className="m-3 flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
    </aside>
  );
}
