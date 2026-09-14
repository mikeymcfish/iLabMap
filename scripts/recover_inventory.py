"""Reconstruct candidates from historical evidence; never connect to a database.
All candidates are retained. Repeated submissions at the same name/map/location
are consolidated; samples and obvious test entries remain archived, not discarded.
"""

import ast
import csv
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEST_NAMES = {
    "sdfsdfsd",
    "nothing",
    "nothing 2",
    "rthrfth",
    "eyes",
    "ghjhgjgh",
    "fghfdgh",
    "thing",
    "fghdfghfgdh",
    "sdfsdfsdf",
    "sdf",
    "sdfsdf",
    "asdasd",
    "reee",
    "new",
    "new4",
    "dssfsfsd",
    "ss",
    "ff",
    "werwerwe",
}
FIELDS = (
    "name",
    "tags",
    "map_id",
    "x_coord",
    "y_coord",
    "x_coord_model",
    "y_coord_model",
    "z_coord_model",
    "color",
    "zone",
    "quantity",
    "warning",
    "description",
    "link",
)


def number(value, integer=False):
    try:
        result = float(value)
        if not __import__("math").isfinite(result):
            return None
        return int(result) if integer else result
    except (TypeError, ValueError):
        return None


def collect(source):
    lines = source.read_text(encoding="utf8", errors="replace").splitlines()
    records, unparsed = [], []
    for index, line in enumerate(lines):
        if "Received POST data:" not in line:
            continue
        match = re.search(r"ImmutableMultiDict\((\[.*\])\)", line)
        try:
            raw = (
                dict(ast.literal_eval(match.group(1)))
                if match
                else ast.literal_eval(line.split("Received POST data:", 1)[1].strip())
            )
        except (ValueError, SyntaxError):
            raw = None
        if not raw or not raw.get("name"):
            unparsed.append(index + 1)
            continue
        nearby = []
        for after in lines[index + 1 : index + 35]:
            if "Received POST data:" in after:
                break
            nearby.append(after)
        ids, image, failed = [], None, False
        for after in nearby:
            found = re.search(r"New item added with ID: (\d+)", after)
            if found:
                ids.append(int(found.group(1)))
            found = re.search(r"Saving image to: (.*)", after)
            if found:
                image = "/" + found.group(1).strip().replace("\\", "/").lstrip("/")
            failed |= "Error adding item:" in after
        records.append(
            {
                "fields": {k: raw[k] for k in FIELDS if k in raw},
                "image_path": image,
                "date": line[:23],
                "source": str(source.relative_to(ROOT)),
                "line": index + 1,
                "legacy_ids": ids,
                "outcome": "failed_submission" if failed else "logged_success" if ids else "submission_only",
            }
        )
    return records, unparsed


