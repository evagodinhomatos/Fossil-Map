import type {
  FossilFilterOptions,
  FossilFilters,
  FossilRecord,
  MapBounds,
  FossilSite,
} from "@/lib/types";

const ALL = "All";
export const MAX_RENDERED_FOSSILS = 2000;
const UNCATEGORIZED = "Other fossils";
const BROAD_IDENTIFICATIONS = new Set([
  "dinosauria",
  "theropoda",
  "sauropoda",
  "ornithischia",
  "ornithopoda",
  "thyreophora",
  "saurischia",
  "reptilia",
  "aves",
  "maniraptora",
  "tetanurae",
  "coelurosauria",
  "carnosauria",
  "euornithopoda",
  "ceratopsia",
  "iguanodontia",
]);

const GEOLOGIC_ORDER = [
  "triassic",
  "late triassic",
  "norian",
  "rhaetian",
  "jurassic",
  "early jurassic",
  "hettangian",
  "sinemurian",
  "pliensbachian",
  "toarcian",
  "middle jurassic",
  "aalenian",
  "bajocian",
  "bathonian",
  "callovian",
  "late jurassic",
  "oxfordian",
  "kimmeridgian",
  "tithonian",
  "cretaceous",
  "early cretaceous",
  "berriasian",
  "valanginian",
  "hauterivian",
  "barremian",
  "aptian",
  "albian",
  "late cretaceous",
  "cenomanian",
  "turonian",
  "coniacian",
  "santonian",
  "campanian",
  "maastrichtian",
  "danian",
  "paleocene",
  "eocene",
  "oligocene",
  "miocene",
  "pliocene",
  "pleistocene",
  "holocene",
];

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function findPeriodRank(label: string) {
  const normalized = label.toLowerCase();
  let bestMatch = -1;

  GEOLOGIC_ORDER.forEach((term, index) => {
    if (normalized.includes(term) && index > bestMatch) {
      bestMatch = index;
    }
  });

  return bestMatch === -1 ? GEOLOGIC_ORDER.length : bestMatch;
}

export function getTaxonomyCategory(group: string, taxonName = "") {
  const value = `${group} ${taxonName}`.toLowerCase();

  if (
    value.includes("hadrosaur") ||
    value.includes("ceratops") ||
    value.includes("iguanodont") ||
    value.includes("ornithopod") ||
    value.includes("pachycephalo") ||
    value.includes("ornithischia")
  ) {
    return "Plant-eating dinosaurs";
  }

  if (
    value.includes("ankyl") ||
    value.includes("stego") ||
    value.includes("thyreophora")
  ) {
    return "Armored dinosaurs";
  }

  if (
    value.includes("sauropod") ||
    value.includes("sauropoda") ||
    value.includes("sauropodomorpha") ||
    value.includes("diplodoc") ||
    value.includes("diplodocoid") ||
    value.includes("flagellicaudata") ||
    value.includes("macronaria") ||
    value.includes("titanosauriform") ||
    value.includes("brachiosaur") ||
    value.includes("camarasaur") ||
    value.includes("titanosaur") ||
    value.includes("eusauropod")
  ) {
    return "Long-necked dinosaurs";
  }

  if (
    value.includes("tyranno") ||
    value.includes("dromaeo") ||
    value.includes("theropod") ||
    value.includes("abelisaur") ||
    value.includes("troodont") ||
    value.includes("coelurosaur") ||
    value.includes("compsognath") ||
    value.includes("ceratosaur") ||
    value.includes("theropoda")
  ) {
    return "Meat-eating dinosaurs";
  }

  if (
    value.includes("aves") ||
    value.includes("iformes") ||
    value.includes("ornithurae") ||
    value.includes("ornithuromorph") ||
    value.includes("enantiornith") ||
    value.includes("avial")
  ) {
    return "Birds and bird relatives";
  }

  if (
    value.includes("ichn") ||
    value.includes("track") ||
    value.includes("grallator") ||
    value.includes("deltapodus") ||
    value.includes("iguanodontipod")
  ) {
    return "Tracks and trace fossils";
  }

  if (
    value.includes("reptilia") ||
    value.includes("croc") ||
    value.includes("pterosaur")
  ) {
    return "Other reptiles";
  }

  if (value.includes("dinosaur")) {
    return "Other dinosaurs";
  }

  return UNCATEGORIZED;
}

function buildTaxonomySubcategories(fossils: FossilRecord[]) {
  const taxonomy = new Map<string, Set<string>>();

  fossils.forEach((fossil) => {
    const category = getTaxonomyCategory(fossil.group, fossil.taxonName);
    if (!taxonomy.has(category)) {
      taxonomy.set(category, new Set());
    }
    taxonomy.get(category)?.add(fossil.group);
  });

  const record: Record<string, string[]> = {};
  [...taxonomy.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([category, groups]) => {
      record[category] = [ALL, ...uniqueSorted([...groups])];
    });

  record[ALL] = [ALL];
  return record;
}

function buildSearchSuggestions(fossils: FossilRecord[]) {
  const suggestions = new Set<string>();

  fossils.slice(0, 2500).forEach((fossil) => {
    suggestions.add(fossil.taxonName);
    suggestions.add(fossil.group);
    suggestions.add(fossil.period);
    if (fossil.country) suggestions.add(fossil.country);
    if (fossil.state) suggestions.add(fossil.state);
    if (fossil.county) suggestions.add(fossil.county);
  });

  return uniqueSorted([...suggestions]).slice(0, 80);
}

