"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroyCurrentSession, verifyPassword } from "@/lib/auth";

function backWithError(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    backWithError("Username and password are required.");
  }

  const user = await db.user.findUnique({ where: { username } });
  // Always run bcrypt to keep the timing identical whether the user exists or not.
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    backWithError("Invalid username or password.");
  }

  await createSession(user.id);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/");
}
