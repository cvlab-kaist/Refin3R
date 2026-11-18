"""Extract the original qualitative figure for the scene comparison viewer."""

import argparse
from io import BytesIO
from pathlib import Path

import fitz
from PIL import Image


def prepare_qualitative(source: Path, destination: Path):
    with fitz.open(source) as doc:
        images = doc[0].get_image_info(xrefs=True)
        if len(images) != 1:
            raise ValueError("Expected the single embedded figure in main_qual_2x.pdf")
        original = doc.extract_image(images[0]["xref"])
    # Only change the file format. SVG viewports select each scene in the browser.
    with Image.open(BytesIO(original["image"])) as image:
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, format="WEBP", lossless=True, method=6)
        print(f"Prepared {destination.name}: {image.width} × {image.height}, lossless")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=root / "assets/images/qualitative-results.pdf")
    parser.add_argument("--output", type=Path, default=root / "assets/images/qualitative-scenes.webp")
    args = parser.parse_args()
    prepare_qualitative(args.source, args.output)