export function isSpecificIdentification(fossil: FossilRecord) {
  const normalizedTaxon = fossil.taxonName.trim().toLowerCase();
  const normalizedGroup = fossil.group.trim().toLowerCase();

  if (/^[A-Z][a-z]+ [a-z-]+$/u.test(fossil.taxonName)) {
    return true;
  }

  if (normalizedTaxon !== normalizedGroup && !BROAD_IDENTIFICATIONS.has(normalizedTaxon)) {
    if (
      !/(idae|inae|iformes|morpha|poda|sauria|theria|ia)$/i.test(fossil.taxonName)
    ) {
      return true;
    }
  }

  return false;
}

export function getFilterOptions(fossils: FossilRecord[]): FossilFilterOptions {
  const taxonomySubcategories = buildTaxonomySubcategories(fossils);
  const taxonomyCategories = [ALL, ...Object.keys(taxonomySubcategories)
    .filter((category) => category !== ALL)
    .sort((left, right) => left.localeCompare(right))];

  return {
    periods: [ALL, ...uniqueSorted(fossils.map((fossil) => fossil.period))],
    taxonomyCategories,
    taxonomySubcategories,
    searchSuggestions: buildSearchSuggestions(fossils),
  };
}

export function getTimelinePeriods(fossils: FossilRecord[]) {
  return [...new Set(fossils.map((fossil) => fossil.period))].sort((left, right) => {
    const rankDifference = findPeriodRank(left) - findPeriodRank(right);
    return rankDifference !== 0 ? rankDifference : left.localeCompare(right);
  });
}

export function filterFossils(
  fossils: FossilRecord[],
  filters: FossilFilters,
) {
  return fossils.filter((fossil) => {
    const matchesPeriod =
      filters.period === ALL || fossil.period === filters.period;
    const fossilCategory = getTaxonomyCategory(fossil.group, fossil.taxonName);
    const matchesCategory =
      filters.taxonomyCategory === ALL ||
      fossilCategory === filters.taxonomyCategory;
    const matchesSubcategory =
      filters.taxonomySubcategory === ALL ||
      fossil.group === filters.taxonomySubcategory;
    const matchesBirdSetting =
      filters.includeBirds ||
      getTaxonomyCategory(fossil.group, fossil.taxonName) !==
        "Birds and bird relatives";
    const matchesSpecificity =
      !filters.specificOnly || isSpecificIdentification(fossil);
    const normalizedQuery = filters.search.trim().toLowerCase();
    const matchesSearch =
      normalizedQuery.length === 0 ||
      fossil.taxonName.toLowerCase().includes(normalizedQuery) ||
      fossil.group.toLowerCase().includes(normalizedQuery) ||
      fossil.period.toLowerCase().includes(normalizedQuery) ||
      fossil.country.toLowerCase().includes(normalizedQuery) ||
      fossil.state.toLowerCase().includes(normalizedQuery) ||
      fossil.county.toLowerCase().includes(normalizedQuery) ||
      fossil.locality.toLowerCase().includes(normalizedQuery);

    return (
      matchesPeriod &&
      matchesCategory &&
      matchesSubcategory &&
      matchesBirdSetting &&
      matchesSpecificity &&
      matchesSearch
    );
  });
}

export function filterFossilsByTimeline(
  fossils: FossilRecord[],
  timelinePeriods: string[],
  timelineIndex: number,
) {
  if (timelinePeriods.length === 0) {
    return fossils;
  }

  const allowedPeriods = new Set(
    timelinePeriods.slice(0, Math.min(timelineIndex + 1, timelinePeriods.length)),
  );

  return fossils.filter((fossil) => allowedPeriods.has(fossil.period));
}

export function filterFossilsInBounds(
  fossils: FossilRecord[],
  bounds: MapBounds | null,
) {
  if (!bounds) {
    return fossils;
  }

  return fossils.filter((fossil) => {
    const inLatitude = fossil.lat >= bounds.south && fossil.lat <= bounds.north;
    const inLongitude =
      bounds.west <= bounds.east
        ? fossil.lng >= bounds.west && fossil.lng <= bounds.east
        : fossil.lng >= bounds.west || fossil.lng <= bounds.east;

    return inLatitude && inLongitude;
  });
}

export function capRenderedFossils(
  fossils: FossilRecord[],
  maxRecords = MAX_RENDERED_FOSSILS,
) {
  if (fossils.length <= maxRecords) {
    return fossils;
  }

  const step = fossils.length / maxRecords;
  return Array.from(
    { length: maxRecords },
    (_, index) => fossils[Math.floor(index * step)],
  );
}

export function groupFossilsBySite(fossils: FossilRecord[]): FossilSite[] {
  const sites = new Map<string, FossilSite>();

  for (const fossil of fossils) {
    const key = `${fossil.lat.toFixed(5)},${fossil.lng.toFixed(5)}`;
    const existing = sites.get(key);

    if (existing) {
      existing.fossils.push(fossil);
      continue;
    }

    sites.set(key, {
      id: key,
      lat: fossil.lat,
      lng: fossil.lng,
      fossils: [fossil],
    });
  }

  return [...sites.values()].sort((left, right) => right.fossils.length - left.fossils.length);
}
