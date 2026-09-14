"""Create web-sized derivatives while preserving all original image/model files."""

import hashlib
import json
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
out = ROOT / "static/optimized"
out.mkdir(exist_ok=True)
manifest = []
for source in sorted((ROOT / "static/thumbnails").glob("*")):
    if not source.is_file():
        continue
    try:
        with Image.open(source) as image:
            optimized = ImageOps.exif_transpose(image).convert("RGB")
            optimized.thumbnail((360, 360))
            target = out / (hashlib.sha256(source.name.encode()).hexdigest()[:16] + ".webp")
            optimized.save(target, "WEBP", quality=82)
            manifest.append(
                {
                    "source": "/static/thumbnails/" + source.name,
                    "derivative": "/static/optimized/" + target.name,
                    "original_bytes": source.stat().st_size,
                    "bytes": target.stat().st_size,
                }
            )
    except OSError:
        continue
model = json.loads((ROOT / "static/iLab.gltf").read_text(encoding="utf8"))
with Image.open(ROOT / "static/occ2.png") as texture:
    texture.thumbnail((2048, 2048))
    texture.save(out / "texture.png", optimize=True)
model["images"][0]["uri"] = "texture.png"
model["buffers"][0]["uri"] = "../iLab.bin"
(out / "iLab.gltf").write_text(json.dumps(model, separators=(",", ":")), encoding="utf8")
(out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf8")
print(
    f"Thumbnails: {sum(m['original_bytes'] for m in manifest):,} -> {sum(m['bytes'] for m in manifest):,} bytes"
)
print(
    f"Model texture: {(ROOT / 'static/occ2.png').stat().st_size:,} -> {(out / 'texture.png').stat().st_size:,} bytes"
)
