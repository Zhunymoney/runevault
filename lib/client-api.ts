export async function parseApiResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try { data = text ? JSON.parse(text) as Record<string, unknown> : {}; }
  catch { throw new Error(response.ok ? "The server returned an invalid response." : text.trim() || `Request failed (${response.status}).`); }
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : `Request failed (${response.status}).`);
  return data;
}
