import { nowISO } from "@/lib/id";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useContentStore } from "@/stores/useContentStore";
import { useCultureStore } from "@/stores/useCultureStore";
import { useProjectStore } from "@/stores/useProjectStore";
import type {
  PublicCultureCard,
  PublicLinkCard,
  PublicProfile,
  PublicProjection,
  PublicProjectCard,
} from "@/types";
import { PROFILE_CONFIG } from "./profileConfig";

export const PUBLIC_PROJECTION_KEY = "pwb:public-projection";

function isPublic(visibility?: string) {
  return visibility === "public";
}

export function buildPublicProjection(
  profileOverride?: Partial<PublicProfile>
): PublicProjection {
  const projects: PublicProjectCard[] = useProjectStore
    .getState()
    .projects.filter((p) => isPublic(p.visibility))
    .map((p) => ({
      id: p.id,
      name: p.name,
      goal: p.goal,
      role: p.role,
      status: p.status,
      keyResults: p.keyResults ?? [],
      portfolioNote: p.portfolioNote,
      materialLinks: (p.materialLinks ?? []).filter(Boolean),
    }));

  const culture: PublicCultureCard[] = useCultureStore
    .getState()
    .items.filter((c) => isPublic(c.visibility))
    .map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
      creator: c.creator,
      rating: c.rating,
      tags: c.tags ?? [],
      opinion: c.opinion,
      posterUrl: c.posterUrl,
    }));

  const links: PublicLinkCard[] = useContentStore
    .getState()
    .items.filter((c) => isPublic(c.visibility))
    .map((c) => ({
      id: c.id,
      title: c.title,
      url: c.publicUrl || c.referenceLinks[0],
      platform: c.platform,
      tags: c.tags ?? [],
    }));

  const profile: PublicProfile = {
    displayName: profileOverride?.displayName ?? PROFILE_CONFIG.displayName,
    headline: profileOverride?.headline ?? PROFILE_CONFIG.headline,
    bio: profileOverride?.bio ?? PROFILE_CONFIG.bio,
    contactEmail: profileOverride?.contactEmail ?? PROFILE_CONFIG.contactEmail,
    links:
      profileOverride?.links ??
      PROFILE_CONFIG.socialLinks.map((l) => ({
        label: l.label,
        url: l.url,
      })),
  };

  return {
    updatedAt: nowISO(),
    profile,
    projects,
    culture,
    links,
  };
}

export function saveLocalProjection(projection: PublicProjection) {
  localStorage.setItem(PUBLIC_PROJECTION_KEY, JSON.stringify(projection));
}

