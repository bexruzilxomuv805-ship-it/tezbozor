import { formatMoney, formatDate } from "./units";

export function printReceipt(order, t, lang) {
  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) return;

  const rows = order.items
    .map(
      (it) => `
        <tr>
          <td style="padding:4px 0;">${escapeHtml(it.name)}<br/><span style="color:#8A8271;font-size:11px;">${escapeHtml(it.optionLabel)} × ${it.qty}</span></td>
          <td style="padding:4px 0;text-align:right;white-space:nowrap;">${formatMoney(it.unitPrice * it.qty, lang, t)}</td>
        </tr>`
    )
    .join("");

  const discountRow =
    order.pointsDiscount > 0
      ? `<tr><td style="padding:4px 0;color:#3F8355;">${escapeHtml(t.pointsDiscount)}</td><td style="padding:4px 0;text-align:right;color:#3F8355;">-${formatMoney(order.pointsDiscount, lang, t)}</td></tr>`
      : "";

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(t.receipt)} #${escapeHtml(String(order.id))}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: 'Courier New', monospace; color: #2b2620; margin: 0; padding: 20px; font-size: 13px; }
  h1 { font-size: 16px; text-align: center; margin: 0 0 2px; color: #2b2620; }
  .sub { text-align: center; color: #8A8271; font-size: 11px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  td { color: #2b2620; }
  .meta td { padding: 2px 0; }
  .meta td:last-child { text-align: right; }
  hr { border: none; border-top: 1px dashed #ccc; margin: 10px 0; }
  .total td { font-weight: bold; font-size: 14px; padding-top: 6px; }
  .thanks { text-align: center; margin-top: 16px; color: #8A8271; font-size: 11px; }
</style>
</head>
<body>
  <h1>TezBozor</h1>
  <div class="sub">${escapeHtml(t.receipt)}</div>
  <table class="meta">
    <tr><td>${escapeHtml(t.receiptOrderNo)}</td><td>#${escapeHtml(String(order.id))}</td></tr>
    <tr><td>${escapeHtml(t.receiptDate)}</td><td>${escapeHtml(formatDate(order.date, lang))}</td></tr>
    <tr><td>${escapeHtml(t.receiptStatus)}</td><td>${escapeHtml((t.admin.status[order.status || "new"]) || order.status)}</td></tr>
  </table>
  <hr />
  <table>
    ${rows}
  </table>
  <hr />
  <table>
    <tr><td>${escapeHtml(t.subtotal)}</td><td style="text-align:right;">${formatMoney(order.subtotal ?? order.total, lang, t)}</td></tr>
    ${discountRow}
    <tr class="total"><td>${escapeHtml(t.total)}</td><td style="text-align:right;">${formatMoney(order.total, lang, t)}</td></tr>
  </table>
  <div class="thanks">${escapeHtml(t.receiptThanks)}</div>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    win.print();
  };
  win.onload = doPrint;
  // Fallback in case onload doesn't fire (already-loaded blank document in some browsers)
  window.setTimeout(doPrint, 300);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
