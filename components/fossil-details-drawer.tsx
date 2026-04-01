"use client";

import { useEffect, useState } from "react";
import type { FossilRecord, FossilSite, ThemeMode } from "@/lib/types";
import { getTaxonomyCategory } from "@/lib/filter-fossils";
import styles from "@/components/fossil-details-drawer.module.css";

type FossilDetailsDrawerProps = {
  site: FossilSite | null;
  themeMode: ThemeMode;
  onClose: () => void;
};

type FossilMedia = {
  title: string | null;
  imageUrl: string | null;
  description: string | null;
  sourceUrl?: string | null;
};

function getFallbackDescription(fossil: FossilRecord) {
  const category = getTaxonomyCategory(fossil.group, fossil.taxonName);
  const place = [fossil.county, fossil.state, fossil.country].filter(Boolean).join(", ");
  const age = formatAge(fossil);

  return `${fossil.taxonName} is grouped here as ${category.toLowerCase()}. This record comes from ${place || "an unspecified locality"} and is dated to ${age}.`;
}

function scoreFeaturedFossil(fossil: FossilRecord) {
  let score = 0;

  if (/^[A-Z][a-z]+ [a-z]/.test(fossil.taxonName)) {
    score += 100;
  }

  if (!/(formes|idae|ia|inae|morpha|poda|sauria)$/i.test(fossil.taxonName)) {
    score += 25;
  }

  if (fossil.locality) {
    score += 5;
  }

  if (fossil.olderAgeMa !== null) {
    score += 5;
  }

  return score;
}

function getFeaturedFossil(site: FossilSite) {
  return site.fossils
    .slice()
    .sort((left, right) => scoreFeaturedFossil(right) - scoreFeaturedFossil(left))[0];
}

function formatAge(fossil: FossilRecord) {
  if (fossil.olderAgeMa !== null && fossil.youngerAgeMa !== null) {
    return `${fossil.olderAgeMa} to ${fossil.youngerAgeMa} million years ago`;
  }

  if (fossil.olderAgeMa !== null) {
    return `${fossil.olderAgeMa} million years ago`;
  }

  return fossil.period;
}

function roundAge(value: number) {
  return Math.round(value);
}

function formatAgeRange(fossil: FossilRecord) {
  if (fossil.olderAgeMa !== null && fossil.youngerAgeMa !== null) {
    return `~${roundAge(fossil.olderAgeMa)} - ${roundAge(fossil.youngerAgeMa)} million years ago`;
  }

  if (fossil.olderAgeMa !== null) {
    return `~${roundAge(fossil.olderAgeMa)} million years ago`;
  }

  return formatAge(fossil);
}


function FossilArtwork({
  title,
  category,
  themeMode,
}: {
  title: string;
  category: string;
  themeMode: ThemeMode;
}) {
  const isDark = themeMode === "dark";
  const background = isDark ? "#1f2328" : "#f7ecdb";
  const accent = isDark ? "#f7a261" : "#b85c38";
  const line = isDark ? "#ffcf9f" : "#6d341b";

  return (
    <svg
      viewBox="0 0 320 180"
      role="img"
      aria-label={`${title} fossil illustration`}
      className={styles.artwork}
    >
      <rect width="320" height="180" rx="24" fill={background} />
      <circle cx="252" cy="52" r="24" fill={accent} opacity="0.16" />
      <path
        d="M68 116c22-24 41-38 72-42 28-4 53 2 79 20 16 11 28 27 34 48H74c-14 0-17-12-6-26Z"
        fill={accent}
        opacity="0.22"
      />
      <path
        d="M86 108c8-22 22-37 41-46 17-9 37-12 58-9 18 2 36 10 52 23"
        fill="none"
        stroke={line}
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M116 104c-4-17 1-34 16-46m28 34 5-34m29 51 19-26m-92 39-17 19m83-15 8 16"
        fill="none"
        stroke={line}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="104" cy="105" r="9" fill={line} />
      <circle cx="140" cy="89" r="7" fill={line} />
      <circle cx="171" cy="87" r="7" fill={line} />
      <circle cx="202" cy="99" r="7" fill={line} />
      <text x="26" y="34" className={styles.artworkLabel}>
        {category}
      </text>
      <text x="26" y="156" className={styles.artworkTitle}>
        {title}
      </text>
    </svg>
  );
}

