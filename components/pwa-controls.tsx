"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaControls() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const showInstallButton = useMemo(() => Boolean(deferredPrompt) && !isInstalled, [deferredPrompt, isInstalled]);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
    const frame = window.requestAnimationFrame(() => {
      setIsInstalled(window.matchMedia("(display-mode: standalone)").matches || standaloneNavigator.standalone === true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!showInstallButton) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="gap-2 border border-slate-200 bg-white/80"
      onClick={async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      }}
    >
      <Download className="h-4 w-4" />
      Installer l’application
      <Smartphone className="h-4 w-4 opacity-60" />
    </Button>
  );
}
