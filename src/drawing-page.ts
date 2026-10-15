import type { ManifoldToplevel } from 'manifold-3d';
import type { Part } from './model';
import { m } from './paraglide/messages.js';
import { drawingSheets, sheetSvg, type Sheet } from './drawings';

export function createDrawingPage(container: HTMLElement, api: ManifoldToplevel, getParts: () => Part[]) {
  container.innerHTML = `
    <div class="drawing-toolbar">
      <h2>${m.drawings_title()}</h2>
      <div class="drawing-actions"><button id="drawing-pdf">${m.download_pdf()}</button><button id="drawing-set">${m.all_sheets_pdf()}</button></div>
    </div>
    <div class="drawing-workspace">
      <aside class="drawing-sidebar"><label class="drawing-select-label" for="drawing-select">${m.drawing_part()}</label><select id="drawing-select"></select>
        <h3>${m.sheet_pieces()}</h3><ul id="drawing-members"></ul>
        <p id="drawing-status" role="status"></p>
      </aside>
      <div class="drawing-paper-area"><button id="drawing-prev" class="drawing-nav" aria-label="${m.previous_sheet()}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button><div id="drawing-paper"></div><button id="drawing-next" class="drawing-nav" aria-label="${m.next_sheet()}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>
    </div>`;
  const query = <T extends HTMLElement = HTMLElement>(selector: string) => container.querySelector<T>(selector)!;
  let sheets: Sheet[] = [];
  let activeId = '';
  const current = () => sheets.find(s => s.id === activeId) ?? sheets[0];
  const select = query<HTMLSelectElement>('#drawing-select');
  const render = () => {
    const sheet = current();
    if (!sheet) return;
    activeId = sheet.id;
    select.value = activeId;
    query('#drawing-paper').innerHTML = sheetSvg(sheet, sheets.indexOf(sheet), sheets.length);
    query('#drawing-members').replaceChildren(...sheet.members.map(part => {
      const li = document.createElement('li');
      li.textContent = part.name;
      return li;
    }));
    query('#drawing-status').textContent = '';
  };
  select.onchange = () => { activeId = select.value; render(); };
  const step = (offset: number) => {
    activeId = sheets[(sheets.indexOf(current()) + offset + sheets.length) % sheets.length].id;
    render();
  };
  query('#drawing-prev').onclick = () => step(-1);
  query('#drawing-next').onclick = () => step(1);
  const pdf = async (pages: Sheet[]) => {
    const buttons = container.querySelectorAll<HTMLButtonElement>('.drawing-actions button');
    buttons.forEach(b => b.disabled = true);
    const staging = document.createElement('div');
    staging.className = 'drawing-export-staging';
    document.body.append(staging);
    try {
      const { jsPDF } = await import('jspdf');
      const { svg2pdf } = await import('svg2pdf.js');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      doc.setProperties({ title: m.pdf_title() });
      for (let i = 0; i < pages.length; i++) {
        if (i) doc.addPage('a4', 'landscape');
        staging.innerHTML = sheetSvg(pages[i], sheets.indexOf(pages[i]), sheets.length);
        await svg2pdf(staging.querySelector('svg')!, doc, { x: 0, y: 0, width: 297, height: 210 });
      }
      const url = URL.createObjectURL(doc.output('blob'));
      const link = document.createElement('a');
      link.href = url;
      link.download = pages.length === 1 ? `${pages[0].id}-drawing.pdf` : 'consola-entrada-drawings.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      query('#drawing-status').textContent = m.export_failed({ error: String(error) });
    } finally {
      staging.remove();
      buttons.forEach(b => b.disabled = false);
    }
  };
  query('#drawing-pdf').onclick = () => pdf([current()]);
  query('#drawing-set').onclick = () => pdf([...sheets]);
  return {
    refresh() {
      sheets = drawingSheets(api, getParts());
      select.replaceChildren(...sheets.map(sheet => {
        const option = document.createElement('option');
        option.value = sheet.id;
        option.textContent = `${sheet.title} × ${sheet.members.length}`;
        return option;
      }));
      render();
    },
    show(partId: string | null) {
      if (partId) activeId = sheets.find(sheet => sheet.members.some(p => p.id === partId))?.id ?? activeId;
      render();
    },
  };
}
