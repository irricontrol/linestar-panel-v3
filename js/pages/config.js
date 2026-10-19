/**
 * Page: Config — the hub bar's "empty" landing spot. In practice the
 * sidebar CONFIG button now jumps straight to System (see nav.js), so
 * this page mostly exists as a fallback if something still points at
 * 'config' directly; it's just the shared hub bar with nothing below it.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.config = (function () {
  const c = ST.components;

  function render(s) {
    return `
      <div class="page" style="padding:8px 28px 100px;flex-direction:column;gap:24px;">
        ${c.hubBar(s)}
      </div>`;
  }

  return { render };
})();
