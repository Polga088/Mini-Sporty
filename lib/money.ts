import { Prisma } from "@prisma/client";

export const DZD = new Intl.NumberFormat("fr-MA", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatDh(amount: Prisma.Decimal | number | string) {
  const value = typeof amount === "number" ? amount : Number(amount);
  return `${DZD.format(value)} DH`;
}

export function decimal(input: Prisma.Decimal | number | string) {
  return new Prisma.Decimal(input);
}

