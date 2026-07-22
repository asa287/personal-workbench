import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function WaitlistModal({
  open,
  onClose,
  defaultSource = "public_site",
}: {
  open: boolean;
  onClose: () => void;
  defaultSource?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setName("");
    setEmail("");
    setPurpose("");
    setMessage("");
    setError("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("请填写姓名与邮箱");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setError("云端服务尚未配置，请稍后重试或直接联系站长。");
      return;
    }
    setBusy(true);
    try {
      const { error: insertError } = await supabase
        .from("waitlist_applications")
        .insert({
          name: name.trim(),
          email: email.trim(),
          purpose: purpose.trim() || null,
          source: defaultSource,
        });
      if (insertError) throw insertError;
      setMessage("已提交候补申请，审核通过后会发送邀请码。");
      setName("");
      setEmail("");
      setPurpose("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "提交失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="申请云端账号候补"
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            关闭
          </Button>
          <Button
            variant="blue"
            disabled={busy}
            onClick={() => {
              const form = document.getElementById(
                "waitlist-form"
              ) as HTMLFormElement | null;
              form?.requestSubmit();
            }}
          >
            {busy ? "提交中…" : "提交申请"}
          </Button>
        </>
      }
    >
      <form id="waitlist-form" className="space-y-4" onSubmit={submit}>
        <p className="text-sm text-secondary">
          工作台账号采用邀请制。留下联系方式与用途，审核通过后将发送邀请码。
        </p>
        <Field label="姓名" required>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="怎么称呼你"
            autoFocus
          />
        </Field>
        <Field label="邮箱" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="用途说明">
          <Textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="例如：个人项目管理、内容运营、试用同步功能…"
            rows={3}
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        {message && (
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
      </form>
    </Modal>
  );
}
