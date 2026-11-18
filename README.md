# Refin3R project page

Static GitHub Pages site for **Refin3R: Geometry-Guided Refinement for Feed-Forward 3D Reconstruction**, by Jongmin Lee, Jaeyeong Kim, and Seungryong Kim (KAIST AI).

Page design is inspired by [Nerfies](https://nerfies.github.io/), with a centered academic header, purple accents, a section navigation sidebar, and outlined resource buttons. Like [L3G-World](https://github.com/cvlab-kaist/L3G-World/tree/gh-pages), it is served directly from the root of a separate `gh-pages` branch. No build step or JavaScript framework is required.

## Preview

From this directory:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`. All asset paths are relative, so the page also works under the `/Refin3R/` repository path. Google Fonts provides Google Sans and Noto Sans, with local system fallbacks. Figures, the paper, scripts, and styles are served from this branch.

## Publish

1. Push this branch: `git push -u origin gh-pages`.
2. In the repository’s **Settings → Pages**, select **Deploy from a branch**.
3. Select **gh-pages** and **/(root)**, then save.

The published URL is `https://cvlab-kaist.github.io/Refin3R/`. Keep `index.html`, `.nojekyll`, `style.css`, `app.js`, and `assets/` at the branch root.

## Edit

- `index.html`: paper metadata and authors, then TL;DR, teaser, method, qualitative results, quantitative results, contributions, and citation.
- `style.css`: responsive layout and styling.
- `app.js`: active section navigation, qualitative and quantitative dataset transitions, scroll reveals, figure enlargement, and BibTeX copying. The paper, default results table, and full comparison figure remain accessible without JavaScript.
- `assets/images/`: optimized WebP figures, original figure PDFs, and the social-preview image.
- `assets/paper/refin3r.pdf`: the supplied manuscript.
- `assets/data/refin3r.bib`: empty until the arXiv release. The page shows “To be updated” separately from the citation. Add the official citation here, in `index.html`, and in the `main` README; the placeholder disappears and copy/download controls appear when the page citation is populated.

The paper does not contain an arXiv identifier. The Paper button therefore links to the provided PDF, and the citation displays “To be updated” until the official BibTeX is available. The author names, affiliation, overview, method descriptions, and result figures and tables come from the supplied manuscript. Only verified author homepage links are included.

## Regenerate figures

The page itself has no Python dependencies. To regenerate the web assets, install `PyMuPDF` and `Pillow`, then run:

```bash
python3 scripts/prepare_assets.py --source /path/to/assets --paper /path/to/manuscript.pdf
```

The script uses the figure variants that match the manuscript: `teaser.pdf`, `main_qual_2x.pdf`, `overall_architecture.pdf`, and `subfigure.pdf`. Original PDFs are retained for full-resolution viewing. Temporary and superseded figure variants are not published.

The qualitative viewer shows one scene at a time for ScanNet++, ETH3D, Tanks and Temples, 4D-DRESS, and MV-dVRK. Dataset tabs, arrow buttons, keyboard arrows, and touch swipes switch scenes. Six methods appear together in two rows and three columns: DA3, Any2Full, Pi3X, BLASt3R, GGPT, and Refin3R. The grid uses two columns on small screens. Input images and the standalone SfM result are omitted. Click any result to enlarge it.

Quantitative results use the same five dataset tabs. ScanNet++, ETH3D, and Tanks and Temples show the 4-, 8-, and 16-view AUC@1 / AUC@5 cm results from Table 1. The 4D-DRESS and MV-dVRK tables show Table 2's two AUC thresholds in centimeters and millimeters, respectively. Bold and underlined scores denote the best and second-best values for each metric. All numbers are transcribed from the supplied PDF.

The `--content-spacing` CSS variable scales the main content's spacing to 85%. Main content is 90% of the original width, with 88px between TL;DR and Teaser (64px on mobile). Sections and panels rise 44px and fade in over 900ms after entering the viewport. Panels re-arm only after moving entirely below the viewport. Both result viewers have previous/next arrows and directional slide transitions; the arrows flank the panels on desktop and the dataset heading on mobile. Reduced-motion preferences disable these effects. Rapid dataset changes resolve to the most recently selected dataset.

CSS, JavaScript, and paper URLs include content-hash version parameters to refresh cached files. Update the relevant parameter when replacing one of those files.

`assets/images/qualitative-scenes.webp` is a lossless extraction of the original image embedded in `main_qual_2x.pdf`. SVG viewports display the individual panels without altering their pixels or AUC annotations. Viewport coordinates are defined in `app.js`; update them if the source figure layout changes. Regenerate just this asset without replacing the paper or other figures:

```bash
python3 scripts/prepare_qualitative.py
```
