// Writes a workbook spec (from src/excel/workpaper.js) to .xlsx with exceljs. Main process / Node only.
'use strict';
const ExcelJS = require('exceljs');

const FONT = 'Arial';
const BLUE = 'FF0000FF', GREEN = 'FF008000', BLACK = 'FF000000', NAVY = 'FF0F2A44', GREY = 'FF6B7280';
const FMT = {
  money: '#,##0.00;[Red](#,##0.00);"-"', money0: '#,##0;[Red](#,##0);"-"', int: '0', pct: '0.00%', pct0: '0%', pct1: '0.0%',
  dec2: '0.00', dec4: '0.0000', date: 'dd mmm yyyy', text: '@'
};
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const STYLE = {
  title: { font: { name: FONT, size: 14, bold: true, color: { argb: NAVY } } },
  sub: { font: { name: FONT, size: 10, color: { argb: GREY } } },
  h: { font: { name: FONT, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }, fill: fill(NAVY) },
  sect: { font: { name: FONT, size: 10, bold: true, color: { argb: NAVY } } },
  label: { font: { name: FONT, size: 10 } },
  indent: { font: { name: FONT, size: 10 }, alignment: { indent: 1 } },
  totlabel: { font: { name: FONT, size: 10, bold: true }, border: { top: { style: 'thin' } } },
  input: { font: { name: FONT, size: 10, color: { argb: BLUE } }, fill: fill('FFFFF2CC') },
  calc: { font: { name: FONT, size: 10, color: { argb: BLACK } } },
  link: { font: { name: FONT, size: 10, color: { argb: GREEN } } },
  total: { font: { name: FONT, size: 10, bold: true }, border: { top: { style: 'thin' }, bottom: { style: 'double' } } },
  totalv: { font: { name: FONT, size: 10, bold: true }, border: { top: { style: 'thin' } } },
  value: { font: { name: FONT, size: 10 } },
  boldv: { font: { name: FONT, size: 10, bold: true } },
  bold: { font: { name: FONT, size: 10, bold: true } },
  text: { font: { name: FONT, size: 10 } },
  code: { font: { name: FONT, size: 9, color: { argb: GREY } }, alignment: { horizontal: 'center' } },
  note: { font: { name: FONT, size: 9, italic: true, color: { argb: GREY } }, alignment: { wrapText: true, vertical: 'top' } }
};
const toDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };

async function writeWorkbook(spec, file) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Intax Planner'; wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };
  for (const s of spec.sheets) {
    const ws = wb.addWorksheet(s.name, { views: [s.freeze ? { state: 'frozen', ySplit: s.freeze, showGridLines: false } : { showGridLines: false }], pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
    (s.widths || []).forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    for (const c of s.cells) {
      const cell = ws.getCell(c.r, c.c);
      if (c.f !== undefined) cell.value = c.result !== undefined ? { formula: c.f, result: c.result } : { formula: c.f };
      else if (c.d !== undefined) cell.value = toDate(c.d);
      else cell.value = c.v === undefined ? null : c.v;
      const st = STYLE[c.st] || STYLE.text;
      if (st.font) cell.font = st.font;
      if (st.fill) cell.fill = st.fill;
      if (st.border) cell.border = st.border;
      if (st.alignment) cell.alignment = st.alignment;
      const fmt = c.fmt === 'text' ? null : FMT[c.fmt];
      if (fmt && (typeof c.v === 'number' || c.f !== undefined || c.d !== undefined || c.st === 'input')) cell.numFmt = fmt;
      if (c.note) cell.note = c.note;
    }
    for (const m of s.merges || []) ws.mergeCells(m);
  }
  for (const nm of spec.names || []) wb.definedNames.add(nm.ref, nm.name);
  await wb.xlsx.writeFile(file);
  return file;
}

module.exports = { writeWorkbook };
