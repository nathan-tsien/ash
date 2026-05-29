"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@ash/ui/input";
import { Button } from "@ash/ui/button";
import { Link } from "@/i18n/navigation";

export function VerifyEmailForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? t("errorInvalidCode"));
      }
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorNetwork"));
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t("errorNetwork")}
        </p>
        <Link href="/register" className="mt-2 text-sm hover:text-foreground transition-colors">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("verifyEmailDescription", { email })}
      </p>
      <div className="space-y-2">
        <label htmlFor="code" className="text-sm font-medium">
          {t("codeLabel")}
        </label>
        <Input
          id="code"
          type="text"
          placeholder={t("codePlaceholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          maxLength={6}
          autoComplete="one-time-code"
          inputMode="numeric"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("verifyLoading") : t("verifyAction")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground transition-colors">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
