import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDh } from "@/lib/money";
import { buildReceiptVerificationPayload, paymentMethodLabel } from "@/lib/topup-receipt";
import { resolveTopUpReceiptData } from "@/lib/topup-receipt-data";
import { buildQrDataUrl } from "@/lib/qr";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const result = await resolveTopUpReceiptData(id, token);

  if (!result.ok) {
    if (result.reason === "login") {
      return NextResponse.redirect(new URL("/connexion", request.url));
    }
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const { topUp, transaction, verificationHash } = result.data;
  const receiptNumber = topUp.receiptNumber!;
  const receiptIssuedAt = topUp.receiptIssuedAt!;
  const reviewedByName = topUp.reviewedBy!.name;
  const qrPayload = buildReceiptVerificationPayload({ receiptNumber, verificationHash });
  const qrDataUrl = await buildQrDataUrl(qrPayload, 360);

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1350px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "radial-gradient(circle at 12% 0%, rgba(16,185,129,0.48), transparent 30%), radial-gradient(circle at 92% 18%, rgba(59,130,246,0.28), transparent 30%), #020617",
          color: "white",
          padding: "76px",
          fontFamily: "Arial, sans-serif"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, letterSpacing: 8, color: "#a7f3d0", fontWeight: 700 }}>MINI SPORTY</div>
            <div style={{ marginTop: 28, fontSize: 76, fontWeight: 800, letterSpacing: -4 }}>Votre reçu</div>
            <div style={{ marginTop: 16, fontSize: 30, color: "#cbd5e1" }}>Paiement confirmé</div>
          </div>
          <div style={{ borderRadius: 999, background: "#6ee7b7", color: "#052e16", padding: "18px 30px", fontSize: 28, fontWeight: 800 }}>VALIDÉ</div>
        </div>

        <div style={{ display: "flex", gap: 36 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.08)", borderRadius: 44, padding: 44 }}>
            <div style={{ fontSize: 26, color: "#a7f3d0", letterSpacing: 5, fontWeight: 800 }}>MONTANT REÇU</div>
            <div style={{ marginTop: 22, fontSize: 104, fontWeight: 900, letterSpacing: -7 }}>{formatDh(topUp.amount)}</div>
            <div style={{ marginTop: 44, display: "flex", flexDirection: "column", gap: 20 }}>
              <ReceiptImageLine label="Joueur" value={topUp.user.name} />
              <ReceiptImageLine label="Paiement" value={paymentMethodLabel(topUp.paymentMethod)} />
              <ReceiptImageLine label="Date" value={format(receiptIssuedAt, "d MMM yyyy · HH:mm", { locale: fr })} />
              <ReceiptImageLine label="Reçu" value={receiptNumber} />
            </div>
          </div>
          <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ width: 320, height: 320, borderRadius: 36, background: "white", padding: 22, display: "flex" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR reçu" width={276} height={276} />
            </div>
            <div style={{ border: "1px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.08)", borderRadius: 32, padding: 24, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 22, color: "#94a3b8", letterSpacing: 4, fontWeight: 800 }}>HASH</div>
              <div style={{ marginTop: 12, fontSize: 28, fontFamily: "monospace", color: "white" }}>{verificationHash}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <ReceiptImageTile label="Ancien solde" value={formatDh(transaction.balanceBefore)} />
          <ReceiptImageTile label="Nouveau solde" value={formatDh(transaction.balanceAfter)} strong />
          <ReceiptImageTile label="Validé par" value={reviewedByName} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", color: "#cbd5e1" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
            <div style={{ fontSize: 24, letterSpacing: 4, color: "#94a3b8", fontWeight: 800 }}>RÉFÉRENCE</div>
            <div style={{ marginTop: 12, fontSize: 24 }}>{transaction.id}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ fontSize: 24, letterSpacing: 4, color: "#94a3b8", fontWeight: 800 }}>SIGNATURE</div>
            <div style={{ marginTop: 48, width: 240, borderTop: "2px solid rgba(255,255,255,0.32)", paddingTop: 14, fontSize: 24 }}>{reviewedByName}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        "Content-Disposition": `attachment; filename="recu-${receiptNumber}.png"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}

function ReceiptImageLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 22, color: "#94a3b8", letterSpacing: 4, fontWeight: 800 }}>{label.toUpperCase()}</div>
      <div style={{ marginTop: 6, fontSize: 32, color: "white", fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ReceiptImageTile({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ flex: 1, border: strong ? "1px solid rgba(110,231,183,0.46)" : "1px solid rgba(255,255,255,0.14)", background: strong ? "rgba(16,185,129,0.18)" : "rgba(255,255,255,0.08)", borderRadius: 32, padding: 28, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 22, color: strong ? "#a7f3d0" : "#94a3b8", letterSpacing: 4, fontWeight: 800 }}>{label.toUpperCase()}</div>
      <div style={{ marginTop: 12, fontSize: 36, color: "white", fontWeight: 800 }}>{value}</div>
    </div>
  );
}
