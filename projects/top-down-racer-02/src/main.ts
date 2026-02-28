import { RendererApp } from './renderer/RendererApp';

async function main(): Promise<void> {
  const app = new RendererApp();
  await app.init();
}

main().catch(console.error);
