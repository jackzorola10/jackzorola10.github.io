// Theme toggle shared by every page. Remembers the choice per browser; works without storage.
(() => {
  const root = document.documentElement;
  const read = () => { try { return localStorage.getItem('theme'); } catch (e) { return null; } };
  const write = v => { try { localStorage.setItem('theme', v); } catch (e) { /* private mode */ } };
  const saved = read();
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const paint = () => { btn.textContent = current() === 'dark' ? '☀' : '☾'; btn.setAttribute('aria-label', `Switch to ${current() === 'dark' ? 'light' : 'dark'} theme`); };
      paint();
      btn.addEventListener('click', () => { root.dataset.theme = current() === 'dark' ? 'light' : 'dark'; write(root.dataset.theme); paint(); });
    });
  });
})();
