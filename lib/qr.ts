import QRCode from "qrcode";

export async function buildPresenceQrSvg(content: string) {
  return QRCode.toString(content, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320
  });
}

export async function buildQrSvg(content: string, width = 320) {
  return QRCode.toString(content, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width,
    color: {
      dark: "#0f172a",
      light: "#ffffff"
    }
  });
}

export async function buildQrDataUrl(content: string, width = 360) {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "M",
    margin: 1,
    width,
    color: {
      dark: "#0f172a",
      light: "#ffffff"
    }
  });
}

export async function tryBuildPresenceQrSvg(content: string) {
  try {
    return await buildPresenceQrSvg(content);
  } catch (error) {
    console.error("[presence-qr] Échec de génération du QR.", error);
    return null;
  }
}
