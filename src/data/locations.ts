export interface MountainLocation {
  name: string;
  full: string;
  corridor: string;
  region: string;
  distanceKm?: number;
}

export const HIMALAYAN_LOCATIONS: MountainLocation[] = [
  {
    name: "Devprayag Sangam",
    full: "Devprayag Sangam, NH-07 (Km 71, Tehri Garhwal)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 71,
  },
  {
    name: "Devprayag Bypass Bridge",
    full: "Devprayag Bypass Bridge, NH-07 (Km 74)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 74,
  },
  {
    name: "Dharasu Bend",
    full: "Dharasu Bend, NH-108 (Uttarkashi Junction)",
    corridor: "NH-108 Gangotri Route",
    region: "Uttarkashi",
    distanceKm: 125,
  },
  {
    name: "Dehradun Mussoorie Diversion",
    full: "Dehradun - Mussoorie Diversion, Rajpur Road",
    corridor: "Mussoorie Bypass",
    region: "Dehradun",
    distanceKm: 35,
  },
  {
    name: "Dhanaulti Ridge Road",
    full: "Dhanaulti Ridge Road, Chamba-Mussoorie Highway",
    corridor: "State Highway 01",
    region: "Tehri Garhwal",
    distanceKm: 60,
  },
  {
    name: "Dhaundi Village Junction",
    full: "Dhaundi Village Junction, Pauri-Devprayag Link",
    corridor: "Pauri Link Road",
    region: "Pauri Garhwal",
    distanceKm: 88,
  },
  {
    name: "Didihat Pass",
    full: "Didihat Pass, Thal-Munsiyari Corridor",
    corridor: "Kumaon Mountain Link",
    region: "Pithoragarh",
    distanceKm: 280,
  },
  {
    name: "Dharchula Border Post",
    full: "Dharchula Border Post, Kailash Mansarovar Road",
    corridor: "Border Highway",
    region: "Pithoragarh",
    distanceKm: 340,
  },
  {
    name: "Rishikesh Base (Tapovan)",
    full: "Rishikesh Tapovan, Badrinath Marg (Km 0)",
    corridor: "NH-07 Foothill Gate",
    region: "Dehradun / Tehri",
    distanceKm: 0,
  },
  {
    name: "Byasi Valley Bend",
    full: "Byasi Valley Bend, NH-07 (Km 35)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 35,
  },
  {
    name: "Kaudiyala Rockface",
    full: "Kaudiyala Rockface, NH-07 (Km 42)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 42,
  },
  {
    name: "Srinagar Garhwal Bypass",
    full: "Srinagar Garhwal Bypass, Alaknanda Corridor (Km 105)",
    corridor: "NH-07 Badrinath Highway",
    region: "Pauri Garhwal",
    distanceKm: 105,
  },
  {
    name: "Rudraprayag Tunnel Junction",
    full: "Rudraprayag Tunnel, Kedarnath-Badrinath Bifurcation (Km 138)",
    corridor: "NH-07 / NH-107 Junction",
    region: "Rudraprayag",
    distanceKm: 138,
  },
  {
    name: "Kund Kedarnath Diversion",
    full: "Kund Kedarnath Diversion, NH-107 (Km 165)",
    corridor: "NH-107 Mandakini Route",
    region: "Rudraprayag",
    distanceKm: 165,
  },
  {
    name: "Guptkashi Hill Road",
    full: "Guptkashi Hill Road, NH-107 (Km 180)",
    corridor: "NH-107 Kedarnath Marg",
    region: "Rudraprayag",
    distanceKm: 180,
  },
  {
    name: "Sonprayag Base Camp",
    full: "Sonprayag Base Camp, Mandakini Valley (Km 210)",
    corridor: "NH-107 Kedarnath Marg",
    region: "Rudraprayag",
    distanceKm: 210,
  },
  {
    name: "Karanprayag Confluence",
    full: "Karanprayag Confluence, Pindar-Alaknanda Junction (Km 170)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 170,
  },
  {
    name: "Nandaprayag Ghat",
    full: "Nandaprayag Ghat, Alaknanda Bank (Km 190)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 190,
  },
  {
    name: "Chamoli Gopeshwar Junction",
    full: "Chamoli Market & Gopeshwar Link, NH-07 (Km 205)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 205,
  },
  {
    name: "Joshimath Transit Hub",
    full: "Joshimath Upper Transit, Badrinath-Valley Base (Km 250)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 250,
  },
  {
    name: "Govindghat Valley Entry",
    full: "Govindghat, Hemkund Sahib & Valley of Flowers Entry (Km 270)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 270,
  },
  {
    name: "Pandukeshwar Bend",
    full: "Pandukeshwar River Bend, NH-07 (Km 278)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 278,
  },
  {
    name: "Badrinath Dham Approach",
    full: "Badrinath Dham Approach Road (Km 298)",
    corridor: "NH-07 Terminus",
    region: "Chamoli",
    distanceKm: 298,
  },
  {
    name: "Mana Border Gate",
    full: "Mana Village Border Post, Last Indian Settlement",
    corridor: "NH-07 Border Road",
    region: "Chamoli",
    distanceKm: 302,
  },
  {
    name: "Uttarkashi Gangotri Marg",
    full: "Uttarkashi Gangotri Marg, NH-34 (Km 145)",
    corridor: "NH-34 Bhagirathi Route",
    region: "Uttarkashi",
    distanceKm: 145,
  },
  {
    name: "Harsil Apple Valley",
    full: "Harsil Valley Approach, NH-34 (Km 215)",
    corridor: "NH-34 Gangotri Route",
    region: "Uttarkashi",
    distanceKm: 215,
  },
  {
    name: "Nainital Bhowali Bend",
    full: "Nainital Bhowali Bend, NH-109 (Km 28)",
    corridor: "NH-109 Kumaon Highway",
    region: "Nainital",
    distanceKm: 28,
  },
  {
    name: "Almora Kausani Ridge",
    full: "Almora - Kausani Ridge Road, Kumaon Central",
    corridor: "State Highway 37",
    region: "Almora",
    distanceKm: 90,
  },
];

export function searchMountainLocations(query: string, limit = 5): MountainLocation[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return [];

  // 1. Exact prefix on location name (e.g. typing "d" or "dev" matches "Devprayag" first)
  const prefixNameMatches: MountainLocation[] = [];
  // 2. Prefix on words inside location name (e.g. typing "sangam" matches "Devprayag Sangam")
  const wordPrefixMatches: MountainLocation[] = [];
  // 3. Substring match
  const substringMatches: MountainLocation[] = [];

  for (const loc of HIMALAYAN_LOCATIONS) {
    const locNameLower = loc.name.toLowerCase();
    const locFullLower = loc.full.toLowerCase();

    if (locNameLower.startsWith(clean)) {
      prefixNameMatches.push(loc);
    } else {
      const words = locNameLower.split(/[\s-]+/);
      if (words.some((w) => w.startsWith(clean))) {
        wordPrefixMatches.push(loc);
      } else if (locFullLower.includes(clean)) {
        substringMatches.push(loc);
      }
    }
  }

  const combined = [
    ...prefixNameMatches,
    ...wordPrefixMatches,
    ...substringMatches,
  ];

  // Deduplicate and slice to limit
  const seen = new Set<string>();
  const results: MountainLocation[] = [];
  for (const item of combined) {
    if (!seen.has(item.full)) {
      seen.add(item.full);
      results.push(item);
      if (results.length >= limit) break;
    }
  }

  return results;
}
