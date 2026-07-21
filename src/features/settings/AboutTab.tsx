import {
  Info,
  Layers,
  ShieldCheck,
  Cloud,
  Keyboard,
  FileText,
} from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

// 关于页：应用信息、数据存储、部署、快捷键、文档链接
export function AboutTab() {
  const techStack = [
    "React 18",
    "TypeScript",
    "Vite",
    "Tailwind CSS",
    "Zustand",
    "React Router",
    "dnd-kit",
    "lucide-react",
    "recharts",
  ];

  return (
    <div className="space-y-4">
      {/* 应用信息 */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Info size={14} className="text-secondary" />
              应用信息
            </span>
          }
          subtitle="Personal Workbench"
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider">
                名称
              </div>
              <div className="text-sm text-primary font-medium mt-0.5">
                个人工作台
              </div>
              <div className="text-2xs text-tertiary mt-0.5">
                Personal Workbench
              </div>
            </div>
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider">
                版本
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-sm text-primary font-mono">1.0.0</span>
                <Badge tone="silver">MVP</Badge>
              </div>
            </div>
            <div>
              <div className="text-2xs text-muted uppercase tracking-wider">
                设计理念
              </div>
              <div className="text-sm text-primary mt-0.5">
                黑白灰 / 银色调
              </div>
              <div className="text-2xs text-tertiary mt-0.5">
                暗色优先 · IBM Plex Sans
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 技术栈 */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Layers size={14} className="text-secondary" />
              技术栈
            </span>
          }
          subtitle="基于现代前端工具链构建"
        />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {techStack.map((t) => (
              <Badge key={t} tone="outline">
                {t}
              </Badge>
            ))}
          </div>
          <p className="text-2xs text-tertiary mt-3 leading-relaxed">
            单页应用 + 本地状态管理，所有业务逻辑在前端完成；
            Zustand 持久化到 localStorage，路由由 React Router 管理。
          </p>
        </CardBody>
      </Card>

      {/* 数据存储 */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-secondary" />
              数据存储说明
            </span>
          }
          subtitle="本地优先，账号私有云端同步"
        />
        <CardBody>
          <ul className="space-y-2 text-sm text-secondary">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-silver-500 mt-2 shrink-0" />
              <span>
                数据会缓存在浏览器
                <span className="text-primary font-medium"> localStorage </span>
                中供离线使用，并同步到当前账号专属的 Supabase 私有空间。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-silver-500 mt-2 shrink-0" />
              <span>
                清除浏览器数据后，可登录同一账号从云端恢复；仍建议定期使用
                <span className="text-primary"> 账号与同步 → 导出本地备份 </span>。
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-silver-500 mt-2 shrink-0" />
              <span>
                云端数据受行级安全策略保护，只有当前登录账号可以读取和修改。
              </span>
            </li>
          </ul>
        </CardBody>
      </Card>

      {/* 部署说明 */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Cloud size={14} className="text-secondary" />
              部署说明
            </span>
          }
          subtitle="双线部署，兼顾国内访问"
        />
        <CardBody>
          <div className="space-y-3">
            <div className="rounded-md border border-default bg-elevated px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-primary font-medium">
                  Cloudflare Pages
                </span>
                <Badge tone="silver">主部署</Badge>
              </div>
              <div className="text-2xs text-tertiary mt-1">
                MVP 阶段部署到 Cloudflare Pages，全球 CDN 加速，免费额度充足。
              </div>
            </div>
            <div className="rounded-md border border-default bg-elevated px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm text-primary font-medium">
                  腾讯云 CloudBase
                </span>
                <Badge tone="outline">备选</Badge>
              </div>
              <div className="text-2xs text-tertiary mt-1">
                可双线部署到腾讯云 CloudBase，提升国内访问速度。
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 快捷键 */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <Keyboard size={14} className="text-secondary" />
              快捷键
            </span>
          }
          subtitle="提升操作效率"
        />
        <CardBody>
          <div className="flex items-center justify-between">
            <span className="text-sm text-secondary">收起 / 展开工具栏</span>
            <kbd className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-default bg-elevated font-mono text-xs text-primary">
              <span className="text-tertiary">⌘ / Ctrl</span>
              <span>+</span>
              <span>B</span>
            </kbd>
          </div>
        </CardBody>
      </Card>

      {/* 文档 */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-1.5">
              <FileText size={14} className="text-secondary" />
              相关文档
            </span>
          }
          subtitle="项目根目录 .trae/documents 下"
        />
        <CardBody>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <FileText size={13} className="text-muted shrink-0" />
              <span className="text-secondary">产品需求文档：</span>
              <code className="font-mono text-2xs text-primary bg-elevated px-1.5 py-0.5 rounded">
                .trae/documents/PRD.md
              </code>
            </li>
            <li className="flex items-center gap-2">
              <FileText size={13} className="text-muted shrink-0" />
              <span className="text-secondary">技术架构文档：</span>
              <code className="font-mono text-2xs text-primary bg-elevated px-1.5 py-0.5 rounded">
                .trae/documents/TechArch.md
              </code>
            </li>
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
