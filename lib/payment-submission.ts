export type CryptoPaymentMethod = { id: string; quoteToken: string };

export function buildCryptoSubmission(reference: string, method: CryptoPaymentMethod, txid: string) {
  const paymentMethod = method.id.toLowerCase();
  if (paymentMethod !== "btc" && paymentMethod !== "usdc") throw new Error("Select BTC or USDC before submitting payment.");
  return { reference: reference.trim().toUpperCase(), paymentMethod, quoteToken: method.quoteToken, txid: txid.trim() };
}
