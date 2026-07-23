// Country flag URL fallback for team logos.
// Used when api-football is unavailable or returns blank logos so the UI
// still renders a recognizable crest next to the team name.

const TEAM_FLAG_CODES: Record<string, string> = {
  "Mexico": "mx", "South Africa": "za", "South Korea": "kr", "Czechia": "cz",
  "Canada": "ca", "Bosnia & Herzegovina": "ba", "Bosnia and Herzegovina": "ba", "USA": "us", "Paraguay": "py",
  "Qatar": "qa", "Switzerland": "ch", "Brazil": "br", "Morocco": "ma",
  "Haiti": "ht", "Scotland": "gb-sct", "Australia": "au", "Türkiye": "tr",
  "Germany": "de", "Curaçao": "cw", "Netherlands": "nl", "Japan": "jp",
  "Ivory Coast": "ci", "Côte d'Ivoire": "ci", "Côte d’Ivoire": "ci", "Ecuador": "ec", "Sweden": "se", "Tunisia": "tn",
  "Spain": "es", "Cape Verde Islands": "cv", "Cabo Verde": "cv", "Belgium": "be", "Egypt": "eg",
  "Saudi Arabia": "sa", "Uruguay": "uy", "Iran": "ir", "New Zealand": "nz",
  "France": "fr", "Senegal": "sn", "Iraq": "iq", "Norway": "no",
  "Argentina": "ar", "Algeria": "dz", "Austria": "at", "Jordan": "jo",
  "Portugal": "pt", "Congo DR": "cd", "England": "gb-eng", "Croatia": "hr",
  "Ghana": "gh", "Panama": "pa", "Uzbekistan": "uz", "Colombia": "co",
};

export function getTeamFlagUrl(team: string): string {
  const code = TEAM_FLAG_CODES[team];
  if (code) return `https://flagcdn.com/w80/${code}.png`;
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(team || "TBD")}&backgroundType=gradientLinear&backgroundColor=991b1b,1e1e5a&fontWeight=700`;
}
