# Auth — IAM Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Integrate with the IAM service to enable user registration (with email OTP), login, logout, and password recovery in the ash web app.

**Architecture:** 4-layer design — IAM Client package (generated types + fetch wrapper) → API Routes as BFF (httpOnly cookie management) → Auth Context (client state) → Auth Pages (UI). Middleware guards protected routes.

**Tech Stack:** openapi-typescript + openapi-fetch, Next.js App Router API routes, httpOnly cookies, React Context, next-intl i18n

---

### Task 1: Create `packages/iam-client` with generated types and client

**Files:**
- Create: `packages/iam-client/package.json`
- Create: `packages/iam-client/tsconfig.json`
- Create: `packages/iam-client/src/types.ts` (generated)
- Create: `packages/iam-client/src/client.ts`
- Create: `packages/iam-client/src/index.ts`

- [x] **Step 1: Create package.json**

```json
{
  "name": "@ash/iam-client",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "generate": "openapi-typescript /Users/nathantsien/x/projects/iam/api/openapi.yaml -o src/types.ts",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "openapi-fetch": "^0.14.0"
  },
  "devDependencies": {
    "openapi-typescript": "^7.8.0",
    "typescript": "^5.8.3"
  }
}
```

- [x] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [x] **Step 3: Install dependencies and generate types**

Run: `cd /Users/nathantsien/x/projects/ash && pnpm install && pnpm --filter @ash/iam-client generate`

- [x] **Step 4: Create client.ts**

```ts
import createClient from "openapi-fetch";
import type { paths } from "./types";

const IAM_BASE_URL =
  process.env.IAM_BASE_URL ?? "http://localhost:8090";

export function createIamClient() {
  return createClient<paths>({
    baseUrl: `${IAM_BASE_URL}/v1/apps/ash`,
  });
}

export type IamClient = ReturnType<typeof createIamClient>;
```

- [x] **Step 5: Create index.ts**

```ts
export { createIamClient, type IamClient } from "./client";
export type { paths, components, operations } from "./types";
```

- [x] **Step 6: Verify typecheck passes**

Run: `pnpm --filter @ash/iam-client typecheck`
Expected: No errors

- [x] **Step 7: Commit**

```bash
git add packages/iam-client/
git commit -m "feat: add @ash/iam-client package with generated types"
```

---

### Task 2: Create server-side auth utilities (cookie management)

**Files:**
- Create: `apps/web/src/server/auth.ts`

- [x] **Step 1: Create auth.ts**

```ts
import "server-only";

import { cookies } from "next/headers";

const COOKIE_NAMES = {
  accessToken: "ash_access_token",
  refreshToken: "ash_refresh_token",
  user: "ash_user",
} as const;

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  role: "user" | "admin";
}

export async function setAuthCookies(params: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}) {
  const jar = await cookies();
  const isProd = process.env.NODE_ENV === "production";

  jar.set(COOKIE_NAMES.accessToken, params.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15, // 15 minutes
  });

  jar.set(COOKIE_NAMES.refreshToken, params.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  jar.set(COOKIE_NAMES.user, JSON.stringify(params.user), {
    httpOnly: false,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(COOKIE_NAMES.accessToken);
  jar.delete(COOKIE_NAMES.refreshToken);
  jar.delete(COOKIE_NAMES.user);
}

export async function getAccessToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE_NAMES.accessToken)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE_NAMES.refreshToken)?.value;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAMES.user)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
```

- [x] **Step 2: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/web/src/server/auth.ts
git commit -m "feat: add server-side auth cookie utilities"
```

---

### Task 3: Create API routes (BFF layer)

**Files:**
- Create: `apps/web/src/app/api/auth/login/route.ts`
- Create: `apps/web/src/app/api/auth/register/route.ts`
- Create: `apps/web/src/app/api/auth/logout/route.ts`
- Create: `apps/web/src/app/api/auth/verify-email/route.ts`
- Create: `apps/web/src/app/api/auth/forgot-password/route.ts`
- Create: `apps/web/src/app/api/auth/reset-password/route.ts`

- [x] **Step 1: Create login route**

```ts
import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";
import { setAuthCookies, type AuthUser } from "@/server/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/login", {
    body: {
      email: body.email,
      password: body.password,
    },
  });

  if (error) {
    return NextResponse.json(error, { status: 401 });
  }

  const user: AuthUser = {
    id: data.user_id,
    email: data.email,
    role: data.role,
  };

  await setAuthCookies({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    user,
  });

  return NextResponse.json({ user });
}
```

- [x] **Step 2: Create register route**

```ts
import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/register", {
    body: {
      email: body.email,
      password: body.password,
      display_name: body.display_name,
    },
  });

  if (error) {
    const status = (error as { code?: string }).code === "conflict" ? 409 : 400;
    return NextResponse.json(error, { status });
  }

  return NextResponse.json(data, { status: 201 });
}
```

- [x] **Step 3: Create logout route**

```ts
import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";
import { getRefreshToken, clearAuthCookies } from "@/server/auth";

