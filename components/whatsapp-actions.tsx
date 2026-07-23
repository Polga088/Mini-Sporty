"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function WhatsAppActions({ message, whatsappUrl }: { message: string; whatsappUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openWhatsApp() {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" onClick={copyMessage}>
        {copied ? "Message copié" : "Copier le message"}
      </Button>
      <Button type="button" onClick={openWhatsApp}>
        Ouvrir WhatsApp
      </Button>
    </div>
  );
}
