"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PWA_IOS_HELP_DISMISSED_KEY, isIosSafari, isStandaloneDisplayMode } from "@/lib/pwa";
import { Check, Download, RefreshCw, Share2, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaControlsProps = {
  layout?: "inline" | "card";
  className?: string;
};

function readIosHelpDismissed() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PWA_IOS_HELP_DISMISSED_KEY) === "true";
}

function writeIosHelpDismissed(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(PWA_IOS_HELP_DISMISSED_KEY, "true");
  } else {
    window.localStorage.removeItem(PWA_IOS_HELP_DISMISSED_KEY);
  }
}

export function PwaControls({ layout = "inline", className }: PwaControlsProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [iosHelpDismissed, setIosHelpDismissed] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updatePending, setUpdatePending] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const updatePendingRef = useRef(false);

  useEffect(() => {
    const syncStandaloneState = () => {
      const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean };
      setIsInstalled(isStandaloneDisplayMode(window) || standaloneNavigator.standalone === true);
    };

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIosHelpDismissed(true);
      writeIosHelpDismissed(true);
    };

    const onControllerChange = () => {
      if (!updatePendingRef.current) return;
      updatePendingRef.current = false;
      window.location.reload();
    };

    syncStandaloneState();

    const frame = window.requestAnimationFrame(() => {
      setIsMounted(true);
      setIosHelpDismissed(readIosHelpDismissed());
    });

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          registrationRef.current = registration;
          if (registration.waiting) {
            setUpdateAvailable(true);
          }

          const onUpdateFound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          };

          registration.addEventListener("updatefound", onUpdateFound);
        })
        .catch(() => undefined);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  async function installAndroid() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setIsInstalled(true);
      setIosHelpDismissed(true);
      writeIosHelpDismissed(true);
    }
    setDeferredPrompt(null);
  }

  async function updateApp() {
    const registration = registrationRef.current;
    if (!registration?.waiting) return;
    updatePendingRef.current = true;
    setUpdatePending(true);
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }

  function dismissIosHelp() {
    setIosHelpDismissed(true);
    writeIosHelpDismissed(true);
  }

  const isIosBrowser = typeof window !== "undefined" && isIosSafari(window.navigator.userAgent, window.navigator.platform, window.navigator.maxTouchPoints);
  const shouldShowIosHelp = isMounted && isIosBrowser && !iosHelpDismissed && !isInstalled;

  const installedBadge = isInstalled ? (
    <Badge variant="success" className="inline-flex items-center gap-1">
      <Check className="h-3.5 w-3.5" />
      Application installée
    </Badge>
  ) : null;

  const updateNotice = updateAvailable ? (
    <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">Une nouvelle version est disponible</p>
        <p className="text-emerald-900/80">Mettez à jour pour récupérer les dernières améliorations et les nouveaux caches.</p>
      </div>
      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={updateApp} disabled={updatePending}>
        <RefreshCw className="h-4 w-4" />
        {updatePending ? "Mise à jour..." : "Mettre à jour"}
      </Button>
    </div>
  ) : null;

  const androidInstall = !isInstalled && deferredPrompt ? (
    <Button type="button" onClick={installAndroid} className={cn("w-full", layout === "inline" && "justify-start")}>
      <Download className="h-4 w-4" />
      Installer Mini Sporty
    </Button>
  ) : null;

  const iosHelp = shouldShowIosHelp ? (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="info">iPhone / iPad</Badge>
          <p className="mt-2 text-sm font-semibold text-slate-900">Installer Mini Sporty</p>
          <p className="mt-1 text-sm text-slate-600">Appuyez sur Partager puis Sur l’écran d’accueil.</p>
        </div>
        <Button type="button" variant="ghost" className="h-10 w-10 p-0" onClick={dismissIosHelp} aria-label="Fermer l’aide">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-dashed bg-slate-50 p-3 text-sm text-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Share2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">1. Partager</p>
              <p className="text-slate-500">Dans Safari, touchez le bouton Partager.</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed bg-slate-50 p-3 text-sm text-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <Smartphone className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium">2. Écran d’accueil</p>
              <p className="text-slate-500">Touchez Sur l’écran d’accueil puis Ajouter.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (layout === "card") {
    return (
      <Card className={cn("space-y-4", className)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Installation</p>
            <p className="mt-1 text-sm text-slate-600">Installez Mini Sporty sur votre écran d’accueil pour un accès rapide.</p>
          </div>
          {installedBadge}
        </div>
        {updateNotice}
        {androidInstall}
        {iosHelp}
      </Card>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {installedBadge}
      {updateNotice}
      {androidInstall}
      {iosHelp}
    </div>
  );
}
