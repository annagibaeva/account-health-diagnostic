// Portable one-page PDF writer. Fixed-width typography makes fit checks exact.
// Deliberately rejects unsupported glyphs and overflow instead of silently losing content.
export function pdfLines(text) {
 const normalized=String(text).replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\u2026/g,'...');
 if(/[^\x20-\x7e\r\n\t]/.test(normalized))throw new Error('PDF supports Latin ASCII text. Replace unsupported characters before export.');
 const result=[];
 for(const raw of normalized.replace(/\r/g,'').replace(/\t/g,'    ').split('\n')) {
  let remaining=raw;
  while(remaining.length>92){let cut=remaining.lastIndexOf(' ',92);if(cut<1)cut=92;result.push(remaining.slice(0,cut));remaining=remaining.slice(cut).trimStart()}
  result.push(remaining);
 }
 if(result.length>65)throw new Error(`Brief requires ${result.length} lines; the one-page limit is 65. Shorten the goal, objectives or narrative before export.`);
 return result;
}
export function onePagePdf(text) {
 const lines=pdfLines(text),escape=s=>s.replace(/([\\()])/g,'\\$1');
 const commands=['0.12 0.17 0.15 rg','BT','/F1 9 Tf','11 TL','48 790 Td',...lines.flatMap((line,i)=>[...(i?['T*']:[]),`(${escape(line)}) Tj`]),'ET'];
 const stream=commands.join('\n');
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
 let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});
 const xref=pdf.length;pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
 return new TextEncoder().encode(pdf);
}

