import { NextRequest, NextResponse } from "next/server";

type WikimediaSearchPage = {
  title: string;
  key: string;
  excerpt?: string;
  description?: string | null;
  thumbnail?: {
    url?: string;
  } | null;
};

type WikimediaSummary = {
  title?: string;
  extract?: string;
  description?: string | null;
  thumbnail?: {
    source?: string;
    url?: string;
  } | null;
  originalimage?: {
    source?: string;
    url?: string;
  } | null;
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
};

type CommonsImageInfo = {
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
};

type CommonsSearchPage = {
  title?: string;
  imageinfo?: CommonsImageInfo[];
};

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeTaxon(value: string) {
  return value.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

function getGenus(value: string) {
  return normalizeTaxon(value).split(" ")[0] ?? "";
}

const PALEO_KEYWORDS = [
  "dinosaur",
  "fossil",
  "theropod",
  "sauropod",
  "ornithischian",
  "reptile",
  "bird",
  "genus",
  "clade",
  "species",
  "prehistoric",
  "cretaceous",
  "jurassic",
  "triassic",
];

const BAD_MATCH_KEYWORDS = [
  "park",
  "museum",
  "hotel",
  "restaurant",
  "album",
  "song",
  "film",
  "tv series",
  "video game",
  "theme park",
  "roller coaster",
];

const IMAGE_PREFERRED_KEYWORDS = [
  "restoration",
  "life restoration",
  "reconstruction",
  "skeletal",
  "skeleton",
  "mount",
  "model",
  "art",
];

const IMAGE_BAD_KEYWORDS = [
  "tooth",
  "vertebra",
  "vertebrae",
  "femur",
  "bone",
  "jaw",
  "dentary",
  "fragment",
  "track",
  "footprint",
  "ichnite",
  "coprolite",
];

function scoreCandidate(page: WikimediaSearchPage, query: string) {
  const normalizedTitle = page.title.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const normalizedTaxon = normalizeTaxon(query);
  const normalizedPageTaxon = normalizeTaxon(page.title);
  let score = 0;

  if (normalizedPageTaxon === normalizedTaxon) {
    score += 100;
  }

  if (normalizedPageTaxon.startsWith(normalizedTaxon)) {
    score += 25;
  }

  if (normalizedPageTaxon.includes(normalizedTaxon)) {
    score += 10;
  }

  if (getGenus(page.title) === getGenus(query)) {
    score += 18;
  } else {
    score -= 30;
  }

  if (normalizedTitle.includes("disambiguation")) {
    score -= 50;
  }

  if (page.thumbnail?.url) {
    score += 8;
  }

  return score;
}

function scoreSummary(summary: WikimediaSummary | null, title: string, query: string) {
  const haystack = `${title} ${summary?.description ?? ""} ${summary?.extract ?? ""}`.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  const normalizedTaxon = normalizeTaxon(query);
  const haystackTaxon = normalizeTaxon(`${title} ${summary?.extract ?? ""}`);
  let score = 0;

  if (haystackTaxon.includes(normalizedTaxon)) {
    score += 20;
  }

  if (getGenus(title) === getGenus(query)) {
    score += 20;
  } else {
    score -= 40;
  }

  if (PALEO_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    score += 40;
  }

  if (BAD_MATCH_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    score -= 120;
  }

  if (summary?.originalimage?.source || summary?.thumbnail?.source) {
    score += 10;
  }

  return score;
}

async function searchCommonsImage(query: string) {
  const searchQueries = [
    `${query} restoration`,
    `${query} skeletal`,
    `${query} skeleton`,
    `${query} mount`,
    `${query} reconstruction`,
  ];

  const candidates: Array<{
    title: string;
    imageUrl: string | null;
    sourceUrl: string | null;
    score: number;
  }> = [];

  for (const searchQuery of searchQueries) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.searchParams.set("action", "query");
    url.searchParams.set("format", "json");
    url.searchParams.set("generator", "search");
    url.searchParams.set("gsrnamespace", "6");
    url.searchParams.set("gsrlimit", "5");
    url.searchParams.set("gsrsearch", searchQuery);
    url.searchParams.set("prop", "imageinfo");
    url.searchParams.set("iiprop", "url");
    url.searchParams.set("iiurlwidth", "1200");
    url.searchParams.set("origin", "*");

    const response = await fetch(url, {
      headers: {
        "User-Agent": "FossilMapExplorer/1.0 (educational demo)",
      },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as {
      query?: { pages?: Record<string, CommonsSearchPage> };
    };

    const pages = Object.values(payload.query?.pages ?? {});

    for (const page of pages) {
      const title = page.title ?? "";
      const normalizedTitle = title.toLowerCase();
      const genusMatches = getGenus(title) === getGenus(query);
      let score = genusMatches ? 60 : 10;

      if (normalizeTaxon(title).includes(normalizeTaxon(query))) {
        score += 30;
      }

      if (IMAGE_PREFERRED_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword))) {
        score += 35;
      }

      if (IMAGE_BAD_KEYWORDS.some((keyword) => normalizedTitle.includes(keyword))) {
        score -= 60;
      }

      const imageInfo = page.imageinfo?.[0];

      candidates.push({
        title,
        imageUrl: imageInfo?.thumburl ?? imageInfo?.url ?? null,
        sourceUrl: imageInfo?.descriptionurl ?? null,
        score,
      });
    }
  }

  const best = candidates.sort((left, right) => right.score - left.score)[0];
  return best && best.score >= 65 ? best : null;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ imageUrl: null, description: null, title: null });
  }

  try {
    const searchQueries = [query, `${query} dinosaur`];
    const candidates: Array<{
      page: WikimediaSearchPage;
      summary: WikimediaSummary | null;
      totalScore: number;
    }> = [];

    for (const searchQuery of searchQueries) {
      const url = new URL("https://en.wikipedia.org/w/rest.php/v1/search/page");
      url.searchParams.set("q", searchQuery);
      url.searchParams.set("limit", "5");

      const response = await fetch(url, {
        headers: {
          "User-Agent": "FossilMapExplorer/1.0 (educational demo)",
        },
        next: { revalidate: 86400 },
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as { pages?: WikimediaSearchPage[] };
      const pages = payload.pages
        ?.slice()
        .sort(
          (left, right) => scoreCandidate(right, query) - scoreCandidate(left, query),
        ) ?? [];

      for (const page of pages) {
        const summaryResponse = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page.title)}`,
          {
            headers: {
              "User-Agent": "FossilMapExplorer/1.0 (educational demo)",
            },
            next: { revalidate: 86400 },
          },
        );

        const summary = summaryResponse.ok
          ? ((await summaryResponse.json()) as WikimediaSummary)
          : null;

        const totalScore =
          scoreCandidate(page, query) + scoreSummary(summary, page.title, query);

        candidates.push({ page, summary, totalScore });
      }
    }

    const best = candidates.sort((left, right) => right.totalScore - left.totalScore)[0];

    if (!best || best.totalScore < 25) {
      return NextResponse.json({ imageUrl: null, description: null, title: null });
    }

    const commonsImage = await searchCommonsImage(query);

    const description =
      best.summary?.extract ??
      (best.page.excerpt ? stripHtml(best.page.excerpt) : null) ??
      best.summary?.description ??
      best.page.description ??
      null;

    return NextResponse.json({
      title: best.summary?.title ?? best.page.title ?? null,
      imageUrl:
        commonsImage?.imageUrl ??
        best.summary?.originalimage?.source ??
        best.summary?.originalimage?.url ??
        best.summary?.thumbnail?.source ??
        best.summary?.thumbnail?.url ??
        best.page.thumbnail?.url ??
        null,
      description,
      sourceUrl:
        commonsImage?.sourceUrl ??
        best.summary?.content_urls?.desktop?.page ??
        (best.page.key
          ? `https://en.wikipedia.org/wiki/${encodeURIComponent(best.page.key)}`
          : null),
    });
  } catch {
    return NextResponse.json({ imageUrl: null, description: null, title: null });
  }
}
