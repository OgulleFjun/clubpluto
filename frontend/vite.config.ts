import { execSync } from 'child_process';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function gitSha() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

function gitShaPlugin(): Plugin {
  const virtualId = '\0virtual:git-sha';
  return {
    name: 'git-sha',
    resolveId(id) {
      if (id === 'virtual:git-sha') return virtualId;
    },
    load(id) {
      if (id !== virtualId) return;
      return `export const gitSha = ${JSON.stringify(gitSha())};\n`;
    },
    configureServer(server) {
      let current = gitSha();
      const timer = setInterval(() => {
        const next = gitSha();
        if (next === current) return;
        current = next;
        const mod = server.moduleGraph.getModuleById(virtualId);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      }, 2000);
      server.httpServer?.on('close', () => clearInterval(timer));
    },
  };
}

export default defineConfig({
  plugins: [react(), gitShaPlugin()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
  },
});
