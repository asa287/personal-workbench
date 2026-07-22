import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  FolderKanban,
  Mail,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CULTURE_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@/lib/labels";
import type { PublicProjection } from "@/types";
import { loadPublicSiteData } from "./publishProjection";
import { WaitlistModal } from "./WaitlistModal";

export default function PublicHomePage() {
  const [data, setData] = useState<PublicProjection | null>(null);
  const [loading, setLoading] = useState(true);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void loadPublicSiteData().then((result) => {
      if (!active) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const profile = data?.profile;
  const projects = data?.projects ?? [];
  const culture = data?.culture ?? [];
  const links = data?.links ?? [];

  return (
    <>
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-default">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.08),_transparent_55%),linear-gradient(180deg,_var(--bg-surface),_var(--bg-primary))]"
          />
          <div className="relative mx-auto max-w-5xl px-4 md:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
            <p className="font-mono text-2xs tracking-[0.18em] uppercase text-brand mb-4">
              Personal Site
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-primary max-w-2xl leading-[1.15]">
              {loading ? "…" : profile?.displayName ?? "个人网站"}
            </h1>
            <p className="mt-4 text-lg text-secondary max-w-xl leading-relaxed">
              {profile?.headline}
            </p>
            <p className="mt-3 text-sm text-tertiary max-w-2xl leading-relaxed">
              {profile?.bio}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/try">
                <Button variant="blue" size="md">
                  <Sparkles size={15} />
                  免费试用沙箱
                  <ArrowRight size={14} />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="md">
                  登录工作台
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => setWaitlistOpen(true)}
                className="text-sm text-tertiary hover:text-brand underline-offset-4 hover:underline"
              >
                申请云端账号候补
              </button>
            </div>
          </div>
        </section>

        {/* Projects */}
        <section id="projects" className="mx-auto max-w-5xl px-4 md:px-6 py-16 md:py-20">
          <SectionHeader
            icon={<FolderKanban size={16} className="text-brand" />}
            title="精选项目"
            subtitle="从工作台公开发布的项目与作品集沉淀"
          />
          {projects.length === 0 ? (
            <EmptyHint text="暂无公开项目。登录工作台后，将项目标记为「发布到个人网站」即可展示。" />
          ) : (
            <div className="mt-8 space-y-6">
              {projects.map((p) => (
                <article
                  key={p.id}
                  className="border-t border-default pt-6 first:border-t-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-lg font-semibold text-primary">{p.name}</h3>
                    <span className="text-2xs font-mono text-muted">
                      {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                  </div>
                  {p.role && (
                    <p className="mt-1 text-xs text-tertiary">角色 · {p.role}</p>
                  )}
                  {p.goal && (
                    <p className="mt-3 text-sm text-secondary leading-relaxed">
                      {p.goal}
                    </p>
                  )}
                  {p.portfolioNote && (
                    <p className="mt-2 text-sm text-tertiary leading-relaxed">
                      {p.portfolioNote}
                    </p>
                  )}
                  {p.keyResults.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {p.keyResults.map((kr) => (
                        <li
                          key={kr}
                          className="text-sm text-secondary flex gap-2"
                        >
                          <span className="text-brand shrink-0">▸</span>
                          {kr}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.materialLinks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.materialLinks.map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                        >
                          相关链接 <ExternalLink size={11} />
                        </a>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Culture */}
        <section
          id="culture"
          className="border-y border-default bg-surface"
        >
          <div className="mx-auto max-w-5xl px-4 md:px-6 py-16 md:py-20">
            <SectionHeader
              icon={<BookOpen size={16} className="text-brand" />}
              title="文化积累"
              subtitle="公开的书影音与观点摘录"
            />
            {culture.length === 0 ? (
              <EmptyHint text="暂无公开积累。" />
            ) : (
              <div className="mt-8 grid sm:grid-cols-2 gap-6">
                {culture.map((c) => (
                  <article key={c.id} className="min-w-0">
                    <div className="text-2xs font-mono uppercase tracking-wider text-muted">
                      {CULTURE_TYPE_LABELS[c.type] ?? c.type}
                    </div>
                    <h3 className="mt-1.5 text-base font-semibold text-primary">
                      {c.title}
                    </h3>
                    {c.creator && (
                      <p className="mt-0.5 text-xs text-tertiary">{c.creator}</p>
                    )}
                    {c.opinion && (
                      <p className="mt-2 text-sm text-secondary leading-relaxed">
                        {c.opinion}
                      </p>
                    )}
                    {c.rating > 0 && (
                      <p className="mt-2 text-2xs text-muted">评分 {c.rating}/5</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Social + Contact */}
        <section id="contact" className="mx-auto max-w-5xl px-4 md:px-6 py-16 md:py-20">
          <SectionHeader
            icon={<Mail size={16} className="text-brand" />}
            title="联系与社交"
            subtitle="欢迎交流产品、内容与协作机会"
          />
          <div className="mt-8 flex flex-col sm:flex-row sm:items-start gap-8">
            <div className="flex-1 space-y-3">
              {(profile?.links ?? []).map((l) => (
                <a
                  key={`${l.label}-${l.url}`}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-secondary hover:text-brand"
                >
                  <ExternalLink size={14} />
                  {l.label}
                </a>
              ))}
              {links
                .filter((l) => l.url)
                .map((l) => (
                  <a
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-secondary hover:text-brand"
                  >
                    <ExternalLink size={14} />
                    {l.title}
                  </a>
                ))}
            </div>
            <div className="sm:w-72">
              {profile?.contactEmail && (
                <a
                  href={`mailto:${profile.contactEmail}`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-brand"
                >
                  <Mail size={15} />
                  {profile.contactEmail}
                </a>
              )}
              <p className="mt-3 text-xs text-tertiary leading-relaxed">
                需要云端同步账号？可提交候补申请，或持邀请码在登录页注册。
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setWaitlistOpen(true)}
              >
                申请候补
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-default py-8">
        <div className="mx-auto max-w-5xl px-4 md:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-2xs text-muted">
          <span>
            © {new Date().getFullYear()} {profile?.displayName ?? "Personal Site"}
          </span>
          <span className="font-mono">Personal Workbench · Public Projection</span>
        </div>
      </footer>

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />
    </>
  );
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
      </div>
      <p className="mt-1.5 text-sm text-tertiary">{subtitle}</p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="mt-6 text-sm text-muted leading-relaxed">{text}</p>;
}
