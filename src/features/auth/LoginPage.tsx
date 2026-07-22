import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Cloud, KeyRound, Mail, Ticket } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { WaitlistModal } from "@/features/public/WaitlistModal";

type LoginMode = "password" | "magic" | "invite";

export default function LoginPage() {
  const auth = useAuth();
  const [mode, setMode] = useState<LoginMode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  if (auth.user) return <Navigate to="/app" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("请输入邮箱");
      return;
    }
    if (mode === "invite" && password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setBusy(true);
    try {
      if (mode === "magic") {
        await auth.sendMagicLink(email.trim());
        setMessage("登录链接已发送，请检查邮箱（仅限已有账号）。");
      } else if (mode === "invite") {
        setMessage(
          await auth.signUpWithInvite(
            email.trim(),
            password,
            inviteCode.trim()
          )
        );
      } else {
        await auth.signInWithPassword(email.trim(), password);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "操作失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  const modes: { id: LoginMode; label: string; icon: React.ReactNode }[] = [
    { id: "password", label: "密码登录", icon: <KeyRound size={14} className="inline mr-1.5" /> },
    { id: "magic", label: "邮箱链接", icon: <Mail size={14} className="inline mr-1.5" /> },
    { id: "invite", label: "邀请注册", icon: <Ticket size={14} className="inline mr-1.5" /> },
  ];

  return (
    <main className="min-h-full bg-app text-primary flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 w-11 h-11 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center">
            <Cloud size={20} />
          </div>
          <h1 className="text-2xl font-semibold">登录个人工作台</h1>
          <p className="mt-2 text-sm text-tertiary">
            私人数据仅对你的账号可见。新账号需邀请码注册。
          </p>
        </div>

        <Card>
          <CardBody className="space-y-5">
            {!auth.configured ? (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-secondary">
                Supabase 尚未配置。请先添加
                <code className="mx-1">VITE_SUPABASE_URL</code>
                和
                <code className="ml-1">VITE_SUPABASE_ANON_KEY</code>。
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-elevated p-1">
                  {modes.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMode(m.id);
                        setMessage("");
                        setError("");
                      }}
                      className={`rounded-md px-2 py-2 text-xs sm:text-sm transition-colors ${
                        mode === m.id
                          ? "bg-surface text-primary shadow-sm"
                          : "text-tertiary hover:text-primary"
                      }`}
                    >
                      {m.icon}
                      {m.label}
                    </button>
                  ))}
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

                  {(mode === "password" || mode === "invite") && (
                    <Field label="密码" required>
                      <Input
                        type="password"
                        autoComplete={
                          mode === "invite" ? "new-password" : "current-password"
                        }
                        value={password}
                        minLength={6}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="至少 6 位"
                      />
                    </Field>
                  )}

                  {mode === "invite" && (
                    <Field label="邀请码" required hint="由站长发放，用后即计次数">
                      <Input
                        value={inviteCode}
                        onChange={(event) => setInviteCode(event.target.value)}
                        placeholder="输入邀请码"
                        autoComplete="off"
                      />
                    </Field>
                  )}

                  {mode === "magic" && (
                    <p className="text-2xs text-muted">
                      仅向已有账号发送登录链接，不会创建新用户。
                    </p>
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
                      : mode === "invite"
                      ? "使用邀请码注册"
                      : "登录"}
                  </Button>
                </form>

                <div className="space-y-2 text-center text-xs text-tertiary">
                  <button
                    type="button"
                    onClick={() => setWaitlistOpen(true)}
                    className="hover:text-primary"
                  >
                    没有邀请码？申请候补
                  </button>
                  <div>
                    <Link to="/try" className="hover:text-primary">
                      先试用本地沙箱 →
                    </Link>
                  </div>
                  <div>
                    <Link to="/" className="hover:text-primary">
                      返回公开主页
                    </Link>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        defaultSource="login"
      />
    </main>
  );
}
