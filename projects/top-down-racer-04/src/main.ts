import { RendererApp } from './renderer/RendererApp';

async function boot() {
  const app = new RendererApp();
  await app.init();
}

boot().catch((err: unknown) => {
  console.error('Fatal boot error:', err);
  const message = err instanceof Error ? err.message : 'Unknown error';

  const container = document.createElement('div');
  container.style.cssText = 'font-family:sans-serif;text-align:center;padding:40px;color:#fff;background:#111;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;';

  const heading = document.createElement('h1');
  heading.textContent = 'Failed to load game';

  const detail = document.createElement('p');
  detail.textContent = message;
  detail.style.cssText = 'color:#aaa;max-width:600px;word-break:break-word;';

  const retry = document.createElement('button');
  retry.textContent = 'Retry';
  retry.style.cssText = 'margin-top:20px;padding:10px 30px;font-size:16px;cursor:pointer;background:#00d4ff;border:none;color:#000;border-radius:4px;';
  retry.addEventListener('click', () => location.reload());

  container.append(heading, detail, retry);
  document.body.replaceChildren(container);
});