export async function POST() {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    const client = createIamClient();
    await client.POST("/auth/logout", {
      body: { refresh_token: refreshToken },
    });
  }

  await clearAuthCookies();
  return NextResponse.json({ logged_out: true });
}
```

- [x] **Step 4: Create verify-email route**

```ts
import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/otp/verify", {
    body: {
      email: body.email,
      code: body.code,
    },
  });

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  return NextResponse.json(data);
}
```

- [x] **Step 5: Create forgot-password route**

```ts
import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/password/forgot", {
    body: { email: body.email },
  });

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  return NextResponse.json(data);
}
```

- [x] **Step 6: Create reset-password route**

```ts
import { NextResponse } from "next/server";
import { createIamClient } from "@ash/iam-client";

export async function POST(request: Request) {
  const body = await request.json();
  const client = createIamClient();

  const { data, error } = await client.POST("/auth/password/reset", {
    body: {
      email: body.email,
      code: body.code,
      new_password: body.new_password,
    },
  });

  if (error) {
    return NextResponse.json(error, { status: 400 });
  }

  return NextResponse.json(data);
}
```

- [x] **Step 7: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: No errors

- [x] **Step 8: Commit**

```bash
git add apps/web/src/app/api/auth/
git commit -m "feat: add auth API routes (login, register, logout, verify-email, forgot/reset password)"
```

---

### Task 4: Create Auth Context

**Files:**
- Create: `apps/web/src/context/auth-context.tsx`

- [x] **Step 1: Create auth-context.tsx**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
  role: "user" | "admin";
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readUserFromCookie(): AuthUser | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)ash_user=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1])) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readUserFromCookie());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? "Login failed");
    }

    const { user: u } = await res.json();
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const refreshUser = useCallback(() => {
    setUser(readUserFromCookie());
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
```

- [x] **Step 2: Add AuthProvider to locale layout**

Modify `apps/web/src/app/[locale]/layout.tsx` — add `AuthProvider` inside the provider chain:

After imports, add:
```tsx
import { AuthProvider } from "@/context/auth-context";
```

Wrap children with `AuthProvider` inside `NextIntlClientProvider`:
```tsx
<NextIntlClientProvider locale={locale} messages={messages}>
  <AuthProvider>
    {children}
  </AuthProvider>
</NextIntlClientProvider>
```

- [x] **Step 3: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: No errors

- [x] **Step 4: Commit**

```bash
git add apps/web/src/context/auth-context.tsx apps/web/src/app/[locale]/layout.tsx
git commit -m "feat: add AuthContext provider and wire into locale layout"
```

---

### Task 5: Add i18n strings for auth pages

**Files:**
- Modify: `apps/web/messages/zh.json`
- Modify: `apps/web/messages/en.json`

- [x] **Step 1: Add Auth namespace to zh.json**

Add the following top-level key to `apps/web/messages/zh.json`:

