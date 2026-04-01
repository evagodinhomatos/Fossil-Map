export type FossilRecord = {
  id: string;
  taxonName: string;
  lat: number;
  lng: number;
  period: string;
  group: string;
  collectionNo: string;
  referenceNo: string;
  discoveryDate: string;
  country: string;
  state: string;
  county: string;
  locality: string;
  olderAgeMa: number | null;
  youngerAgeMa: number | null;
};

export type FossilFilters = {
  period: string;
  search: string;
  taxonomyCategory: string;
  taxonomySubcategory: string;
  includeBirds: boolean;
  specificOnly: boolean;
};

export type FossilFilterOptions = {
  periods: string[];
  taxonomyCategories: string[];
  taxonomySubcategories: Record<string, string[]>;
  searchSuggestions: string[];
};

export type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type FossilSite = {
  id: string;
  lat: number;
  lng: number;
  fossils: FossilRecord[];
};

export type MapMode = "sites" | "heatmap";

export type ThemeMode = "light" | "dark";
