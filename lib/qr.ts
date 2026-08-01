import QRCode from "qrcode";

export async function generateQRCode(data: string) {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 320,
  });
}

export async function generateBitcoinQR(
  address: string,
  amount?: number
) {
  const uri =
    amount && amount > 0
      ? `bitcoin:${address}?amount=${amount}`
      : `bitcoin:${address}`;

  return generateQRCode(uri);
}

export async function generateUSDCQR(
  address: string
) {
  return generateQRCode(address);
}