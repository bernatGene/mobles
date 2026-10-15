import Module from 'manifold-3d';
import { writeFileSync } from 'node:fs';
import { defaults, makeParts } from '../src/model';
import { drawingSheets, sheetSvg } from '../src/drawings';
const api = await Module(); api.setup();
for (const [name, params] of [['d', defaults], ['b', { ...defaults, L: 1400, D: 420, Hd: 140 }]] as const) {
  const sheets = drawingSheets(api, makeParts(params));
  console.log(name, sheets.map(s => s.title + ' 1:' + s.scale).join(', '));
  sheets.forEach((s, i) => { if (s.faceHoles.length || s.edgeHoles.length) writeFileSync('/private/tmp/claude-501/-Users-bernat-p-consola-entrada/19e62af1-ca47-48da-8c98-0c616787626e/scratchpad/' + name + i + '.svg', sheetSvg(s, i, sheets.length)); });
}
