"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ReceiptActions({
  pdfUrl,
  receiptNumber,
  whatsappMessage
}: {
  pdfUrl: string;
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
      <Button type="button" onClick={printReceipt}>
        Imprimer
      </Button>
      <Button asChild variant="secondary">
        <Link href={pdfUrl} download={`recu-${receiptNumber}.pdf`}>
          Télécharger en PDF
        </Link>
      </Button>
      <Button type="button" variant="ghost" onClick={copyMessage}>
        {copied ? "Message copié" : "Copier le message"}
      </Button>
      <Button type="button" variant="ghost" onClick={openWhatsApp}>
        Partager sur WhatsApp
      </Button>
    </>
  );
}
