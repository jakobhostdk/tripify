"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { getClientIp } from "@/lib/ip";
import { opaqueId, tripId } from "@/lib/ids";

const USERNAME_RE = /^[a-z0-9_-]{3,24}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function backWithError(message: string): never {
  redirect(`/register?error=${encodeURIComponent(message)}`);
}

export async function registerAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const cotripWith = String(formData.get("cotripWith") ?? "").trim();
  const cotripOptIn = formData.get("cotripOptIn") === "on";

  const email = emailRaw === "" ? null : emailRaw;

  if (!USERNAME_RE.test(username)) {
    backWithError("Username must be 3–24 letters, digits, _ or -.");
  }
  if (email && !EMAIL_RE.test(email)) {
    backWithError("That doesn't look like a valid email.");
  }
  if (password.length < 8) {
    backWithError("Password must be at least 8 characters.");
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    backWithError("That username is already taken.");
  }
  if (email) {
    const existingEmail = await db.user.findUnique({ where: { email } });
    if (existingEmail) {
      backWithError("That email is already registered.");
    }
  }

  const ip = await getClientIp();
  const passwordHash = await hashPassword(password);

  const user = await db.user.create({
    data: { id: opaqueId(), username, email, passwordHash, signupIp: ip },
  });

  if (cotripOptIn && cotripWith) {
    const partner = await db.user.findUnique({ where: { id: cotripWith } });
    // Only honor the suggestion if the partner still shares this IP within the window.
    // Defends against a stale form submission where the suggested partner has changed.
    if (partner && partner.signupIp === ip) {
      await db.trip.create({
        data: {
          id: tripId(),
          name: `${partner.username} & ${user.username}'s trip`,
          participants: {
            create: [
              { id: opaqueId(), userId: partner.id, displayName: partner.username },
              { id: opaqueId(), userId: user.id, displayName: user.username },
            ],
          },
        },
      });
    }
  }

  await createSession(user.id);
  redirect("/");
}
