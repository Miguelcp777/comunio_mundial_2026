import { NextResponse } from "next/server";

// Force dynamic: Netlify CDN no cachea en base al query param por defecto
export const dynamic = "force-dynamic";

const SEARCH_TERMS: Record<string, string> = {
  MEX: '"selección mexicana" OR "selección de México" futbol',
  RSA: '"selección de Sudáfrica" OR "Bafana Bafana" futbol',
  KOR: '"selección de Corea del Sur" futbol',
  CZE: '"selección checa" OR "República Checa" futbol',
  CAN: '"selección canadiense" OR "Canada Soccer" futbol',
  BIH: '"Bosnia Herzegovina" selección futbol',
  QAT: '"selección de Qatar" futbol',
  SUI: '"selección suiza" OR "selección de Suiza" futbol',
  BRA: '"selección brasileña" OR "selección de Brasil" futbol',
  MAR: '"selección de Marruecos" futbol',
  HAI: '"selección de Haití" futbol',
  SCO: '"selección de Escocia" futbol',
  USA: '"selección de Estados Unidos" OR "USMNT" futbol',
  PAR: '"selección paraguaya" OR "selección de Paraguay" futbol',
  AUS: '"selección australiana" OR "Socceroos" futbol',
  TUR: '"selección turca" OR "selección de Turquía" futbol',
  GER: '"selección alemana" OR "selección de Alemania" futbol',
  CUW: '"selección de Curazao" futbol',
  CIV: '"Costa de Marfil" selección futbol',
  ECU: '"selección ecuatoriana" OR "selección de Ecuador" futbol',
  NED: '"selección holandesa" OR "Países Bajos" selección futbol',
  JPN: '"selección japonesa" OR "selección de Japón" futbol',
  SWE: '"selección sueca" OR "selección de Suecia" futbol',
  TUN: '"selección tunecina" OR "selección de Túnez" futbol',
  BEL: '"selección belga" OR "selección de Bélgica" futbol',
  EGY: '"selección egipcia" OR "selección de Egipto" futbol',
  IRN: '"selección iraní" OR "selección de Irán" futbol',
  NZL: '"Nueva Zelanda" selección futbol',
  ESP: '"selección española" futbol',
  CPV: '"Cabo Verde" selección futbol',
  KSA: '"Arabia Saudí" OR "Arabia Saudita" selección futbol',
  URU: '"selección uruguaya" OR "selección de Uruguay" futbol',
  FRA: '"selección francesa" OR "selección de Francia" futbol',
  SEN: '"selección de Senegal" futbol',
  IRQ: '"selección de Irak" futbol',
  NOR: '"selección noruega" OR "selección de Noruega" futbol',
  ARG: '"selección argentina" futbol',
  ALG: '"selección argelina" OR "selección de Argelia" futbol',
  AUT: '"selección austriaca" OR "selección de Austria" futbol',
  JOR: '"selección de Jordania" futbol',
  POR: '"selección portuguesa" OR "selección de Portugal" futbol',
  COD: '"Congo" selección futbol "República Democrática"',
  UZB: '"selección de Uzbekistán" futbol',
  COL: '"selección colombiana" OR "selección de Colombia" futbol',
  ENG: '"selección inglesa" OR "selección de Inglaterra" futbol',
  CRO: '"selección croata" OR "selección de Croacia" futbol',
  GHA: '"selección de Ghana" futbol',
  PAN: '"selección panameña" OR "selección de Panamá" futbol',
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

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
}

function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];

    const rawTitle = extractTag(block, "title");
    // Google News appends " - Source" at the end of the title — strip it
    const title = decodeEntities(rawTitle.replace(/\s*-\s*[^-]+$/, "").trim());

    // In Google News RSS the <link> tag is self-closing followed by the URL as text
    // Standard format: <link>https://...</link>  OR  <link/>\nhttps://...
    let link = extractTag(block, "link");
    if (!link) {
      const m2 = block.match(/<link\s*\/>\s*(https?:\/\/[^\s<]+)/);
      link = m2?.[1]?.trim() ?? "";
    }

    const pubDate = extractTag(block, "pubDate");
    const source = decodeEntities(extractTag(block, "source"));
    const description = decodeEntities(
      extractTag(block, "description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    ).slice(0, 220);

    if (title && link) items.push({ title, link, pubDate, source, description });
  }
  return items;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").toUpperCase().trim();

  if (!code) return NextResponse.json({ error: "code requerido" }, { status: 400 });

  const term = SEARCH_TERMS[code] ?? `selección ${code} futbol mundial 2026`;
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(term)}&hl=es&gl=ES&ceid=ES:es&num=20`;

  try {
    const res = await fetch(rssUrl, {
      cache: "no-store", // fetch siempre fresco; el caché lo gestionamos nosotros
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
    });

    if (!res.ok) throw new Error(`RSS ${res.status}`);

    const xml = await res.text();
    const items = parseRSS(xml).slice(0, 10);

    return NextResponse.json({ code, items }, {
      headers: {
        // Cache-Control privado: el navegador cachea, Netlify CDN no
        "Cache-Control": "private, max-age=900",
        "X-News-Code": code,
      },
    });
  } catch {
    return NextResponse.json({ code, error: "No se pudieron cargar las noticias", items: [] });
  }
}
