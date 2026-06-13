"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@ash/ui/button";
import { Input } from "@ash/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@ash/ui/dialog";
import { useAuth } from "@/context/auth-context";
import { LoginForm } from "@/components/auth/login-form";

export function QuickStartDialog() {
  const t = useTranslations("Home");
  const router = useRouter();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt) return;

    sessionStorage.setItem("ash_pending_prompt", prompt);

    if (user) {
      router.push("/app");
    } else {
      setShowLogin(true);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("quickStartPlaceholder")}
            className="h-12 rounded-xl border-border bg-card pl-10 pr-4 text-sm shadow-sm placeholder:text-muted-foreground/70 focus-visible:ring-foreground/20"
            aria-label={t("quickStartAria")}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          className="h-12 gap-2 rounded-xl px-6 shadow-sm"
        >
          {t("quickStartCta")}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </form>

      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent
          className="sm:max-w-md"
          closeAriaLabel={t("loginDialogCloseAria")}
        >
          <DialogHeader>
            <DialogTitle>{t("loginDialogTitle")}</DialogTitle>
            <DialogDescription>{t("loginDialogBody")}</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <LoginForm />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
