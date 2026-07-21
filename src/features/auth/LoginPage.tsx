import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Cloud, KeyRound, Mail } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";

type LoginMode = "password" | "magic";

export default function LoginPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<LoginMode>("password");
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (auth.user) return <Navigate to="/app" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    setBusy(true);
    try {
      if (mode === "magic") {
        await auth.sendMagicLink(email.trim());
        setMessage("登录链接已发送，请检查邮箱。");
      } else if (registering) {
        setMessage(
          await auth.signUpWithPassword(email.trim(), password)
        );
      } else {
        await auth.signInWithPassword(email.trim(), password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "登录失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-full bg-app text-primary flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 w-11 h-11 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center">
            <Cloud size={20} />
          </div>
          <h1 className="text-2xl font-semibold">登录个人工作台</h1>
          <p className="mt-2 text-sm text-tertiary">
            私人数据仅对你的账号可见，并可在不同设备间同步。
          </p>
        </div>

        <Card>
          <CardBody className="space-y-5">
            {!auth.configured ? (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-secondary">
                Supabase 尚未配置。请先在 Cloudflare 添加
                <code className="mx-1">VITE_SUPABASE_URL</code>
                和
                <code className="ml-1">VITE_SUPABASE_ANON_KEY</code>。
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-elevated p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("password");
                      setMessage("");
                      setError("");
                    }}
                    className={`rounded-md px-3 py-2 text-sm transition-colors ${
                      mode === "password"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-tertiary hover:text-primary"
                    }`}
                  >
                    <KeyRound size={14} className="inline mr-1.5" />
                    密码登录
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("magic");
                      setRegistering(false);
                      setMessage("");
                      setError("");
                    }}
                    className={`rounded-md px-3 py-2 text-sm transition-colors ${
                      mode === "magic"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-tertiary hover:text-primary"
                    }`}
                  >
                    <Mail size={14} className="inline mr-1.5" />
                    邮箱链接
                  </button>
                </div>

                <form className="space-y-4" onSubmit={submit}>
                  <Field label="邮箱" required>
                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      autoFocus
                    />
                  </Field>

                  {mode === "password" && (
                    <Field label="密码" required>
                      <Input
                        type="password"
                        autoComplete={registering ? "new-password" : "current-password"}
                        value={password}
                        minLength={6}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="至少 6 位"
                      />
                    </Field>
                  )}

                  {error && <p className="text-sm text-danger">{error}</p>}
                  {message && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    variant="blue"
                    className="w-full justify-center"
                    disabled={busy}
                  >
                    {busy
                      ? "处理中…"
                      : mode === "magic"
                      ? "发送登录链接"
                      : registering
                      ? "创建账号"
                      : "登录"}
                  </Button>
                </form>

                {mode === "password" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegistering((value) => !value);
                      setMessage("");
                      setError("");
                    }}
                    className="w-full text-center text-xs text-tertiary hover:text-primary"
                  >
                    {registering ? "已有账号？返回登录" : "没有账号？创建一个"}
                  </button>
                )}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
