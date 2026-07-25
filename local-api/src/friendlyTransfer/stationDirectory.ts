export interface StationDirectoryEntry {
  station: string;
  aliases: readonly string[];
  phone: string;
}

export interface StationMatch {
  station: string;
  phone: string;
  confirmation: string;
}

const stationDirectory: readonly StationDirectoryEntry[] = [
  {
    station: '\u81fa\u5317\u8eca\u7ad9',
    aliases: ['\u81fa\u5317', '\u53f0\u5317', '\u81fa\u5317\u8eca\u7ad9', '\u53f0\u5317\u8eca\u7ad9'],
    phone: '02-2371-3558'
  },
  {
    station: '\u677f\u6a4b\u8eca\u7ad9',
    aliases: ['\u677f\u6a4b', '\u677f\u6a4b\u8eca\u7ad9'],
    phone: '02-8969-1036'
  },
  {
    station: '\u677e\u5c71\u8eca\u7ad9',
    aliases: ['\u677e\u5c71', '\u677e\u5c71\u8eca\u7ad9'],
    phone: '02-2767-3819'
  },
  {
    station: '\u6843\u5712\u8eca\u7ad9',
    aliases: ['\u6843\u5712', '\u6843\u5712\u8eca\u7ad9'],
    phone: '03-376-7050'
  }
];

export function resolveStation(spokenStation: string): StationMatch | null {
  const normalized = normalize(spokenStation);
  if (!normalized) return null;

  const entry = stationDirectory.find((candidate) =>
    candidate.aliases.some((alias) => normalized.includes(normalize(alias)))
  );
  if (!entry) return null;

  return {
    station: entry.station,
    phone: entry.phone,
    confirmation: `\u5df2\u8fa8\u8b58\u70ba${entry.station}\u3002\u662f\u5426\u64a5\u6253\u7ad9\u52d9\u4eba\u54e1\u96fb\u8a71\uff1f`
  };
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, '').replace(/\u81fa/g, '\u53f0');
}
