"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type {
  FossilRecord,
  FossilFilters,
  FossilSite,
  MapBounds,
  MapMode,
  ThemeMode,
} from "@/lib/types";
import {
  filterFossils,
  filterFossilsByTimeline,
  filterFossilsInBounds,
  groupFossilsBySite,
  getFilterOptions,
  getTimelinePeriods,
} from "@/lib/filter-fossils";
import { FilterPanel } from "@/components/filter-panel";
import { FossilDetailsDrawer } from "@/components/fossil-details-drawer";
import styles from "@/components/fossil-explorer.module.css";

const FossilMap = dynamic(
  () => import("@/components/fossil-map").then((module) => module.FossilMap),
  {
    ssr: false,
    loading: () => <div className={styles.mapLoading}>Loading map...</div>,
  },
);

const defaultFilters: FossilFilters = {
  period: "All",
  search: "",
  taxonomyCategory: "All",
  taxonomySubcategory: "All",
  includeBirds: false,
  specificOnly: false,
};

type FossilExplorerProps = {
  fossils: FossilRecord[];
};

export function FossilExplorer({ fossils }: FossilExplorerProps) {
  const [filters, setFilters] = useState<FossilFilters>(defaultFilters);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedSite, setSelectedSite] = useState<FossilSite | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("sites");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const options = useMemo(() => getFilterOptions(fossils), [fossils]);
  const timelinePeriods = useMemo(() => getTimelinePeriods(fossils), [fossils]);
  const [timelineIndex, setTimelineIndex] = useState(
    Math.max(0, timelinePeriods.length - 1),
  );
  const filteredFossils = useMemo(
    () => filterFossils(fossils, filters),
    [fossils, filters],
  );
  const timelineFossils = useMemo(
    () => filterFossilsByTimeline(filteredFossils, timelinePeriods, timelineIndex),
    [filteredFossils, timelinePeriods, timelineIndex],
  );
  const fossilsInView = useMemo(
    () => filterFossilsInBounds(timelineFossils, bounds),
    [timelineFossils, bounds],
  );
  const visibleSites = useMemo(
    () => groupFossilsBySite(fossilsInView),
    [fossilsInView],
  );

  useEffect(() => {
    setTimelineIndex(Math.max(0, timelinePeriods.length - 1));
  }, [timelinePeriods.length]);

  useEffect(() => {
    document.body.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    if (
      filters.taxonomyCategory !== "All" &&
      !options.taxonomyCategories.includes(filters.taxonomyCategory)
    ) {
      setFilters((current) => ({
        ...current,
        taxonomyCategory: "All",
        taxonomySubcategory: "All",
      }));
    }
  }, [filters.taxonomyCategory, options.taxonomyCategories]);

  useEffect(() => {
    const allowedSubcategories =
      options.taxonomySubcategories[filters.taxonomyCategory] ?? ["All"];

    if (!allowedSubcategories.includes(filters.taxonomySubcategory)) {
      setFilters((current) => ({
        ...current,
        taxonomySubcategory: "All",
      }));
    }
  }, [
    filters.taxonomyCategory,
    filters.taxonomySubcategory,
    options.taxonomySubcategories,
  ]);

  useEffect(() => {
    if (!selectedSite) {
      return;
    }

    const updatedSelection =
      visibleSites.find((site) => site.id === selectedSite.id) ?? null;
    setSelectedSite(updatedSelection);
  }, [visibleSites, selectedSite]);

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroTopline}>
          <span className={styles.heroBadge}>Fossil Map Explorer</span>
          <p className={styles.summary}>
            Search places, filter time, and inspect fossil sites.
          </p>
        </div>
      </section>

      <section className={styles.controlsRow}>
        <FilterPanel
          total={fossils.length}
          filtered={timelineFossils.length}
          inView={fossilsInView.length}
          sites={visibleSites.length}
          options={options}
          filters={filters}
          onChange={setFilters}
          mapMode={mapMode}
          onMapModeChange={setMapMode}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          timelinePeriods={timelinePeriods}
          timelineIndex={timelineIndex}
          onTimelineChange={setTimelineIndex}
        />
      </section>

      <section className={styles.layout}>
        <div className={styles.mapCard}>
          <FossilMap
            sites={visibleSites}
            allFilteredFossils={timelineFossils}
            onBoundsChange={setBounds}
            onSiteSelect={setSelectedSite}
            mapMode={mapMode}
            themeMode={themeMode}
          />
        </div>
        <FossilDetailsDrawer
          site={selectedSite}
          themeMode={themeMode}
          onClose={() => setSelectedSite(null)}
        />
      </section>
    </main>
  );
}
