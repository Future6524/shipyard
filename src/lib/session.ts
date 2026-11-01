import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

export async function currentAdmin() {
  return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Call at the top of every admin page and server action. Returns the actor's name. */
export async function requireAdmin(): Promise<string> {
  const name = await currentAdmin();
  if (!name) redirect("/admin/login");
  return name;
}
