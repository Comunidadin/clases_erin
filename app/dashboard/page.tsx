import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  if (!(await isAdmin())) redirect("/login");
  return <DashboardClient />;
}
