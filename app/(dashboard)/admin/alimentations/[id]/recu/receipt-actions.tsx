"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, FileImage, FileText, MessageCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ReceiptActions({
  pdfUrl,
  pngUrl,
  receiptNumber,
  whatsappMessage
}: {
  pdfUrl: string;
  pngUrl: string;
  receiptNumber: string;
  whatsappMessage: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(whatsappMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function printReceipt() {
    window.print();
  }

  function openWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Button type="button" onClick={printReceipt} className="bg-emerald-500 text-white hover:bg-emerald-600">
        <Printer className="h-4 w-4" aria-hidden="true" />
        Imprimer
      </Button>
      <Button asChild variant="secondary">
        <Link href={pngUrl} download={`recu-${receiptNumber}.png`}>
          <FileImage className="h-4 w-4" aria-hidden="true" />
          PNG
        </Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href={pdfUrl} download={`recu-${receiptNumber}.pdf`}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          PDF
        </Link>
      </Button>
      <Button type="button" variant="ghost" onClick={copyMessage}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        {copied ? "Copié" : "Copier"}
      </Button>
      <Button type="button" variant="ghost" onClick={openWhatsApp}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        WhatsApp
      </Button>
      <p className="w-full text-xs text-slate-500">
        WhatsApp ouvre le message. Téléchargez le PNG ou le PDF si vous voulez joindre le fichier manuellement.
      </p>
    </>
  );
}