```json
"Auth": {
  "loginTitle": "登录",
  "loginDescription": "使用您的邮箱和密码登录 ash 工作台",
  "emailLabel": "邮箱",
  "emailPlaceholder": "name@example.com",
  "passwordLabel": "密码",
  "passwordPlaceholder": "输入密码",
  "loginAction": "登录",
  "loginLoading": "登录中...",
  "loginSuccess": "登录成功",
  "noAccount": "还没有账号？",
  "registerLink": "立即注册",
  "forgotPasswordLink": "忘记密码？",

  "registerTitle": "注册",
  "registerDescription": "创建您的 ash 工作台账号",
  "displayNameLabel": "显示名称",
  "displayNamePlaceholder": "您的名称",
  "registerAction": "注册",
  "registerLoading": "注册中...",
  "registerSuccess": "注册成功，请验证邮箱",
  "hasAccount": "已有账号？",
  "loginLink": "立即登录",

  "verifyEmailTitle": "验证邮箱",
  "verifyEmailDescription": "我们已向 {email} 发送了验证码",
  "codeLabel": "验证码",
  "codePlaceholder": "输入 6 位验证码",
  "verifyAction": "验证",
  "verifyLoading": "验证中...",
  "verifySuccess": "邮箱验证成功，请登录",
  "resendCode": "重新发送验证码",

  "forgotPasswordTitle": "找回密码",
  "forgotPasswordDescription": "输入您的邮箱，我们将发送重置密码的验证码",
  "sendCodeAction": "发送验证码",
  "sendCodeLoading": "发送中...",
  "sendCodeSuccess": "验证码已发送，请查收邮箱",
  "backToLogin": "返回登录",

  "resetPasswordTitle": "重置密码",
  "resetPasswordDescription": "输入验证码和新密码",
  "newPasswordLabel": "新密码",
  "newPasswordPlaceholder": "输入新密码",
  "confirmPasswordLabel": "确认新密码",
  "confirmPasswordPlaceholder": "再次输入新密码",
  "resetAction": "重置密码",
  "resetLoading": "重置中...",
  "resetSuccess": "密码重置成功，请使用新密码登录",

  "errorNetwork": "网络错误，请稍后重试",
  "errorInvalidCredentials": "邮箱或密码错误",
  "errorEmailExists": "该邮箱已被注册",
  "errorInvalidCode": "验证码错误或已过期",
  "errorPasswordMismatch": "两次输入的密码不一致"
}
```

- [x] **Step 2: Add Auth namespace to en.json**

Add the following top-level key to `apps/web/messages/en.json`:

```json
"Auth": {
  "loginTitle": "Sign In",
  "loginDescription": "Sign in to your ash workbench account",
  "emailLabel": "Email",
  "emailPlaceholder": "name@example.com",
  "passwordLabel": "Password",
  "passwordPlaceholder": "Enter password",
  "loginAction": "Sign In",
  "loginLoading": "Signing in...",
  "loginSuccess": "Signed in successfully",
  "noAccount": "Don't have an account?",
  "registerLink": "Register",
  "forgotPasswordLink": "Forgot password?",

  "registerTitle": "Register",
  "registerDescription": "Create your ash workbench account",
  "displayNameLabel": "Display Name",
  "displayNamePlaceholder": "Your name",
  "registerAction": "Register",
  "registerLoading": "Registering...",
  "registerSuccess": "Registration successful, please verify your email",
  "hasAccount": "Already have an account?",
  "loginLink": "Sign In",

  "verifyEmailTitle": "Verify Email",
  "verifyEmailDescription": "We sent a verification code to {email}",
  "codeLabel": "Verification Code",
  "codePlaceholder": "Enter 6-digit code",
  "verifyAction": "Verify",
  "verifyLoading": "Verifying...",
  "verifySuccess": "Email verified, please sign in",
  "resendCode": "Resend code",

  "forgotPasswordTitle": "Forgot Password",
  "forgotPasswordDescription": "Enter your email and we'll send a reset code",
  "sendCodeAction": "Send Code",
  "sendCodeLoading": "Sending...",
  "sendCodeSuccess": "Reset code sent, check your email",
  "backToLogin": "Back to sign in",

  "resetPasswordTitle": "Reset Password",
  "resetPasswordDescription": "Enter the verification code and your new password",
  "newPasswordLabel": "New Password",
  "newPasswordPlaceholder": "Enter new password",
  "confirmPasswordLabel": "Confirm Password",
  "confirmPasswordPlaceholder": "Re-enter new password",
  "resetAction": "Reset Password",
  "resetLoading": "Resetting...",
  "resetSuccess": "Password reset successfully, please sign in with your new password",

  "errorNetwork": "Network error, please try again",
  "errorInvalidCredentials": "Invalid email or password",
  "errorEmailExists": "This email is already registered",
  "errorInvalidCode": "Invalid or expired verification code",
  "errorPasswordMismatch": "Passwords do not match"
}
```

- [x] **Step 3: Commit**

```bash
git add apps/web/messages/zh.json apps/web/messages/en.json
git commit -m "feat: add auth i18n strings (zh/en)"
```

