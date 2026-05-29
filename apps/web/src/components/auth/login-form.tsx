"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@ash/ui/input";
import { Button } from "@ash/ui/button";
import { useAuth } from "@/context/auth-context";
import { Link } from "@/i18n/navigation";

export function LoginForm() {
  const t = useTranslations("Auth");
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          {t("emailLabel")}
        </label>
        <Input
          id="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          {t("passwordLabel")}
        </label>
        <Input
          id="password"
          type="password"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("loginLoading") : t("loginAction")}
      </Button>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Link href="/forgot-password" className="hover:text-foreground transition-colors">
          {t("forgotPasswordLink")}
        </Link>
        <Link href="/register" className="hover:text-foreground transition-colors">
          {t("noAccount")} {t("registerLink")}
        </Link>
      </div>
    </form>
  );
}
