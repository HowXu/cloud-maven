export interface SiteConfig {
  title: string;
  faviconUrl: string;
  introImageUrl: string;
  introTitle: string;
  introLines: string[];
}

export const siteConfig: SiteConfig = {
  title: "Cloud Maven",
  faviconUrl: "https://q1.qlogo.cn/g?b=qq&nk=672252397&s=640",
  introImageUrl: "https://q1.qlogo.cn/g?b=qq&nk=672252397&s=640",
  introTitle: "Cloud Maven",
  introLines: [
    "基于 Cloudflare Workers的轻量 Maven 仓库",
    "https://github.com/HowXu/cloud-maven"
  ],
};

export function applySiteSettings(settings: { title?: string }) {
  if (settings.title) {
    siteConfig.title = settings.title;
  }
  document.title = siteConfig.title;
  if (siteConfig.faviconUrl) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.href = siteConfig.faviconUrl;
    }
  }
}