import { redirect, notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { getStore } from "@/lib/store";
import SessionClient from "./SessionClient";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/login");
  const { id } = await params;
  const session = await getStore().getSession(id);
  if (!session) notFound();
  return <SessionClient id={id} initialName={session.name} initialRoom={session.room} />;
}
