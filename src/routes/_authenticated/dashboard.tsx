import { createFileRoute } from "@tanstack/react-router";
import { LessonKitForm } from "./create";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
  return <LessonKitForm />;
}
