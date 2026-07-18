type PdfLine = {
  text: string;
  bold?: boolean;
  size?: number;
  indent?: number;
  spacingBefore?: number;
};

function sanitizePdfText(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?")
    .replace(/[\\()]/g, "\\$&");
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export function buildPdfBuffer(lines: PdfLine[], title = "Friday Match Wallet") {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const maxChars = 86;

  const contentCommands: string[] = [];
  let cursorY = pageHeight - 60;

  const drawLine = (text: string, options: Required<Pick<PdfLine, "bold" | "size">> & { indent: number; spacingBefore: number }) => {
    const font = options.bold ? "/F2" : "/F1";
    const wrapped = wrapText(text, maxChars - Math.floor(options.indent / 6));
    cursorY -= options.spacingBefore;

    for (const segment of wrapped) {
      if (cursorY < margin) break;
      contentCommands.push(`${font} ${options.size} Tf`);
      contentCommands.push(`1 0 0 1 ${margin + options.indent} ${cursorY} Tm`);
      contentCommands.push(`(${sanitizePdfText(segment)}) Tj`);
      cursorY -= options.size + 6;
    }
  };

  contentCommands.push("BT");
  drawLine(title, { bold: true, size: 20, indent: 0, spacingBefore: 0 });
  cursorY -= 8;
  contentCommands.push("/F1 10 Tf");
  contentCommands.push(`1 0 0 1 ${margin} ${cursorY} Tm`);
  contentCommands.push(`(${sanitizePdfText("Reçu imprimable - Friday Match Wallet")}) Tj`);
  cursorY -= 18;

  for (const line of lines) {
    if (cursorY < margin) break;
    const options = {
      bold: line.bold ?? false,
      size: line.size ?? 12,
      indent: line.indent ?? 0,
      spacingBefore: line.spacingBefore ?? 4
    };
    drawLine(line.text, options);
  }

  contentCommands.push("ET");

  const content = contentCommands.join("\n");
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${offsets[i].toString().padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}