export function FossilDetailsDrawer({
  site,
  themeMode,
  onClose,
}: FossilDetailsDrawerProps) {
  const [selectedFossilId, setSelectedFossilId] = useState<string | null>(null);
  const [media, setMedia] = useState<FossilMedia | null>(null);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  useEffect(() => {
    if (!site) {
      setSelectedFossilId(null);
      return;
    }

    setSelectedFossilId(getFeaturedFossil(site).id);
  }, [site]);

  useEffect(() => {
    if (!site) {
      setMedia(null);
      setIsLoadingMedia(false);
      return;
    }

    const featured =
      site.fossils.find((fossil) => fossil.id === selectedFossilId) ??
      getFeaturedFossil(site);
    const controller = new AbortController();

    async function loadMedia() {
      setIsLoadingMedia(true);

      try {
        const response = await fetch(
          `/api/fossil-media?q=${encodeURIComponent(featured.taxonName)}`,
          {
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          setMedia(null);
          return;
        }

        const payload = (await response.json()) as FossilMedia;
        setMedia(payload);
      } catch {
        if (!controller.signal.aborted) {
          setMedia(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingMedia(false);
        }
      }
    }

    loadMedia();

    return () => controller.abort();
  }, [site, selectedFossilId]);

  if (!site) {
    return (
      <aside className={styles.drawerEmpty}>
        <div>
          <h2>Selected site</h2>
          <p>Click a fossil spot on the map to open images, taxonomy, age, and locality details.</p>
        </div>
      </aside>
    );
  }

  const featured =
    site.fossils.find((fossil) => fossil.id === selectedFossilId) ??
    getFeaturedFossil(site);
  const category = getTaxonomyCategory(featured.group, featured.taxonName);
  const place = [featured.county, featured.state, featured.country]
    .filter(Boolean)
    .join(", ");

  return (
    <aside className={styles.drawer}>
      <div className={styles.drawerHeader}>
        <div>
          <p className={styles.eyebrow}>Selected site</p>
          <h2>{featured.taxonName}</h2>
          <p className={styles.location}>
            {place || "Location not specified"}
          </p>
          <div className={styles.timeBlock}>
            <strong>Time</strong>
            <span>{featured.period}</span>
            <small>({formatAgeRange(featured)})</small>
          </div>
          <p className={styles.siteCount}>
            {site.fossils.length} fossil{site.fossils.length === 1 ? "" : "s"} at this site
          </p>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          Close
        </button>
      </div>

      <div className={styles.fossilPicker}>
        {site.fossils.map((fossil) => (
          <button
            key={fossil.id}
            type="button"
            className={
              fossil.id === featured.id ? styles.fossilChipActive : styles.fossilChip
            }
            onClick={() => setSelectedFossilId(fossil.id)}
          >
            <strong>{fossil.taxonName}</strong>
            <span>{fossil.group}</span>
          </button>
        ))}
      </div>

      {media?.imageUrl ? (
        <img
          src={media.imageUrl}
          alt={media.title ?? featured.taxonName}
          className={styles.photo}
        />
      ) : (
        <FossilArtwork
          title={featured.taxonName}
          category={category}
          themeMode={themeMode}
        />
      )}

      <div className={styles.section}>
        <h3>About this fossil</h3>
        <p>
          {media?.description ??
            (isLoadingMedia
              ? "Loading a short description and image..."
              : getFallbackDescription(featured))}
        </p>
        {media?.sourceUrl ? (
          <a
            href={media.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.sourceLink}
          >
            View source article
          </a>
        ) : null}
      </div>

      <div className={styles.metaGrid}>
        <div>
          <span>Category</span>
          <strong>{category}</strong>
        </div>
        <div>
          <span>Subcategory</span>
          <strong>{featured.group}</strong>
        </div>
      </div>

      <div className={styles.section}>
        <h3>Site details</h3>
        <p>{featured.locality || "No locality notes were provided for this record."}</p>
        <ul className={styles.detailList}>
          <li>Coordinates: {site.lat.toFixed(3)}, {site.lng.toFixed(3)}</li>
          <li>Collection no.: {featured.collectionNo || "Unavailable"}</li>
          <li>Reference no.: {featured.referenceNo || "Unavailable"}</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3>More fossils at this site</h3>
        <div className={styles.recordList}>
          {site.fossils
            .filter((fossil) => fossil.id !== featured.id)
            .slice(0, 16)
            .map((fossil) => (
            <article key={fossil.id} className={styles.recordCard}>
              <strong>{fossil.taxonName}</strong>
              <span>{getTaxonomyCategory(fossil.group, fossil.taxonName)} / {fossil.group}</span>
              <span>{formatAge(fossil)}</span>
            </article>
          ))}
          {site.fossils.length === 1 ? (
            <p className={styles.moreText}>This site currently has one visible fossil record.</p>
          ) : null}
          {site.fossils.length > 17 ? (
            <p className={styles.moreText}>
              And {site.fossils.length - 17} more records at this coordinate.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
