import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

export function WaitlistForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setMessage("");
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("请填写姓名和邮箱");
      return;
    }
    if (!supabase) {
      setError("云端服务尚未配置");
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
          source: "public_home",
        });
      if (insertError) throw insertError;
      setMessage("申请已提交。审核通过后会通过邮件发送邀请码。");
      setName("");
      setEmail("");
      setPurpose("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "提交失败");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="申请云端内测账号"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
          <Button variant="blue" disabled={busy} onClick={() => void submit()}>
            {busy ? "提交中…" : "提交申请"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          可先免登录体验本地沙盒。云端账号用于跨设备同步，当前采用邀请制，避免免费额度被滥用。
        </p>
        <Field label="姓名" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="邮箱" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="使用目的">
          <Textarea
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="例如：个人效率管理 / 作品集体验 / 购买咨询"
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        {message && (
          <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
      </div>
    </Modal>
  );
}
