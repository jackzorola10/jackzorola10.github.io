// Shared page behavior, loaded in <head> so the saved theme applies before the first paint.
// Theme: follows the OS until the visitor picks one; the choice is remembered per browser.
(() => {
  const root = document.documentElement;
  const read = () => { try { return localStorage.getItem('theme'); } catch (e) { return null; } };
  const write = v => { try { localStorage.setItem('theme', v); } catch (e) { /* private mode: still works for this page */ } };
  const saved = read();
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  const current = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const paint = () => {
        const dark = current() === 'dark';
        btn.textContent = dark ? '☀' : '☾';
        btn.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
        btn.title = btn.getAttribute('aria-label');
      };
      paint();
      btn.addEventListener('click', () => {
        root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
        write(root.dataset.theme);
        document.querySelectorAll('.theme-toggle').forEach(b => b.dispatchEvent(new Event('repaint')));
        document.dispatchEvent(new Event('themechange'));
      });
      btn.addEventListener('repaint', paint);
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (!root.dataset.theme) { document.querySelectorAll('.theme-toggle').forEach(b => b.dispatchEvent(new Event('repaint'))); document.dispatchEvent(new Event('themechange')); }
    });
  });
})();
