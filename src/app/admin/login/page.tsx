import { adminPassword } from "@/lib/auth";
import { Orb } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="auth">
      <Orb className="orb-auth" />
      <div className="card auth-card reveal">
        <p className="kicker kicker-dark">Admin</p>
        <h1>Sign in to Shipyard</h1>
        {adminPassword() ? (
          <LoginForm />
        ) : (
          <p className="error">Admin is disabled: set the ADMIN_PASSWORD environment variable.</p>
        )}
        {process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD && (
          <p className="muted small">Local dev: ADMIN_PASSWORD is unset, so the password is “admin”.</p>
        )}
      </div>
    </div>
  );
}
