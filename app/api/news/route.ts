import { NextResponse } from "next/server";

const SEARCH_TERMS: Record<string, string> = {
  MEX: "selección mexicana futbol",
  RSA: "selección Sudáfrica futbol mundial",
  KOR: "selección Corea del Sur futbol",
  CZE: "selección República Checa futbol",
  CAN: "selección canadiense futbol",
  BIH: "selección Bosnia Herzegovina futbol",
  QAT: "selección Qatar futbol",
  SUI: "selección suiza futbol",
  BRA: "selección brasileña futbol",
  MAR: "selección Marruecos futbol",
  HAI: "selección Haití futbol",
  SCO: "selección Escocia futbol",
  USA: "selección Estados Unidos futbol USMNT",
  PAR: "selección paraguaya futbol",
  AUS: "selección australiana futbol Socceroos",
  TUR: "selección turca futbol",
  GER: "selección alemana futbol",
  CUW: "selección Curazao futbol",
  CIV: "selección Costa de Marfil futbol",
  ECU: "selección ecuatoriana futbol",
  NED: "selección holandesa futbol Países Bajos",
  JPN: "selección japonesa futbol",
  SWE: "selección sueca futbol",
  TUN: "selección tunecina futbol",
  BEL: "selección belga futbol",
  EGY: "selección egipcia futbol",
  IRN: "selección iraní futbol",
  NZL: "selección Nueva Zelanda futbol",
  ESP: "selección española futbol",
  CPV: "selección Cabo Verde futbol",
  KSA: "selección Arabia Saudí futbol",
  URU: "selección uruguaya futbol",
  FRA: "selección francesa futbol",
  SEN: "selección senegalesa futbol",
  IRQ: "selección irakí futbol",
  NOR: "selección noruega futbol",
  ARG: "selección argentina futbol",
  ALG: "selección argelina futbol",
  AUT: "selección austriaca futbol",
  JOR: "selección Jordania futbol",
  POR: "selección portuguesa futbol",
  COD: "selección Congo RD futbol",
  UZB: "selección Uzbekistán futbol",
  COL: "selección colombiana futbol",
  ENG: "selección inglesa futbol",
  CRO: "selección croata futbol",
  GHA: "selección Ghana futbol",
  PAN: "selección panameña futbol",
};

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  return xml.match(re)?.[1]?.trim() ?? "";
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const rawLink = extractTag(block, "link");
    // Google News embeds real link as second <link> (after channel); pick the item one
    const link = rawLink || block.match(/<link\/>(.*?)\n/)?.[1]?.trim() || "";
    const pubDate = extractTag(block, "pubDate");
    const source = extractTag(block, "source");
    const description = extractTag(block, "description")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .slice(0, 200);

    if (title && link) items.push({ title, link, pubDate, source, description });
  }
  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").toUpperCase();

  if (!code) return NextResponse.json({ error: "code requerido" }, { status: 400 });

  const term = SEARCH_TERMS[code] ?? `selección ${code} futbol mundial 2026`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=es&gl=ES&ceid=ES:es`;

  try {
    const res = await fetch(rssUrl, {
      next: { revalidate: 900 }, // cache 15 min
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
    });

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

    const xml = await res.text();
    const items = parseRSS(xml).slice(0, 10);

    return NextResponse.json({ code, items }, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=300" },
    });
  } catch (err) {
    return NextResponse.json({ error: "No se pudieron cargar las noticias", items: [] }, { status: 200 });
  }
}
