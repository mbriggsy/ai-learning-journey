import { RendererApp } from './renderer/RendererApp';

const app = new RendererApp();
app.init().catch((err) => {
  console.error('Failed to initialize:', err);
});
