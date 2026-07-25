"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WhatsAppActions({ message, whatsappUrl }: { message: string; whatsappUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function openWhatsApp() {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="ghost" onClick={copyMessage}>
        {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
        {copied ? "Message copié" : "Copier le message"}
      </Button>
      <Button type="button" onClick={openWhatsApp}>
        <MessageCircle className="h-4 w-4 shrink-0" />
        Ouvrir WhatsApp
      </Button>
    </div>
  );
}
