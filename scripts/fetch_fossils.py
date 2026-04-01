#!/usr/bin/env python3

import json
import pathlib
import re
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterable, List, Optional

API_URL = "https://paleobiodb.org/data1.2/occs/list.json"
OUTPUT_PATH = pathlib.Path(__file__).resolve().parents[1] / "data" / "fossils.json"

QUERY_PARAMS = {
    "base_name": "Dinosauria",
    "show": "coords,class,time,loc",
    "limit": "all",
    "vocab": "pbdb",
}

COUNTRY_NAMES = {
    "PT": "Portugal",
    "UK": "United Kingdom",
    "US": "United States",
    "CN": "China",
    "ES": "Spain",
    "FR": "France",
    "DE": "Germany",
    "AR": "Argentina",
    "BR": "Brazil",
    "CA": "Canada",
    "AU": "Australia",
    "MN": "Mongolia",
    "MA": "Morocco",
    "ZA": "South Africa",
}


def pick_first(record: Dict[str, Any], keys: Iterable[str], default: str = "") -> str:
    for key in keys:
        value = record.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return default


def parse_float(value: Any) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def normalize_period(record: Dict[str, Any]) -> str:
    early_interval = pick_first(
        record,
        ["early_interval", "max_interval", "early_age", "eag", "oei", "oli"],
    )
    late_interval = pick_first(
        record,
        ["late_interval", "min_interval", "late_age", "lag", "oli", "yli"],
    )

    if early_interval and late_interval and early_interval != late_interval:
        return f"{early_interval} to {late_interval}"
    if early_interval:
        return early_interval
    if late_interval:
        return late_interval
    return "Unknown"


def normalize_age(record: Dict[str, Any]) -> Dict[str, Optional[float]]:
    older_age = parse_float(record.get("max_ma"))
    younger_age = parse_float(record.get("min_ma"))

    return {
        "olderAgeMa": round(older_age, 2) if older_age is not None else None,
        "youngerAgeMa": round(younger_age, 2) if younger_age is not None else None,
    }


def normalize_group(record: Dict[str, Any]) -> str:
    candidates = [
        pick_first(record, ["suborder", "rnk7"]),
        pick_first(record, ["infraorder", "rnk8"]),
        pick_first(record, ["order", "rnk6"]),
        pick_first(record, ["family", "rnk12"]),
        pick_first(record, ["class", "rnk5"]),
    ]

    for candidate in candidates:
        normalized = candidate.strip()
        if (
            normalized
            and normalized.lower() != "dinosauria"
            and not normalized.startswith("NO_")
        ):
            return candidate

    family_name = pick_first(record, ["family", "fmn"])
    if family_name:
        return family_name

    return "Dinosauria"


def normalize_taxon_name(record: Dict[str, Any]) -> str:
    raw_name = pick_first(
        record,
        ["accepted_name", "tna", "taxon_name", "idn", "identified_name", "genus", "oid"],
        default="Unknown taxon",
    )
    return re.sub(r"\s+", " ", raw_name)


def normalize_location(record: Dict[str, Any]) -> Dict[str, str]:
    country_code = pick_first(record, ["cc"])
    country = COUNTRY_NAMES.get(country_code, country_code)
    state = pick_first(record, ["state"])
    county = pick_first(record, ["county"])
    locality = pick_first(record, ["geogcomments"])

    return {
        "country": country,
        "state": state,
        "county": county,
        "locality": locality,
    }


def normalize_record(record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    lat = parse_float(record.get("lat"))
    lng = parse_float(record.get("lng"))

    if lat is None or lng is None:
        return None

    fossil_id = pick_first(record, ["occurrence_no", "oid", "oidstr"])
    if not fossil_id:
        fossil_id = f"{normalize_taxon_name(record)}-{lat:.4f}-{lng:.4f}"

    location = normalize_location(record)
    ages = normalize_age(record)

    return {
        "id": fossil_id,
        "taxonName": normalize_taxon_name(record),
        "lat": round(lat, 5),
        "lng": round(lng, 5),
        "period": normalize_period(record),
        "group": normalize_group(record),
        "collectionNo": pick_first(record, ["collection_no"]),
        "referenceNo": pick_first(record, ["reference_no"]),
        "discoveryDate": "",
        **location,
        **ages,
    }


def fetch_occurrences() -> List[Dict[str, Any]]:
    url = f"{API_URL}?{urllib.parse.urlencode(QUERY_PARAMS)}"
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "FossilMapExplorer/1.0 (+local dataset build)"
        },
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        payload = json.load(response)

    records = payload.get("records", [])
    cleaned = [normalize_record(record) for record in records]
    return [record for record in cleaned if record is not None]


def write_dataset(records: List[Dict[str, Any]]) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(records, handle, indent=2)
        handle.write("\n")


def main() -> None:
    records = fetch_occurrences()
    write_dataset(records)
    print(f"Wrote {len(records)} cleaned fossil records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
