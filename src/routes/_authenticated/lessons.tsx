import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/lessons")({ component: LessonsLayout });

function LessonsLayout() {
  return <Outlet />;
}
