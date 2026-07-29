import QRCode from "qrcode";

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
    .replace(/[\u0300-\u036f]/g, "")
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

type ReceiptPdfParams = {
  receiptNumber: string;
  playerName: string;
  playerContact: string;
  amount: string;
  paymentMethod: string;
  issuedAtLabel: string;
  balanceBefore: string;
  balanceAfter: string;
  validatorName: string;
  transactionId: string;
  verificationHash: string;
  qrPayload: string;
  note?: string | null;
};

function formatPdfNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function hexColorToRgb(color: string) {
  const normalized = color.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255
  };
}

function setFill(color: string) {
  const { r, g, b } = hexColorToRgb(color);
  return `${formatPdfNumber(r)} ${formatPdfNumber(g)} ${formatPdfNumber(b)} rg`;
}

function setStroke(color: string) {
  const { r, g, b } = hexColorToRgb(color);
  return `${formatPdfNumber(r)} ${formatPdfNumber(g)} ${formatPdfNumber(b)} RG`;
}

function drawText(options: {
  x: number;
  y: number;
  text: string;
  size?: number;
  bold?: boolean;
  color?: string;
}) {
  const font = options.bold ? "/F2" : "/F1";
  return [
    "BT",
    setFill(options.color ?? "#0f172a"),
    `${font} ${options.size ?? 12} Tf`,
    `1 0 0 1 ${formatPdfNumber(options.x)} ${formatPdfNumber(options.y)} Tm`,
    `(${sanitizePdfText(options.text)}) Tj`,
    "ET"
  ].join("\n");
}

function drawBox(options: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
}) {
  const commands = [setFill(options.fill)];
  if (options.stroke) {
    commands.push(setStroke(options.stroke), "1 w");
  }
  commands.push(`${formatPdfNumber(options.x)} ${formatPdfNumber(options.y)} ${formatPdfNumber(options.width)} ${formatPdfNumber(options.height)} re`);
  commands.push(options.stroke ? "B" : "f");
  return commands.join("\n");
}

function drawQrCode(payload: string, options: { x: number; y: number; size: number }) {
  const qrCode = QRCode.create(payload, { errorCorrectionLevel: "M" });
  const moduleCount = qrCode.modules.size;
  const quietZone = 3;
  const totalModules = moduleCount + quietZone * 2;
  const moduleSize = options.size / totalModules;
  const commands: string[] = [
    drawBox({
      x: options.x,
      y: options.y,
      width: options.size,
      height: options.size,
      fill: "#ffffff"
    }),
    setFill("#0f172a")
  ];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!qrCode.modules.get(row, col)) continue;
      const x = options.x + (col + quietZone) * moduleSize;
      const y = options.y + options.size - (row + quietZone + 1) * moduleSize;
      commands.push(`${formatPdfNumber(x)} ${formatPdfNumber(y)} ${formatPdfNumber(moduleSize)} ${formatPdfNumber(moduleSize)} re`);
    }
  }

  commands.push("f");
  return commands.join("\n");
}

function buildObjects(content: string) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);

  return objects;
}

function serializePdf(objects: string[]) {
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

export function buildReceiptPdfBuffer(params: ReceiptPdfParams) {
  const commands: string[] = [
    drawBox({ x: 0, y: 0, width: 595.28, height: 841.89, fill: "#f8fafc" }),
    drawBox({ x: 42, y: 54, width: 511, height: 734, fill: "#ffffff", stroke: "#dbeafe" }),
    drawBox({ x: 42, y: 650, width: 511, height: 138, fill: "#020617" }),
    drawBox({ x: 405, y: 722, width: 96, height: 34, fill: "#6ee7b7" }),
    drawText({ x: 76, y: 746, text: "MINI SPORTY", size: 12, bold: true, color: "#a7f3d0" }),
    drawText({ x: 76, y: 704, text: "Votre reçu", size: 34, bold: true, color: "#ffffff" }),
    drawText({ x: 76, y: 680, text: "Paiement confirmé", size: 13, color: "#cbd5e1" }),
    drawText({ x: 422, y: 733, text: "VALIDE", size: 12, bold: true, color: "#052e16" }),
    drawText({ x: 76, y: 598, text: "MONTANT RECU", size: 10, bold: true, color: "#059669" }),
    drawText({ x: 76, y: 548, text: params.amount, size: 36, bold: true, color: "#0f172a" }),
    drawQrCode(params.qrPayload, { x: 385, y: 510, size: 116 }),
    drawText({ x: 386, y: 492, text: "QR de verification", size: 8, color: "#64748b" }),
    drawBox({ x: 76, y: 410, width: 196, height: 80, fill: "#f1f5f9", stroke: "#e2e8f0" }),
    drawBox({ x: 288, y: 410, width: 196, height: 80, fill: "#ecfdf5", stroke: "#bbf7d0" }),
    drawText({ x: 94, y: 458, text: "Ancien solde", size: 9, bold: true, color: "#64748b" }),
    drawText({ x: 94, y: 432, text: params.balanceBefore, size: 18, bold: true, color: "#0f172a" }),
    drawText({ x: 306, y: 458, text: "Nouveau solde", size: 9, bold: true, color: "#047857" }),
    drawText({ x: 306, y: 432, text: params.balanceAfter, size: 18, bold: true, color: "#065f46" }),
    drawText({ x: 76, y: 366, text: "Joueur", size: 9, bold: true, color: "#64748b" }),
    drawText({ x: 76, y: 346, text: params.playerName, size: 15, bold: true }),
    drawText({ x: 76, y: 324, text: params.playerContact, size: 10, color: "#475569" }),
    drawText({ x: 304, y: 366, text: "Paiement", size: 9, bold: true, color: "#64748b" }),
    drawText({ x: 304, y: 346, text: params.paymentMethod, size: 13, bold: true }),
    drawText({ x: 304, y: 324, text: params.issuedAtLabel, size: 10, color: "#475569" }),
    drawText({ x: 76, y: 272, text: "Numero", size: 9, bold: true, color: "#64748b" }),
    drawText({ x: 76, y: 252, text: params.receiptNumber, size: 12, bold: true }),
    drawText({ x: 304, y: 272, text: "Valide par", size: 9, bold: true, color: "#64748b" }),
    drawText({ x: 304, y: 252, text: params.validatorName, size: 12, bold: true }),
    drawText({ x: 76, y: 204, text: "Hash", size: 9, bold: true, color: "#64748b" }),
    drawText({ x: 76, y: 184, text: params.verificationHash, size: 10, color: "#0f172a" }),
    drawText({ x: 76, y: 150, text: "Reference transaction", size: 9, bold: true, color: "#64748b" }),
    drawText({ x: 76, y: 130, text: params.transactionId, size: 10, color: "#0f172a" }),
    drawText({ x: 360, y: 150, text: "Signature", size: 9, bold: true, color: "#64748b" }),
    setStroke("#94a3b8"),
    "360 118 m 510 118 l S",
    drawText({ x: 360, y: 98, text: params.validatorName, size: 10, color: "#475569" })
  ];

  if (params.note) {
    commands.push(drawText({ x: 76, y: 88, text: `Note: ${params.note}`, size: 9, color: "#475569" }));
  }

  return serializePdf(buildObjects(commands.join("\n")));
}
