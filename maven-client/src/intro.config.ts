export interface IntroConfig {
  imageUrl: string;
  title: string;
  lines: string[];
}

export const introConfig: IntroConfig = {
  imageUrl: "http://q1.qlogo.cn/g?b=qq&nk=672252397&s=640",
  title: "Cloud Maven",
  lines: [
    "轻量级 Maven 仓库，基于 Cloudflare Workers",
    "github.com/HowXu/cloud-maven"
  ],
};
