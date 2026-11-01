/** Deterministic PRNG so seeded screenshots are identical on every reseed. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A wireframe "screenshot" of a fictional product screen, tinted with the
 * product's color, used as seed attachments.
 */
export function renderMockScreenshot(opts: { seed: number; product: string; title: string; accent: string; mobile?: boolean }) {
  const rand = mulberry32(opts.seed);
  const { accent } = opts;
  if (opts.mobile) {
    const W = 360, H = 720;
    const rows = Array.from({ length: 6 }, (_, i) => {
      const y = 170 + i * 82;
      return `<rect x="20" y="${y}" width="320" height="70" rx="12" fill="#fff" stroke="#e6e8ef"/>
        <circle cx="52" cy="${y + 35}" r="16" fill="${accent}" opacity="${0.25 + rand() * 0.5}"/>
        <rect x="80" y="${y + 20}" width="${120 + rand() * 120}" height="10" rx="5" fill="#2b2f3a" opacity="0.75"/>
        <rect x="80" y="${y + 40}" width="${80 + rand() * 100}" height="8" rx="4" fill="#9aa1b2"/>`;
    }).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif">
      <rect width="${W}" height="${H}" rx="28" fill="#f6f7fb"/>
      <rect width="${W}" height="120" rx="28" fill="${accent}"/><rect y="90" width="${W}" height="30" fill="${accent}"/>
      <text x="24" y="70" fill="#fff" font-size="13" opacity="0.85">${esc(opts.product)}</text>
      <text x="24" y="100" fill="#fff" font-size="22" font-weight="700">${esc(opts.title)}</text>
      <rect x="20" y="136" width="200" height="18" rx="9" fill="#e6e8ef"/>
      ${rows}
      <rect x="0" y="${H - 64}" width="${W}" height="64" fill="#fff" stroke="#e6e8ef"/>
      ${[0, 1, 2, 3].map((i) => `<circle cx="${45 + i * 90}" cy="${H - 32}" r="9" fill="${i === 0 ? accent : "#c4c8d4"}"/>`).join("")}
    </svg>`;
  }

  const W = 1200, H = 750;
  const bars = Array.from({ length: 12 }, (_, i) => {
    const h = 40 + rand() * 150;
    return `<rect x="${330 + i * 34}" y="${560 - h}" width="22" height="${h}" rx="4" fill="${accent}" opacity="${0.35 + (i / 12) * 0.6}"/>`;
  }).join("");
  const list = Array.from({ length: 5 }, (_, i) => {
    const y = 300 + i * 52;
    return `<rect x="790" y="${y}" width="370" height="40" rx="8" fill="#f6f7fb"/>
      <rect x="806" y="${y + 15}" width="${110 + rand() * 140}" height="10" rx="5" fill="#2b2f3a" opacity="0.7"/>
      <rect x="1100" y="${y + 12}" width="44" height="16" rx="8" fill="${accent}" opacity="0.25"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="system-ui, sans-serif">
    <rect width="${W}" height="${H}" fill="#eef0f5"/>
    <rect x="0" y="0" width="${W}" height="40" fill="#e2e5ec"/>
    ${["#f06a6a", "#f2c14e", "#5fc27e"].map((c, i) => `<circle cx="${22 + i * 20}" cy="20" r="6" fill="${c}"/>`).join("")}
    <rect x="120" y="11" width="420" height="18" rx="9" fill="#fff"/>
    <rect x="0" y="40" width="250" height="${H - 40}" fill="#fbfbfd" stroke="#e3e6ee"/>
    <rect x="24" y="64" width="28" height="28" rx="7" fill="${accent}"/>
    <text x="64" y="84" font-size="17" font-weight="700" fill="#1f2330">${esc(opts.product)}</text>
    ${Array.from({ length: 7 }, (_, i) => `<rect x="24" y="${130 + i * 40}" width="${120 + rand() * 70}" height="12" rx="6" fill="${i === 1 ? accent : "#c9cdd8"}" opacity="${i === 1 ? 0.9 : 1}"/>`).join("")}
    <text x="290" y="100" font-size="28" font-weight="700" fill="#1f2330">${esc(opts.title)}</text>
    <rect x="290" y="118" width="300" height="12" rx="6" fill="#b5bac8"/>
    ${[0, 1, 2].map((i) => `<rect x="${290 + i * 160}" y="160" width="145" height="90" rx="12" fill="#fff" stroke="#e3e6ee"/>
      <rect x="${306 + i * 160}" y="180" width="70" height="10" rx="5" fill="#9aa1b2"/>
      <rect x="${306 + i * 160}" y="205" width="${50 + rand() * 50}" height="22" rx="6" fill="#1f2330" opacity="0.8"/>`).join("")}
    <rect x="290" y="280" width="470" height="300" rx="14" fill="#fff" stroke="#e3e6ee"/>
    ${bars}
    <rect x="770" y="160" width="400" height="420" rx="14" fill="#fff" stroke="#e3e6ee"/>
    <rect x="790" y="182" width="160" height="14" rx="7" fill="#1f2330" opacity="0.8"/>
    <rect x="790" y="220" width="120" height="34" rx="8" fill="${accent}"/>
    ${list}
    <text x="${W - 20}" y="${H - 18}" text-anchor="end" font-size="12" fill="#9aa1b2">Mock screenshot · fictional product</text>
  </svg>`;
}
