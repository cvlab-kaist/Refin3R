"""Convert the supplied research figures into static web assets."""

import argparse
from pathlib import Path
import shutil

import fitz
from PIL import Image
from prepare_qualitative import prepare_qualitative


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Source figure directory")
    parser.add_argument("--paper", type=Path, required=True, help="Manuscript PDF")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    images = root / "assets" / "images"
    paper = root / "assets" / "paper"
    figures = [
        ("teaser.pdf", "teaser", 2600),
        ("main_qual_2x.pdf", "qualitative-results", 3200),
        ("overall_architecture.pdf", "architecture", 2800),
        ("subfigure.pdf", "interaction", 1500),
    ]
    # Validate all sources before replacing any existing assets.
    for source in [args.paper, *(args.source / item[0] for item in figures)]:
        if not source.is_file():
            parser.error(f"Missing source: {source}")
    images.mkdir(parents=True, exist_ok=True)
    paper.mkdir(parents=True, exist_ok=True)

    for filename, name, width in figures:
        source = args.source / filename
        with fitz.open(source) as doc:
            page = doc[0]
            scale = width / page.rect.width
            pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples)
        image.save(images / f"{name}.webp", quality=92, method=6)
        shutil.copy2(source, images / f"{name}.pdf")
        if name == "teaser":
            image.thumbnail((1200, 630))
            social = Image.new("RGB", (1200, 630), "white")
            social.paste(image, ((1200 - image.width) // 2, (630 - image.height) // 2))
            social.save(images / "social-preview.jpg", quality=90, optimize=True)
        print(f"Prepared {name}")

    prepare_qualitative(args.source / "main_qual_2x.pdf", images / "qualitative-scenes.webp")
    shutil.copy2(args.paper, paper / "refin3r.pdf")
    print("Prepared manuscript PDF")


if __name__ == "__main__":
    main()
