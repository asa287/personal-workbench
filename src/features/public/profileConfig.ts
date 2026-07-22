export interface PublicSocialLink {
  id: string;
  platform: string;
  label: string;
  url: string;
}

export interface PublicProfileConfig {
  displayName: string;
  headline: string;
  bio: string;
  contactEmail: string;
  resumeUrl?: string;
  location?: string;
  socialLinks: PublicSocialLink[];
}

/** 占位公开资料（未配置云端 / 本地投影时使用） */
export const PROFILE_CONFIG: PublicProfileConfig = {
  displayName: "Samantha Sun",
  headline: "产品经理 · 个人工作台构建者",
  bio: "关注个人成长系统与内容运营。这个站点既是我的作品集，也是我长期使用的个人工作台产品原型。",
  contactEmail: "samanthasunxf@outlook.com",
  location: "开放远程 / 跨时区协作",
  socialLinks: [
    {
      id: "xhs",
      platform: "xiaohongshu",
      label: "小红书",
      url: "https://www.xiaohongshu.com",
    },
    {
      id: "douyin",
      platform: "douyin",
      label: "抖音",
      url: "https://www.douyin.com",
    },
  ],
};
