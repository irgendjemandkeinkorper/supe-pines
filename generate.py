#!/usr/bin/env python3
"""Generate Supe Pines card art from a validated manifest.

The manifest and its hand-authored noir-comic prompts come from:
    node scripts/gen-prompts.mjs
    node scripts/gen-manifest.mjs

Image-generation libraries are imported only after argument and manifest
validation, so ``generate.py --help`` and ``--dry-run`` work without a Python
environment or API credential.
"""

from __future__ import annotations

import argparse
from io import BytesIO
import json
import os
from pathlib import Path
import re
import sys
from typing import Any


REPO = Path(__file__).resolve().parent
DEFAULT_MANIFEST = REPO / "manifest.json"
DEFAULT_VAULT = Path(os.environ.get("SUPE_PINES_VAULT", REPO.parent / "supe-pines-vault"))
SUPPORTED_CATEGORIES = ("heroes", "cases", "signals", "threats")
SUPPORTED_STYLES = ("ink", "expressionist")
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n(.*)$", re.DOTALL)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate Supe Pines noir-comic card art from manifest.json.",
        epilog=(
            "Use --dry-run first to validate prompts and selection without "
            "loading image libraries or making a paid API call."
        ),
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST,
                        help="manifest path (default: %(default)s)")
    parser.add_argument("--ids", nargs="+", metavar="ID",
                        help="only process entries with these ids")
    parser.add_argument("--category", choices=SUPPORTED_CATEGORIES,
                        help="only process one card category")
    parser.add_argument("--style", choices=SUPPORTED_STYLES,
                        help="only process Noir Comic or Interpretive Expressionist art")
    parser.add_argument("--limit", type=int,
                        help="cap the selected records (useful for a test batch)")
    parser.add_argument("--dry-run", action="store_true",
                        help="validate and list the selection; never call the image API")
    parser.add_argument("--no-write-back", action="store_true",
                        help="do not update image URLs in sibling vault frontmatter")
    parser.add_argument("--vault", type=Path, default=DEFAULT_VAULT,
                        help="sibling vault path (default: %(default)s)")
    parser.add_argument("--model", default="gemini-3.1-flash-image",
                        help="Gemini image model (default: %(default)s)")
    return parser


def nonempty_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def validate_manifest(records: Any) -> list[str]:
    errors: list[str] = []
    if not isinstance(records, list) or not records:
        return ["Manifest must be a non-empty JSON array."]
    required = (
        "id", "category", "style", "field", "name", "prompt",
        "aspectRatio", "savePath", "imageUrl", "vaultPath",
    )
    seen_paths: set[str] = set()
    for index, record in enumerate(records):
        if not isinstance(record, dict):
            errors.append(f"Record {index}: expected an object.")
            continue
        label = f"{record.get('category', '?')}/{record.get('id', index)}/{record.get('style', '?')}"
        for field in required:
            if not nonempty_text(record.get(field)):
                errors.append(f"{label}: {field} must be a non-empty string.")
        category = record.get("category")
        style = record.get("style")
        side = record.get("side")
        save_path = record.get("savePath", "")
        if category not in SUPPORTED_CATEGORIES:
            errors.append(f"{label}: unsupported category {category!r}.")
        if style not in SUPPORTED_STYLES:
            errors.append(f"{label}: unsupported style {style!r}.")
        if category in ("heroes", "threats") and side not in ("front", "turned"):
            errors.append(f"{label}: {category[:-1].capitalize()} side must be 'front' or 'turned'.")
        if category not in ("heroes", "threats") and side is not None:
            errors.append(f"{label}: only Hero and Threat records may have a side.")
        expected_prefix = f"art/images/{style}/{category}/"
        if not isinstance(save_path, str) or not save_path.startswith(expected_prefix):
            errors.append(f"{label}: savePath must begin with {expected_prefix!r}.")
        if ".." in Path(save_path).parts:
            errors.append(f"{label}: savePath may not traverse directories.")
        if save_path in seen_paths:
            errors.append(f"{label}: duplicate savePath {save_path!r}.")
        seen_paths.add(save_path)
        if nonempty_text(record.get("prompt")) and len(record["prompt"].split()) < 25:
            errors.append(f"{label}: prompt is unexpectedly short; regenerate the manifest.")
    return errors


def load_manifest(path: Path) -> list[dict[str, Any]]:
    try:
        with path.open(encoding="utf-8") as handle:
            records = json.load(handle)
    except FileNotFoundError as error:
        raise ValueError(
            f"Manifest not found at {path}. Run "
            "`node scripts/gen-manifest.mjs --no-vault` first."
        ) from error
    except json.JSONDecodeError as error:
        raise ValueError(f"Manifest is not valid JSON: {error}") from error
    errors = validate_manifest(records)
    if errors:
        raise ValueError(
            f"Manifest validation failed with {len(errors)} error"
            f"{'s' if len(errors) != 1 else ''}:\n- " + "\n- ".join(errors)
        )
    return records


