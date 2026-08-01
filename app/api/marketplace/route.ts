import { NextResponse } from "next/server";
import { durableRateLimit, requestIp, supabaseUrl } from "@/lib/launch-server";

export async function GET(request: Request) {
  const limit = await durableRateLimit(`marketplace:${requestIp(request)}`, 40, 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many marketplace searches." }, { status: 429 });
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) return NextResponse.json({ error: "Marketplace configuration is unavailable." }, { status: 503 });
  const url = new URL(request.url), search = (url.searchParams.get("q") ?? "").trim().replace(/[,*()]/g, "").slice(0, 100), category = (url.searchParams.get("category") ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80), slug = (url.searchParams.get("slug") ?? "").replace(/[^a-z0-9-]/g, "").slice(0, 120);
  const filters = ["active=eq.true", "select=id,slug,title,category,description,featured,available_stock_m,minimum_amount_m,maximum_amount_m,updated_at", "order=featured.desc,updated_at.desc", "limit=100"];
  if (search) filters.push(`or=(title.ilike.*${encodeURIComponent(search)}*,description.ilike.*${encodeURIComponent(search)}*)`);
  if (category) filters.push(`category=eq.${encodeURIComponent(category)}`);
  if (slug) filters.push(`slug=eq.${encodeURIComponent(slug)}`);
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const [listingsResponse, announcementsResponse] = await Promise.all([
    fetch(`${supabaseUrl()}/rest/v1/listings?${filters.join("&")}`, { headers, cache: "no-store" }),
    fetch(`${supabaseUrl()}/rest/v1/marketplace_announcements?select=id,title,body,severity,starts_at,ends_at&active=eq.true&order=starts_at.desc&limit=10`, { headers, cache: "no-store" }),
  ]);
  const listings = await listingsResponse.json().catch(() => []);
  const announcements = announcementsResponse.ok ? await announcementsResponse.json().catch(() => []) : [];
  if (!listingsResponse.ok) return NextResponse.json({ error: "Marketplace listings are unavailable until the inventory migration is applied." }, { status: 503 });
  return NextResponse.json({ listings, announcements });
}
