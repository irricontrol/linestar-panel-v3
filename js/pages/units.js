/**
 * Page: Units — todas as unidades de medida do painel.
 * Duas colunas: Imperial (esquerda) e Métrico (direita).
 * Cada campo é um dual-toggle que alterna entre as opções.
 */
window.ST = window.ST || {};
ST.pages = ST.pages || {};

ST.pages.units = (function () {
  const c = ST.components;

  function fieldRow(label, key, options, s) {
    const current = s[key] || options[0];
    return `
      <div class="field field--config">
        <div class="field__label">${label}</div>
        <div class="dual-toggle" style="--btn-h:72px;">
          <div class="dual-toggle__housing btn-touch" data-action="cycle-unit-field" data-value="${key}">
            <div class="dual-toggle__face is-off">
              <span class="dual-toggle__value">${current}</span>
            </div>
          </div>
        </div>
      </div>`;
  }

  function render(s) {
    const fields = ST.config.unitFields;
    const col1 = fields.slice(0, 4);
    const col2 = fields.slice(4, 7);
    const col3 = fields.slice(7, 10);

    const col1Html = col1.map((f) => fieldRow(f.label, f.key, f.options, s)).join('');
    const col2Html = col2.map((f) => fieldRow(f.label, f.key, f.options, s)).join('');
    const col3Html = col3.map((f) => fieldRow(f.label, f.key, f.options, s)).join('');

    return `
      <div class="page page--system" style="padding:8px 28px 100px;flex-direction:column;gap:14px;">
        ${c.hubBar(s)}
        <div style="flex:1;display:flex;">
          <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding-right:16px;">
            ${col1Html}
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding:0 16px;">
            ${col2Html}
          </div>
          <div style="flex:1;display:flex;flex-direction:column;gap:14px;padding-left:16px;">
            ${col3Html}
          </div>
        </div>
      </div>`;
  }

  return { render };
})();