---

### Task 6: Create auth form components

**Files:**
- Create: `apps/web/src/components/auth/login-form.tsx`
- Create: `apps/web/src/components/auth/register-form.tsx`
- Create: `apps/web/src/components/auth/verify-email-form.tsx`
- Create: `apps/web/src/components/auth/forgot-password-form.tsx`
- Create: `apps/web/src/components/auth/reset-password-form.tsx`

- [x] **Step 1: Create login-form.tsx**

```tsx
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
```

- [x] **Step 2: Create register-form.tsx**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@ash/ui/input";
import { Button } from "@ash/ui/button";
import { Link } from "@/i18n/navigation";

export function RegisterForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          display_name: displayName,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? t("errorNetwork"));
      }
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
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
        <label htmlFor="displayName" className="text-sm font-medium">
          {t("displayNameLabel")}
        </label>
        <Input
          id="displayName"
          type="text"
          placeholder={t("displayNamePlaceholder")}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          autoComplete="name"
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
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("registerLoading") : t("registerAction")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/login" className="hover:text-foreground transition-colors">
          {t("loginLink")}
        </Link>
      </p>
    </form>
  );
}
```

- [x] **Step 3: Create verify-email-form.tsx**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
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
```

- [x] **Step 4: Create forgot-password-form.tsx**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@ash/ui/input";
import { Button } from "@ash/ui/button";
import { Link } from "@/i18n/navigation";

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? t("errorNetwork"));
      }
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
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
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("sendCodeLoading") : t("sendCodeAction")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground transition-colors">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
```

- [x] **Step 5: Create reset-password-form.tsx**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@ash/ui/input";
import { Button } from "@ash/ui/button";
import { Link } from "@/i18n/navigation";

export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("errorPasswordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          new_password: newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? t("errorNetwork"));
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
        <Link href="/login" className="mt-2 text-sm hover:text-foreground transition-colors">
          {t("backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("resetPasswordDescription")}
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
      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium">
          {t("newPasswordLabel")}
        </label>
        <Input
          id="newPassword"
          type="password"
          placeholder={t("newPasswordPlaceholder")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          {t("confirmPasswordLabel")}
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder={t("confirmPasswordPlaceholder")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t("resetLoading") : t("resetAction")}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground transition-colors">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}
```

- [x] **Step 6: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: No errors

- [x] **Step 7: Commit**

```bash
git add apps/web/src/components/auth/
git commit -m "feat: add auth form components (login, register, verify-email, forgot/reset password)"
```

---

### Task 7: Create auth pages and layout

**Files:**
- Create: `apps/web/src/app/[locale]/(auth)/layout.tsx`
- Create: `apps/web/src/app/[locale]/(auth)/login/page.tsx`
- Create: `apps/web/src/app/[locale]/(auth)/register/page.tsx`
- Create: `apps/web/src/app/[locale]/(auth)/verify-email/page.tsx`
- Create: `apps/web/src/app/[locale]/(auth)/forgot-password/page.tsx`
- Create: `apps/web/src/app/[locale]/(auth)/reset-password/page.tsx`

- [x] **Step 1: Create auth layout**

```tsx
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">ash</h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 2: Create login page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("loginTitle") };
}

export default async function LoginPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("loginTitle")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("loginDescription")}</p>
      <LoginForm />
    </div>
  );
}
```

- [x] **Step 3: Create register page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("registerTitle") };
}

export default async function RegisterPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("registerTitle")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("registerDescription")}</p>
      <RegisterForm />
    </div>
  );
}
```

- [x] **Step 4: Create verify-email page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("verifyEmailTitle") };
}

export default async function VerifyEmailPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("verifyEmailTitle")}</h2>
      <VerifyEmailForm />
    </div>
  );
}
```

