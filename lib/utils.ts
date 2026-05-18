// FIFA country code → flag emoji mapping
// Using country-code.js style mapping for flag emojis
const codeToCountry: Record<string, string> = {
  MEX: "MX", RSA: "ZA", KOR: "KR", CZE: "CZ",
  CAN: "CA", BIH: "BA", QAT: "QA", SUI: "CH",
  BRA: "BR", MAR: "MA", HAI: "HT", SCO: "GB-SCT",
  USA: "US", PAR: "PY", AUS: "AU", TUR: "TR",
  GER: "DE", CUW: "CW", CIV: "CI", ECU: "EC",
  NED: "NL", JPN: "JP", SWE: "SE", TUN: "TN",
  BEL: "BE", EGY: "EG", IRN: "IR", NZL: "NZ",
  ESP: "ES", CPV: "CV", KSA: "SA", URU: "UY",
  FRA: "FR", SEN: "SN", IRQ: "IQ", NOR: "NO",
  ARG: "AR", ALG: "DZ", AUT: "AT", JOR: "JO",
  POR: "PT", COD: "CD", UZB: "UZ", COL: "CO",
  ENG: "GB-ENG", CRO: "HR", GHA: "GH", PAN: "PA",
};

/**
 * Get flag emoji from FIFA country code.
 * Uses regional indicator symbols.
 */
export function getFlagEmoji(fifaCode: string): string {
  const isoCode = codeToCountry[fifaCode];
  if (!isoCode) return "🏳️";

  // Handle special cases (Scotland, England use flag sequences)
  if (isoCode === "GB-SCT") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  if (isoCode === "GB-ENG") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";

  // Convert ISO 3166-1 alpha-2 to flag emoji
  const codePoints = [...isoCode.toUpperCase()].map(
    (char) => 0x1f1e6 + char.charCodeAt(0) - 65
  );
  return String.fromCodePoint(...codePoints);
}

/**
 * Get flag image URL from flagcdn.com
 * Returns a URL for an SVG flag image
 */
export function getFlagUrl(fifaCode: string, size: "w20" | "w40" | "w80" | "w160" | "w320" = "w80"): string {
  const isoCode = codeToCountry[fifaCode];
  if (!isoCode) return "";

  // Handle special UK nations
  const code = isoCode.toLowerCase().split("-")[0];
  if (isoCode === "GB-SCT") return `https://flagcdn.com/${size}/gb-sct.png`;
  if (isoCode === "GB-ENG") return `https://flagcdn.com/${size}/gb-eng.png`;

  return `https://flagcdn.com/${size}/${code}.png`;
}

/**
 * Format match stage for display
 */
export function formatStage(stage: string): string {
  const stageMap: Record<string, string> = {
    group: "Fase de Grupos",
    round_of_32: "Dieciseisavos",
    round_of_16: "Octavos de Final",
    quarter_final: "Cuartos de Final",
    semi_final: "Semifinal",
    third_place: "Tercer Puesto",
    final: "Final",
  };
  return stageMap[stage] || stage;
}

/**
 * Format date for display in CET timezone
 */
export function formatMatchDate(dateStr: string | null): string {
  if (!dateStr) return "Fecha por confirmar";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

/**
 * Check if predictions are locked for a given match date
 * Returns true if we are within 15 minutes of kickoff or past it
 */
export function isPredictionLocked(matchDate: string | null): boolean {
  if (!matchDate) return true; // No date = locked (can't predict)
  const deadline = new Date(matchDate).getTime() - 15 * 60 * 1000;
  return Date.now() >= deadline;
}

/**
 * Get time remaining until prediction deadline
 */
export function getTimeUntilDeadline(matchDate: string | null): {
  locked: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
} {
  if (!matchDate) return { locked: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  
  const deadline = new Date(matchDate).getTime() - 15 * 60 * 1000;
  const total = deadline - Date.now();
  
  if (total <= 0) return { locked: true, days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  
  return {
    locked: false,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
    total,
  };
}