def recover():
    events, unparsed = [], {}
    for source in (ROOT / "backup.log", ROOT / "recovery/github-main/backup.log"):
        if source.exists():
            found, skipped = collect(source)
            events.extend(found)
            unparsed[str(source.relative_to(ROOT))] = skipped
    # Restore referenced images only when an exact historical blob exists.
    objects = subprocess.check_output(
        ["git", "-c", f"safe.directory={ROOT.as_posix()}", "rev-list", "--objects", "--all"], text=True
    )
    blobs = {}
    for line in objects.splitlines():
        if " " in line:
            sha, path = line.split(" ", 1)
            blobs[path] = sha
    restored_assets = []
    for event in events:
        image = event.get("image_path")
        if not image or not image.startswith("/static/thumbnails/"):
            continue
        name = image.lstrip("/")
        path = (ROOT / name).resolve()
        if not path.is_relative_to(ROOT / "static/thumbnails"):
            continue
        if not path.exists() and name in blobs:
            data = subprocess.check_output(
                ["git", "-c", f"safe.directory={ROOT.as_posix()}", "cat-file", "blob", blobs[name]]
            )
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            restored_assets.append(name)
    merged = {}
    for event in sorted(events, key=lambda e: (e["date"], e["source"])):
        raw = event["fields"]
        key = (
            raw["name"].strip().casefold(),
            number(raw.get("map_id"), True) or 1,
            number(raw.get("x_coord")),
            number(raw.get("y_coord")),
        )
        if key not in merged:
            merged[key] = {"fields": {}, "sources": [], "legacy_ids": []}
        target = merged[key]
        target["fields"].update(raw)
        target["sources"].append({k: event[k] for k in ("source", "line", "date", "outcome")})
        target["legacy_ids"] = sorted(set(target["legacy_ids"] + event["legacy_ids"]))
        image = event.get("image_path")
        if image and (ROOT / image.lstrip("/")).is_file():
            target["image_path"] = image
        target["recovery_key"] = hashlib.sha256(json.dumps(key).encode()).hexdigest()
    candidates = []
    for target in merged.values():
        raw = target.pop("fields")
        item = {k: raw.get(k, "") for k in FIELDS}
        for key in ("x_coord", "y_coord", "x_coord_model", "y_coord_model", "z_coord_model"):
            item[key] = number(raw.get(key))
        item["map_id"] = number(raw.get("map_id"), True) or 1
        item["quantity"] = max(0, number(raw.get("quantity"), True) or 0)
        name = item["name"].strip().casefold()
        item["status"] = "archived" if name in TEST_NAMES or name.startswith("test") else "needs_review"
        item["provenance"] = {
            "kind": "historical_submission",
            "sources": target["sources"],
            "legacy_ids": target["legacy_ids"],
            "note": "Recovered from historical form submissions. Current stock, location, and later edits are unverified.",
            "classification": "likely_test" if item["status"] == "archived" else "inventory_candidate",
        }
        item["image_path"] = target.get("image_path")
        item["recovery_key"] = target["recovery_key"]
        candidates.append(item)
    csv_path = ROOT / "recovery/history/items.csv"
    if csv_path.is_file():
        for index, row in enumerate(csv.DictReader(csv_path.open(encoding="utf-8-sig")), 2):
            item = {k: row.get(k, "") for k in FIELDS}
            for key in ("x_coord", "y_coord", "x_coord_model", "y_coord_model", "z_coord_model"):
                item[key] = number(row.get(key))
            item["map_id"] = number(row.get("map_id"), True) or 1
            item["quantity"] = number(row.get("quantity"), True) or 0
            item.update(
                status="archived",
                image_path=None,
                recovery_key=hashlib.sha256(f"sample-csv:{index}".encode()).hexdigest(),
                provenance={
                    "kind": "sample_csv",
                    "sources": [{"source": "recovery/history/items.csv", "line": index}],
                    "note": "Example inventory from repository history; not confirmed lab stock.",
                },
            )
            candidates.append(item)
    candidates.sort(key=lambda x: (x["status"] == "archived", x["name"].casefold(), x["recovery_key"]))
    output = ROOT / "data"
    output.mkdir(exist_ok=True)
    (output / "recovered-inventory.json").write_text(json.dumps(candidates, indent=2), encoding="utf8")
    report = {
        "github_main_sha": "ea0282b891e6ccf37bd860dbc8321d0e09011b46",
        "github_main_database_found": False,
        "historical_csv_commit": "7946caef785ba044dc9a455d60face471a7a8cbf",
        "log_events_including_overlap": len(events),
        "candidate_records": len(candidates),
        "visible_inventory_candidates": sum(i["status"] != "archived" for i in candidates),
        "archived_samples_or_tests": sum(i["status"] == "archived" for i in candidates),
        "with_3d_coordinates": sum(
            all(i[k] is not None for k in ("x_coord_model", "y_coord_model", "z_coord_model"))
            for i in candidates
        ),
        "with_recovered_images": sum(bool(i["image_path"]) for i in candidates),
        "unparsed_submission_lines": unparsed,
        "restored_assets": restored_assets,
        "limitations": [
            "No complete database or database dump was found on GitHub main or in local Git history.",
            "Logs do not preserve every original item, subsequent edit, or deletion.",
            "Duplicate submissions with the same name, map and 2D location are consolidated; sources are retained.",
            "Failed submissions are recovered as unverified candidates, never described as successfully saved originals.",
            "All sample CSV rows and likely test records are retained in the archived view.",
        ],
    }
    (ROOT / "recovery/report.json").write_text(json.dumps(report, indent=2), encoding="utf8")
    for name in ("occ2.png", "main.bin"):
        source = ROOT / "recovery/history/static" / name
        if source.exists() and not (ROOT / "static" / name).exists():
            shutil.copy2(source, ROOT / "static" / name)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    recover()