export function readLocalProjection(): PublicProjection | null {
  try {
    const raw = localStorage.getItem(PUBLIC_PROJECTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PublicProjection;
  } catch {
    return null;
  }
}

async function upsertSupabaseProjection(
  projection: PublicProjection,
  ownerId: string
) {
  if (!supabase) return;

  const { error: profileError } = await supabase.from("public_profile").upsert({
    owner_id: ownerId,
    display_name: projection.profile.displayName,
    headline: projection.profile.headline ?? null,
    bio: projection.profile.bio ?? null,
    contact_email: projection.profile.contactEmail ?? null,
    links: projection.profile.links,
    updated_at: projection.updatedAt,
  });
  if (profileError) throw profileError;

  // 全量替换：先删后插，保证下线项同步消失
  await Promise.all([
    supabase.from("public_projects").delete().eq("owner_id", ownerId),
    supabase.from("public_culture").delete().eq("owner_id", ownerId),
    supabase.from("public_links").delete().eq("owner_id", ownerId),
  ]);

  if (projection.projects.length) {
    const { error } = await supabase.from("public_projects").insert(
      projection.projects.map((p, i) => ({
        id: p.id,
        owner_id: ownerId,
        name: p.name,
        goal: p.goal,
        role: p.role,
        status: p.status,
        key_results: p.keyResults,
        portfolio_note: p.portfolioNote ?? null,
        material_links: p.materialLinks,
        sort_order: i,
        updated_at: projection.updatedAt,
      }))
    );
    if (error) throw error;
  }

  if (projection.culture.length) {
    const { error } = await supabase.from("public_culture").insert(
      projection.culture.map((c, i) => ({
        id: c.id,
        owner_id: ownerId,
        type: c.type,
        title: c.title,
        creator: c.creator ?? null,
        rating: c.rating,
        opinion: c.opinion ?? null,
        poster_url: c.posterUrl ?? null,
        tags: c.tags,
        sort_order: i,
        updated_at: projection.updatedAt,
      }))
    );
    if (error) throw error;
  }

  // 社交链接 + 公开内容链接一并写入 public_links
  const socialRows = projection.profile.links.map((l, i) => ({
    id: `social-${i}-${l.label}`,
    owner_id: ownerId,
    platform: "social",
    label: l.label,
    url: l.url,
    sort_order: i,
  }));
  const contentRows = projection.links
    .filter((l) => l.url)
    .map((l, i) => ({
      id: l.id,
      owner_id: ownerId,
      platform: l.platform ?? "other",
      label: l.title,
      url: l.url!,
      sort_order: socialRows.length + i,
    }));
  const allLinks = [...socialRows, ...contentRows];
  if (allLinks.length) {
    const { error } = await supabase.from("public_links").insert(allLinks);
    if (error) throw error;
  }
}

/**
 * 从本地 store 构建脱敏投影，写入 localStorage；
 * 若已登录且 Supabase 可用，则同时 upsert 公开表。
 */
export async function publishPublicProjection(options?: {
  ownerId?: string | null;
  profileOverride?: Partial<PublicProfile>;
}): Promise<PublicProjection> {
  const projection = buildPublicProjection(options?.profileOverride);
  saveLocalProjection(projection);

  const ownerId = options?.ownerId;
  if (ownerId && isSupabaseConfigured) {
    await upsertSupabaseProjection(projection, ownerId);
  }
  return projection;
}

/** 优先云端，其次本地投影，最后占位配置 */
export async function loadPublicSiteData(): Promise<PublicProjection> {
  if (supabase) {
    try {
      const [profileRes, projectsRes, cultureRes, linksRes] = await Promise.all([
        supabase.from("public_profile").select("*").limit(1).maybeSingle(),
        supabase
          .from("public_projects")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("public_culture")
          .select("*")
          .order("sort_order", { ascending: true }),
        supabase
          .from("public_links")
          .select("*")
          .order("sort_order", { ascending: true }),
      ]);

      if (profileRes.data) {
        const row = profileRes.data;
        const linkRows = linksRes.data ?? [];
        const social = linkRows
          .filter((l) => l.platform === "social")
          .map((l) => ({ label: l.label as string, url: l.url as string }));
        const contentLinks: PublicLinkCard[] = linkRows
          .filter((l) => l.platform !== "social")
          .map((l) => ({
            id: l.id as string,
            title: l.label as string,
            url: l.url as string,
            platform: l.platform as PublicLinkCard["platform"],
            tags: [],
          }));

        return {
          updatedAt: (row.updated_at as string) ?? nowISO(),
          profile: {
            displayName: row.display_name as string,
            headline: (row.headline as string) ?? undefined,
            bio: (row.bio as string) ?? undefined,
            contactEmail: (row.contact_email as string) ?? undefined,
            links:
              social.length > 0
                ? social
                : Array.isArray(row.links)
                ? (row.links as PublicProfile["links"])
                : PROFILE_CONFIG.socialLinks.map((l) => ({
                    label: l.label,
                    url: l.url,
                  })),
          },
          projects: (projectsRes.data ?? []).map((p) => ({
            id: p.id as string,
            name: p.name as string,
            goal: (p.goal as string) ?? "",
            role: (p.role as string) ?? "",
            status: (p.status as PublicProjectCard["status"]) ?? "done",
            keyResults: Array.isArray(p.key_results)
              ? (p.key_results as string[])
              : [],
            portfolioNote: (p.portfolio_note as string) ?? undefined,
            materialLinks: Array.isArray(p.material_links)
              ? (p.material_links as string[])
              : [],
          })),
          culture: (cultureRes.data ?? []).map((c) => ({
            id: c.id as string,
            type: c.type as PublicCultureCard["type"],
            title: c.title as string,
            creator: (c.creator as string) ?? undefined,
            rating: Number(c.rating) || 0,
            tags: Array.isArray(c.tags) ? (c.tags as string[]) : [],
            opinion: (c.opinion as string) ?? undefined,
            posterUrl: (c.poster_url as string) ?? undefined,
          })),
          links: contentLinks,
        };
      }
    } catch {
      // fall through to local
    }
  }

  const local = readLocalProjection();
  if (local) return local;

  return {
    updatedAt: nowISO(),
    profile: {
      displayName: PROFILE_CONFIG.displayName,
      headline: PROFILE_CONFIG.headline,
      bio: PROFILE_CONFIG.bio,
      contactEmail: PROFILE_CONFIG.contactEmail,
      links: PROFILE_CONFIG.socialLinks.map((l) => ({
        label: l.label,
        url: l.url,
      })),
    },
    projects: [],
    culture: [],
    links: [],
  };
}
