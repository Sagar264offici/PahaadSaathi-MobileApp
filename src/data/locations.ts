export interface MountainLocation {
  name: string;
  full: string;
  corridor: string;
  region: string;
  distanceKm?: number;
  latitude: number;
  longitude: number;
}

export const HIMALAYAN_LOCATIONS: MountainLocation[] = [
  {
    name: "Devprayag Sangam",
    full: "Devprayag Sangam, NH-07 (Km 71, Tehri Garhwal)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 71,
    latitude: 30.1459,
    longitude: 78.5996,
  },
  {
    name: "Devprayag Bypass Bridge",
    full: "Devprayag Bypass Bridge, NH-07 (Km 74)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 74,
    latitude: 30.1550,
    longitude: 78.6120,
  },
  {
    name: "Dharasu Bend",
    full: "Dharasu Bend, NH-108 (Uttarkashi Junction)",
    corridor: "NH-108 Gangotri Route",
    region: "Uttarkashi",
    distanceKm: 125,
    latitude: 30.6272,
    longitude: 78.3189,
  },
  {
    name: "Dehradun Mussoorie Diversion",
    full: "Dehradun - Mussoorie Diversion, Rajpur Road",
    corridor: "Mussoorie Bypass",
    region: "Dehradun",
    distanceKm: 35,
    latitude: 30.3650,
    longitude: 78.0750,
  },
  {
    name: "Dhanaulti Ridge Road",
    full: "Dhanaulti Ridge Road, Chamba-Mussoorie Highway",
    corridor: "State Highway 01",
    region: "Tehri Garhwal",
    distanceKm: 60,
    latitude: 30.4062,
    longitude: 78.2312,
  },
  {
    name: "Dhaundi Village Junction",
    full: "Dhaundi Village Junction, Pauri-Devprayag Link",
    corridor: "Pauri Link Road",
    region: "Pauri Garhwal",
    distanceKm: 88,
    latitude: 30.1320,
    longitude: 78.6850,
  },
  {
    name: "Didihat Pass",
    full: "Didihat Pass, Thal-Munsiyari Corridor",
    corridor: "Kumaon Mountain Link",
    region: "Pithoragarh",
    distanceKm: 280,
    latitude: 29.8000,
    longitude: 80.2500,
  },
  {
    name: "Dharchula Border Post",
    full: "Dharchula Border Post, Kailash Mansarovar Road",
    corridor: "Border Highway",
    region: "Pithoragarh",
    distanceKm: 340,
    latitude: 29.8522,
    longitude: 80.5414,
  },
  {
    name: "Rishikesh Base (Tapovan)",
    full: "Rishikesh Tapovan, Badrinath Marg (Km 0)",
    corridor: "NH-07 Foothill Gate",
    region: "Dehradun / Tehri",
    distanceKm: 0,
    latitude: 30.1332,
    longitude: 78.3248,
  },
  {
    name: "Haridwar Junction",
    full: "Haridwar Gateway, NH-334",
    corridor: "Char Dham Foothill Portal",
    region: "Haridwar",
    distanceKm: -25,
    latitude: 29.9457,
    longitude: 78.1642,
  },
  {
    name: "Byasi Valley Bend",
    full: "Byasi Valley Bend, NH-07 (Km 35)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 35,
    latitude: 30.0980,
    longitude: 78.5080,
  },
  {
    name: "Kaudiyala Rockface",
    full: "Kaudiyala Rockface, NH-07 (Km 42)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 42,
    latitude: 30.0760,
    longitude: 78.5020,
  },
  {
    name: "Shivpuri River Camp",
    full: "Shivpuri, NH-07 (Km 16)",
    corridor: "NH-07 Badrinath Highway",
    region: "Tehri Garhwal",
    distanceKm: 16,
    latitude: 30.1360,
    longitude: 78.3890,
  },
  {
    name: "Srinagar Garhwal Bypass",
    full: "Srinagar Garhwal Bypass, Alaknanda Corridor (Km 105)",
    corridor: "NH-07 Badrinath Highway",
    region: "Pauri Garhwal",
    distanceKm: 105,
    latitude: 30.2227,
    longitude: 78.7844,
  },
  {
    name: "Rudraprayag Tunnel Junction",
    full: "Rudraprayag Tunnel, Kedarnath-Badrinath Bifurcation (Km 138)",
    corridor: "NH-07 / NH-107 Junction",
    region: "Rudraprayag",
    distanceKm: 138,
    latitude: 30.2844,
    longitude: 78.9811,
  },
  {
    name: "Kund Kedarnath Diversion",
    full: "Kund Kedarnath Diversion, NH-107 (Km 165)",
    corridor: "NH-107 Mandakini Route",
    region: "Rudraprayag",
    distanceKm: 165,
    latitude: 30.5050,
    longitude: 79.0550,
  },
  {
    name: "Guptkashi Hill Road",
    full: "Guptkashi Hill Road, NH-107 (Km 180)",
    corridor: "NH-107 Kedarnath Marg",
    region: "Rudraprayag",
    distanceKm: 180,
    latitude: 30.5228,
    longitude: 79.0772,
  },
  {
    name: "Phata Helipad",
    full: "Phata Kedarnath Aviation Base, NH-107",
    corridor: "NH-107 Mandakini Route",
    region: "Rudraprayag",
    distanceKm: 195,
    latitude: 30.5739,
    longitude: 79.0381,
  },
  {
    name: "Sonprayag Base Camp",
    full: "Sonprayag Base Camp, Mandakini Valley (Km 210)",
    corridor: "NH-107 Kedarnath Marg",
    region: "Rudraprayag",
    distanceKm: 210,
    latitude: 30.6300,
    longitude: 78.9983,
  },
  {
    name: "Gaurikund Trek Base",
    full: "Gaurikund Terminus, Kedarnath Trek Start",
    corridor: "Kedarnath Pilgrimage Trail",
    region: "Rudraprayag",
    distanceKm: 215,
    latitude: 30.6517,
    longitude: 79.0278,
  },
  {
    name: "Kedarnath Dham",
    full: "Kedarnath Temple Sanctuary, Mandakini Origin",
    corridor: "Kedarnath Dham",
    region: "Rudraprayag",
    distanceKm: 231,
    latitude: 30.7352,
    longitude: 79.0669,
  },
  {
    name: "Karanprayag Confluence",
    full: "Karanprayag Confluence, Pindar-Alaknanda Junction (Km 170)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 170,
    latitude: 30.2588,
    longitude: 79.2157,
  },
  {
    name: "Nandaprayag Ghat",
    full: "Nandaprayag Ghat, Alaknanda Bank (Km 190)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 190,
    latitude: 30.3300,
    longitude: 79.3242,
  },
  {
    name: "Chamoli Gopeshwar Junction",
    full: "Chamoli Market & Gopeshwar Link, NH-07 (Km 205)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 205,
    latitude: 30.4133,
    longitude: 79.3247,
  },
  {
    name: "Pipalkoti Transit Point",
    full: "Pipalkoti Valley Staging, NH-07 (Km 220)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 220,
    latitude: 30.4297,
    longitude: 79.4316,
  },
  {
    name: "Helang Boulder Zone",
    full: "Helang Pass, Urgam Valley Link, NH-07 (Km 240)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 240,
    latitude: 30.5283,
    longitude: 79.5147,
  },
  {
    name: "Joshimath Transit Hub",
    full: "Joshimath Upper Transit, Badrinath-Valley Base (Km 250)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 250,
    latitude: 30.5564,
    longitude: 79.5638,
  },
  {
    name: "Auli Ropeway Base",
    full: "Auli Ski Meadows Road, Joshimath",
    corridor: "Auli Mountain Link",
    region: "Chamoli",
    distanceKm: 262,
    latitude: 30.5310,
    longitude: 79.5700,
  },
  {
    name: "Govindghat Valley Entry",
    full: "Govindghat, Hemkund Sahib & Valley of Flowers Entry (Km 270)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 270,
    latitude: 30.6247,
    longitude: 79.5936,
  },
  {
    name: "Pandukeshwar Bend",
    full: "Pandukeshwar River Bend, NH-07 (Km 278)",
    corridor: "NH-07 Badrinath Highway",
    region: "Chamoli",
    distanceKm: 278,
    latitude: 30.6720,
    longitude: 79.5680,
  },
  {
    name: "Badrinath Dham Approach",
    full: "Badrinath Dham Approach Road (Km 298)",
    corridor: "NH-07 Terminus",
    region: "Chamoli",
    distanceKm: 298,
    latitude: 30.7433,
    longitude: 79.4938,
  },
  {
    name: "Mana Border Gate",
    full: "Mana Village Border Post, Last Indian Settlement",
    corridor: "NH-07 Border Road",
    region: "Chamoli",
    distanceKm: 302,
    latitude: 30.7675,
    longitude: 79.4975,
  },
  {
    name: "Uttarkashi Gangotri Marg",
    full: "Uttarkashi Gangotri Marg, NH-34 (Km 145)",
    corridor: "NH-34 Bhagirathi Route",
    region: "Uttarkashi",
    distanceKm: 145,
    latitude: 30.7268,
    longitude: 78.4354,
  },
  {
    name: "Barkot Junction",
    full: "Barkot Yamunotri Junction, NH-123 / NH-94",
    corridor: "Yamunotri Corridor",
    region: "Uttarkashi",
    distanceKm: 110,
    latitude: 30.8108,
    longitude: 78.2081,
  },
  {
    name: "Yamunotri Dham",
    full: "Yamunotri Temple & Janki Chatti Base",
    corridor: "Yamunotri Highway",
    region: "Uttarkashi",
    distanceKm: 155,
    latitude: 31.0142,
    longitude: 78.4600,
  },
  {
    name: "Harsil Apple Valley",
    full: "Harsil Valley Approach, NH-34 (Km 215)",
    corridor: "NH-34 Gangotri Route",
    region: "Uttarkashi",
    distanceKm: 215,
    latitude: 31.0375,
    longitude: 78.7364,
  },
  {
    name: "Gangotri Dham",
    full: "Gangotri Temple Sanctuary, Bhagirathi Gorge",
    corridor: "NH-34 Gangotri Terminus",
    region: "Uttarkashi",
    distanceKm: 240,
    latitude: 30.9947,
    longitude: 78.9398,
  },
  {
    name: "Nainital Bhowali Bend",
    full: "Nainital Bhowali Bend, NH-109 (Km 28)",
    corridor: "NH-109 Kumaon Highway",
    region: "Nainital",
    distanceKm: 28,
    latitude: 29.3919,
    longitude: 79.4542,
  },
  {
    name: "Almora Kausani Ridge",
    full: "Almora - Kausani Ridge Road, Kumaon Central",
    corridor: "State Highway 37",
    region: "Almora",
    distanceKm: 90,
    latitude: 29.5971,
    longitude: 79.6591,
  },
  {
    name: "Kausani Panorama Point",
    full: "Kausani Trishul Viewpoint, Baijnath Road",
    corridor: "Kumaon Scenic Route",
    region: "Bageshwar",
    distanceKm: 120,
    latitude: 29.8450,
    longitude: 79.6010,
  },
  {
    name: "Chopta Meadows",
    full: "Chopta Tungnath Base (Mini Switzerland of Uttarakhand)",
    corridor: "Gopeshwar-Ukhimath Road",
    region: "Rudraprayag / Chamoli",
    distanceKm: 195,
    latitude: 30.4858,
    longitude: 79.1764,
  },
  {
    name: "Ukhimath Winter Seat",
    full: "Ukhimath Omkareshwar Temple, Kedarnath Winter Seat",
    corridor: "Kedarnath Bypass Road",
    region: "Rudraprayag",
    distanceKm: 172,
    latitude: 30.5147,
    longitude: 79.0967,
  },
];

export function searchMountainLocations(query: string, limit = 8): MountainLocation[] {
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
    if (!seen.has(item.name)) {
      seen.add(item.name);
      results.push(item);
      if (results.length >= limit) break;
    }
  }

  return results;
}