def select_records(records: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    selected = records
    if args.ids:
        wanted = set(args.ids)
        selected = [record for record in selected if record["id"] in wanted]
    if args.category:
        selected = [record for record in selected if record["category"] == args.category]
    if args.style:
        selected = [record for record in selected if record["style"] == args.style]
    if args.limit is not None:
        if args.limit < 1:
            raise ValueError("--limit must be at least 1.")
        selected = selected[:args.limit]
    return selected


def load_generation_dependencies():
    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv(REPO / ".env")
    except ImportError:
        pass
    try:
        from google import genai  # type: ignore
        from google.genai import types  # type: ignore
        from PIL import Image  # type: ignore
    except ImportError as error:
        raise RuntimeError(
            "Image generation needs google-genai and Pillow. Install them in a "
            "virtual environment, then retry. Dry runs need no dependencies."
        ) from error
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set. Put it in the environment or an optional .env file.")
    return genai.Client(api_key=api_key), types, Image


def create_image(client, types, image_type, prompt: str, output_path: Path,
                 aspect_ratio: str | None, model: str) -> bool:
    response = client.models.generate_content(
        model=model,
        contents=f"Generate an image based on this art direction: {prompt}",
        config=types.GenerateContentConfig(
            response_modalities=[types.Modality.TEXT, types.Modality.IMAGE],
            image_config=types.ImageConfig(aspect_ratio=aspect_ratio) if aspect_ratio else None,
        ),
    )
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        parts = getattr(getattr(candidate, "content", None), "parts", None) or []
        for part in parts:
            inline_data = getattr(part, "inline_data", None)
            if inline_data and inline_data.data:
                image = image_type.open(BytesIO(inline_data.data))
                output_path.parent.mkdir(parents=True, exist_ok=True)
                image.save(output_path)
                return True
    return False


def write_back_image_url(vault_path: Path, field: str, url: str) -> None:
    if not vault_path.exists():
        print(f"  !! vault file not found; skipping write-back: {vault_path}")
        return
    text = vault_path.read_text(encoding="utf-8")
    match = FRONTMATTER_RE.match(text)
    if not match:
        print(f"  !! could not parse frontmatter; skipping write-back: {vault_path}")
        return
    frontmatter, body = match.groups()
    field_pattern = rf"^{re.escape(field)}:.*$"
    replacement = f"{field}: {url}"
    if re.search(field_pattern, frontmatter, re.MULTILINE):
        frontmatter = re.sub(field_pattern, replacement, frontmatter, flags=re.MULTILINE)
    else:
        frontmatter = f"{frontmatter.rstrip()}\n{replacement}"
    vault_path.write_text(f"---\n{frontmatter}\n---\n{body}", encoding="utf-8")


def safe_output_path(save_path: str) -> Path:
    output = (REPO / save_path).resolve()
    art_root = (REPO / "art" / "images").resolve()
    if art_root not in output.parents:
        raise ValueError(f"Refusing output outside {art_root}: {output}")
    return output


def run(args: argparse.Namespace) -> int:
    manifest_path = args.manifest.expanduser().resolve()
    records = load_manifest(manifest_path)
    selected = select_records(records, args)
    if not selected:
        raise ValueError("No manifest records match the requested filters.")
    print(f"Manifest valid: {len(records)} records. Selected: {len(selected)}.")
    if args.dry_run:
        for record in selected:
            side = f"/{record['side']}" if record.get("side") else ""
            print(f"- {record['category']}/{record['id']} ({record['style']}{side}) -> {record['savePath']}")
        print("Dry run complete; no API calls or file writes were made.")
        return 0

    client, types, image_type = load_generation_dependencies()
    vault_root = args.vault.expanduser().resolve()
    succeeded = 0
    failed: list[str] = []
    for index, record in enumerate(selected, 1):
        side = f"/{record['side']}" if record.get("side") else ""
        label = f"[{index}/{len(selected)}] {record['category']}/{record['id']} ({record['style']}{side})"
        output_path = safe_output_path(record["savePath"])
        if output_path.exists():
            print(f"{label} already exists; skipping generation")
            succeeded += 1
            continue
        print(f"{label} generating...")
        try:
            created = create_image(
                client, types, image_type, record["prompt"], output_path,
                record.get("aspectRatio"), args.model,
            )
        except Exception as error:  # the API surfaces several provider-specific exception types
            print(f"{label} !! {error}")
            failed.append(f"{record['category']}/{record['id']}/{record['style']}{side}")
            continue
        if not created:
            print(f"{label} !! the model returned no image")
            failed.append(f"{record['category']}/{record['id']}/{record['style']}{side}")
            continue
        succeeded += 1
        print(f"{label} saved -> {record['savePath']}")
        if not args.no_write_back:
            write_back_image_url(
                vault_root / record["vaultPath"], record["field"], record["imageUrl"]
            )
    print(f"Done. {succeeded} succeeded or already existed; {len(failed)} failed.")
    if failed:
        print("Failed records:", ", ".join(failed))
        return 1
    return 0


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return run(args)
    except (ValueError, RuntimeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
