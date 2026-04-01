"use client";

import type {
  FossilFilters,
  FossilFilterOptions,
  MapMode,
  ThemeMode,
} from "@/lib/types";
import styles from "@/components/filter-panel.module.css";

type FilterPanelProps = {
  total: number;
  filtered: number;
  inView: number;
  sites: number;
  options: FossilFilterOptions;
  filters: FossilFilters;
  onChange: (filters: FossilFilters) => void;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (theme: ThemeMode) => void;
  timelinePeriods: string[];
  timelineIndex: number;
  onTimelineChange: (index: number) => void;
};

export function FilterPanel({
  total,
  filtered,
  inView,
  sites,
  options,
  filters,
  onChange,
  mapMode,
  onMapModeChange,
  themeMode,
  onThemeModeChange,
  timelinePeriods,
  timelineIndex,
  onTimelineChange,
}: FilterPanelProps) {
  const taxonomySubcategories =
    options.taxonomySubcategories[filters.taxonomyCategory] ?? ["All"];

  return (
    <div className={styles.panel}>
      <div className={styles.primaryRow}>
        <label className={`${styles.field} ${styles.searchField}`}>
          <span>Search</span>
          <input
            type="search"
            list="fossil-search-suggestions"
            placeholder="Try Allosaurus, Coimbra, Maastrichtian..."
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
          />
          <datalist id="fossil-search-suggestions">
            {options.searchSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </label>

        <label className={styles.field}>
          <span>Time period</span>
          <select
            value={filters.period}
            onChange={(event) =>
              onChange({ ...filters, period: event.target.value })
            }
          >
            {options.periods.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Fossil family</span>
          <select
            value={filters.taxonomyCategory}
            onChange={(event) =>
              onChange({
                ...filters,
                taxonomyCategory: event.target.value,
                taxonomySubcategory: "All",
              })
            }
          >
            {options.taxonomyCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>More specific group</span>
          <select
            value={filters.taxonomySubcategory}
            onChange={(event) =>
              onChange({ ...filters, taxonomySubcategory: event.target.value })
            }
          >
            {taxonomySubcategories.map((subcategory) => (
              <option key={subcategory} value={subcategory}>
                {subcategory}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.secondaryRow}>
        <div className={styles.timelineBlock}>
          <div className={styles.timelineLabelRow}>
            <span className={styles.fieldLabel}>Timeline</span>
            <strong>{timelinePeriods[timelineIndex] ?? "All periods"}</strong>
          </div>
          <input
            className={styles.timelineSlider}
            type="range"
            min={0}
            max={Math.max(0, timelinePeriods.length - 1)}
            step={1}
            value={timelineIndex}
            onChange={(event) => onTimelineChange(Number(event.target.value))}
          />
        </div>

        <div className={styles.segmented}>
          <button
            type="button"
            className={mapMode === "sites" ? styles.segmentActive : styles.segment}
            onClick={() => onMapModeChange("sites")}
          >
            Site view
          </button>
          <button
            type="button"
            className={mapMode === "heatmap" ? styles.segmentActive : styles.segment}
            onClick={() => onMapModeChange("heatmap")}
          >
            Heatmap
          </button>
        </div>

        <div className={styles.segmented}>
          <button
            type="button"
            className={themeMode === "light" ? styles.segmentActive : styles.segment}
            onClick={() => onThemeModeChange("light")}
          >
            Light
          </button>
          <button
            type="button"
            className={themeMode === "dark" ? styles.segmentActive : styles.segment}
            onClick={() => onThemeModeChange("dark")}
          >
            Dark
          </button>
        </div>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={filters.includeBirds}
            onChange={(event) =>
              onChange({ ...filters, includeBirds: event.target.checked })
            }
          />
          <span>Include birds</span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={filters.specificOnly}
            onChange={(event) =>
              onChange({ ...filters, specificOnly: event.target.checked })
            }
          />
          <span>Specific identifications only</span>
        </label>

        <div className={styles.stats}>
          <div>
            <span>Filtered</span>
            <strong>{filtered}</strong>
          </div>
          <div>
            <span>On screen</span>
            <strong>{inView}</strong>
          </div>
          <div>
            <span>Sites</span>
            <strong>{sites}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{total}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
