import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimal } from "@/lib/money";

export const SETTINGS_SINGLETON_KEY = "global";

export const defaultAppSettings = {
  singletonKey: SETTINGS_SINGLETON_KEY,
  organizationName: "Friday Match Wallet",
  logoUrl: null as string | null,
  defaultGround: "Terrain Central",
  defaultMatchPrice: decimal(10),
  defaultCapacity: 12,
  walletAlertThreshold: decimal(20),
  whatsappTemplate:
    "Bonjour {name},\n\nVotre alimentation de {amount} DH a été validée.\n\nNuméro de reçu : {receiptNumber}\nNouveau solde : {balance} DH\n\nMerci."
};

export type AppSettingsSnapshot = typeof defaultAppSettings;

type MaybeSettings = {
  singletonKey: string;
  organizationName: string;
  logoUrl: string | null;
  defaultGround: string;
  defaultMatchPrice: Prisma.Decimal;
  defaultCapacity: number;
  walletAlertThreshold: Prisma.Decimal;
  whatsappTemplate: string;
} | null;

export function mergeSettings(settings: MaybeSettings): AppSettingsSnapshot {
  if (!settings) return defaultAppSettings;

  return {
    singletonKey: settings.singletonKey,
    organizationName: settings.organizationName,
    logoUrl: settings.logoUrl,
    defaultGround: settings.defaultGround,
    defaultMatchPrice: settings.defaultMatchPrice ?? defaultAppSettings.defaultMatchPrice,
    defaultCapacity: settings.defaultCapacity ?? defaultAppSettings.defaultCapacity,
    walletAlertThreshold: settings.walletAlertThreshold ?? defaultAppSettings.walletAlertThreshold,
    whatsappTemplate: settings.whatsappTemplate || defaultAppSettings.whatsappTemplate
  };
}

export async function getAppSettings() {
  const settings = await prisma.appSettings.findFirst({
    where: { singletonKey: SETTINGS_SINGLETON_KEY }
  });

  return mergeSettings(settings);
}

export function fillWhatsappTemplate(
  template: string,
  params: {
    name: string;
    amount: string;
    receiptNumber: string;
    balance: string;
  }
) {
  return template
    .replaceAll("{name}", params.name)
    .replaceAll("{amount}", params.amount)
    .replaceAll("{receiptNumber}", params.receiptNumber)
    .replaceAll("{balance}", params.balance);
}
