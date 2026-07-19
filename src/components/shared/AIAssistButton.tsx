import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { generateDraft, type AIAssistType, type AIContext } from "@/lib/aiStub";

export function AIAssistButton({
  type,
  ctx,
  label = "AI 辅助",
  onAdopt,
  className,
  size = "sm",
}: {
  type: AIAssistType;
  ctx?: AIContext;
  label?: string;
  onAdopt: (content: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");

  const run = async () => {
    setOpen(true);
    setLoading(true);
    setDraft("");
    try {
      const out = await generateDraft(type, ctx);
      setDraft(out);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={run}
        className={cn(className, "hover:text-brand hover:border-brand-border hover:bg-brand-soft")}
      >
        <Sparkles size={14} className="text-brand" />
        {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="AI 草稿（请审阅后采纳）"
        description="AI 输出为草稿态，编辑确认后才会写入正式数据。"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              丢弃
            </Button>
            <Button
              variant="primary"
              disabled={loading || !draft}
              onClick={() => {
                onAdopt(draft);
                setOpen(false);
              }}
            >
              采纳并保存
            </Button>
          </>
        }
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-tertiary">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-xs">正在生成草稿…</p>
          </div>
        ) : (
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="font-mono text-xs"
          />
        )}
      </Modal>
    </>
  );
}
