import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  "framework": "@storybook/nextjs-vite",
  "staticDirs": [
    "../public"
  ],
  // WSL2 /mnt/c(drvfs)는 파일 변경 이벤트가 없어 폴링으로 감지해야 한다
  viteFinal: async (config) => {
    config.server = {
      ...config.server,
      watch: { usePolling: true, interval: 1500 },
    };
    return config;
  }
};
export default config;