- [x] **Step 5: Create forgot-password page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("forgotPasswordTitle") };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("forgotPasswordTitle")}</h2>
      <p className="mb-6 text-sm text-muted-foreground">{t("forgotPasswordDescription")}</p>
      <ForgotPasswordForm />
    </div>
  );
}
```

- [x] **Step 6: Create reset-password page**

```tsx
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("resetPasswordTitle") };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{t("resetPasswordTitle")}</h2>
      <ResetPasswordForm />
    </div>
  );
}
```

- [x] **Step 7: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: No errors

- [x] **Step 8: Commit**

```bash
git add apps/web/src/app/[locale]/\(auth\)/
git commit -m "feat: add auth pages (login, register, verify-email, forgot/reset password)"
```

---

### Task 8: Update middleware for auth guard

**Files:**
- Modify: `apps/web/src/proxy.ts`

- [x] **Step 1: Update proxy.ts with auth redirect logic**

```ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/product",
  "/showcase",
  "/pricing",
  "/docs",
];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix to get the path
  const segments = pathname.split("/").filter(Boolean);
  const pathWithoutLocale =
    segments.length > 1 ? `/${segments.slice(1).join("/")}` : `/${segments[0] ?? ""}`;

  return PUBLIC_PATHS.some(
    (p) => pathWithoutLocale === p || pathWithoutLocale.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return intlProxy(request);
  }

  // Check auth for protected routes
  if (!isPublicPath(pathname)) {
    const accessToken = request.cookies.get("ash_access_token")?.value;
    const user = request.cookies.get("ash_user")?.value;

    if (!accessToken || !user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlProxy(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
```

- [x] **Step 2: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: No errors

- [x] **Step 3: Commit**

```bash
git add apps/web/src/proxy.ts
git commit -m "feat: add auth guard to middleware (redirect to login for protected routes)"
```

---

### Task 9: Update sidebar and settings for real auth

**Files:**
- Modify: `apps/web/src/components/workbench/sidebar/footer-account.tsx`
- Modify: `apps/web/src/components/settings/sections/account-section.tsx`

- [x] **Step 1: Update footer-account.tsx to use AuthContext**

Replace the file contents with:

```tsx
"use client";

import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Button } from "@ash/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ash/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSettingsModal } from "@/components/settings/settings-modal-provider";
import { useAuth } from "@/context/auth-context";

export function FooterAccount() {
  const t = useTranslations("Workbench");
  const { openSettings } = useSettingsModal();
  const { user, logout } = useAuth();

  const displayName = user?.display_name ?? user?.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto w-full justify-start gap-2 px-2 py-2"
            aria-label={t("accountMenuOpenAria")}
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-[11px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-medium">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
            <Settings className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="top"
          className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
        >
          <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 font-normal">
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {user?.email ?? ""}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openSettings("account")}>
            <Settings className="size-4" aria-hidden />
            {t("accountSettings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => logout()}>
            <LogOut className="size-4" aria-hidden />
            {t("accountSignOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

- [x] **Step 2: Update account-section.tsx to use AuthContext**

Replace the file contents with:

```tsx
"use client";

import { Avatar, AvatarFallback } from "@ash/ui/avatar";
import { Button } from "@ash/ui/button";
import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { SectionHeader } from "../section-header";
import { useAuth } from "@/context/auth-context";

export function AccountSection() {
  const t = useTranslations("Settings");
  const { user, logout } = useAuth();

  const displayName = user?.display_name ?? user?.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <SectionHeader
        heading={t("account.heading")}
        description={t("account.description")}
      />

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <Avatar className="size-12">
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium">{displayName}</p>
          <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => logout()}>
          <LogOut className="size-4" aria-hidden />
          {t("account.signOutAction")}
        </Button>
      </div>
    </div>
  );
}
```

- [x] **Step 3: Verify typecheck**

Run: `pnpm --filter web typecheck`
Expected: No errors

- [x] **Step 4: Commit**

```bash
git add apps/web/src/components/workbench/sidebar/footer-account.tsx apps/web/src/components/settings/sections/account-section.tsx
git commit -m "feat: wire sidebar and settings account to real auth context"
```

---

### Task 10: Build verification and final lint

- [x] **Step 1: Run full lint**

Run: `pnpm lint`
Expected: No errors

- [x] **Step 2: Run full typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [x] **Step 3: Run full build**

Run: `pnpm build`
Expected: Build succeeds

- [x] **Step 4: Manual smoke test**

Run: `pnpm --filter web dev`
Then in browser:
1. Navigate to `http://localhost:3000/register` — register form should render
2. Fill in email, display name, password, submit — should redirect to verify-email
3. Enter code `123456`, submit — should redirect to login
4. Login with credentials — should redirect to /app workbench
5. Click user avatar in sidebar → Sign Out — should redirect to login
6. Navigate to `/app` while logged out — should redirect to login

- [x] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address build/smoke test issues"
```
