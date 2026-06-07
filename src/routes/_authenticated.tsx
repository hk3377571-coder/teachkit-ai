import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AIAssistant } from "@/components/AIAssistant";
import { AppSidebar } from "@/components/AppSidebar";

function Layout() {
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <AIAssistant />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
});