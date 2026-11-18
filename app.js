"use strict";

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const activeDatasetTransitions = new Map();

async function transitionDataset(element, update, direction) {
  const distance = window.innerWidth <= 700 ? 24 : 48;
  const currentStyle = getComputedStyle(element);
  const initial = { opacity: currentStyle.opacity, transform: currentStyle.transform };
  activeDatasetTransitions.get(element)?.animation?.cancel();
  let updated = false;
  const state = {
    animation: null,
    render() {
      if (updated) return;
      update();
      updated = true;
    },
  };
  activeDatasetTransitions.set(element, state);
  if (motionPreference.matches || typeof element.animate !== "function") {
    state.render();
    activeDatasetTransitions.delete(element);
    element.classList.remove("is-switching");
    element.removeAttribute("aria-busy");
    return;
  }
  element.classList.add("is-switching");
  element.setAttribute("aria-busy", "true");
  try {
    state.animation = element.animate([
      initial,
      { opacity: 0, transform: `translateX(${-distance / 2 * direction}px)` },
    ], { duration: 150, easing: "ease-out", fill: "forwards" });
    await state.animation.finished;
    if (activeDatasetTransitions.get(element) !== state) return;
    state.render();
    state.animation.cancel();
    state.animation = element.animate([
      { opacity: 0, transform: `translateX(${distance * direction}px)` },
      { opacity: 1, transform: "none" },
    ], { duration: 550, easing: "cubic-bezier(.22, .65, .3, 1)" });
    await state.animation.finished;
  } catch {
    if (activeDatasetTransitions.get(element) === state) state.render();
  } finally {
    if (activeDatasetTransitions.get(element) === state) {
      state.animation?.cancel();
      activeDatasetTransitions.delete(element);
      element.classList.remove("is-switching");
      element.removeAttribute("aria-busy");
    }
  }
}

motionPreference.addEventListener("change", (event) => {
  if (!event.matches) return;
  activeDatasetTransitions.forEach((state, element) => {
    state.animation?.cancel();
    state.render();
    element.classList.remove("is-switching");
    element.removeAttribute("aria-busy");
  });
  activeDatasetTransitions.clear();
});

const sectionLinks = [...document.querySelectorAll(".section-nav a")];
const pageSections = sectionLinks.map((link) => document.querySelector(link.hash));
let navigationFrame;
function updateActiveSection() {
  navigationFrame = null;
  let active = 0;
  const activationLine = Math.min(120, window.innerHeight * .2);
  pageSections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= activationLine) active = index;
  });
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
    active = pageSections.length - 1;
    // At the page end, several short sections can share the same scroll position.
    const destination = sectionLinks.findIndex((link) => link.hash === window.location.hash);
    if (destination >= 0) {
      const bounds = pageSections[destination].getBoundingClientRect();
      if (bounds.top >= 0 && bounds.bottom <= window.innerHeight) active = destination;
    }
  }
  sectionLinks.forEach((link, index) => {
    if (index === active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("scroll", () => {
  if (!navigationFrame) navigationFrame = requestAnimationFrame(updateActiveSection);
}, { passive: true });
window.addEventListener("resize", updateActiveSection);
window.addEventListener("hashchange", updateActiveSection);
window.addEventListener("load", updateActiveSection);
updateActiveSection();

// These viewports show the original figure pixels, including its AUC annotations.
// Coordinates use the 3200-pixel-wide PDF rendering; the image itself is lossless.
const scenes = [
  { name: "ScanNet++", y: 140, height: 256 },
  { name: "ETH3D", y: 422, height: 256 },
  { name: "Tanks and Temples", y: 704, height: 256 },
  { name: "4D-DRESS", y: 985, height: 258 },
  { name: "MV-dVRK", y: 1264, height: 280 },
];
const comparisonMethods = {
  da3: { label: "Depth Anything 3", x: 934 },
  any2full: { label: "Any2Full (w/ SfM prior)", x: 1308 },
  pi3x: { label: "Pi3X (w/ SfM prior)", x: 1682 },
  blast3r: { label: "BLASt3R", x: 2056 },
  ggpt: { label: "GGPT (w/ DA3)", x: 2430 },
  ours: { label: "Refin3R (w/ DA3)", x: 2805 },
};
const datasetTabs = [...document.querySelectorAll("[data-dataset]")];
const scenePanel = document.querySelector("#qualitative-panel");
const sceneButtons = [...document.querySelectorAll("[data-scene]")];
let sceneIndex = 0;
let suppressSceneClickUntil = 0;

function setSceneViewport(svg, viewBox) {
  svg.setAttribute("viewBox", viewBox);
  const rect = svg.querySelector("clipPath rect");
  const coordinates = viewBox.split(" ");
  ["x", "y", "width", "height"].forEach((attribute, index) => {
    rect.setAttribute(attribute, coordinates[index]);
  });
}

function showScene(index, announce = true) {
  const nextIndex = (index + scenes.length) % scenes.length;
  if (announce && nextIndex === sceneIndex) return;
  const direction = index > sceneIndex ? 1 : -1;
  sceneIndex = nextIndex;
  const scene = scenes[sceneIndex];
  datasetTabs.forEach((tab, i) => {
    tab.setAttribute("aria-selected", String(i === sceneIndex));
    tab.tabIndex = i === sceneIndex ? 0 : -1;
  });
  const render = () => {
    scenePanel.setAttribute("aria-labelledby", datasetTabs[nextIndex].id);
    document.querySelector("#scene-title").textContent = scene.name;
    document.querySelector("#scene-count").textContent = `${nextIndex + 1} / ${scenes.length}`;
    sceneButtons.forEach((button) => {
      const method = comparisonMethods[button.dataset.scene];
      const label = `${method.label} point error map`;
      const svg = button.querySelector("svg");
      setSceneViewport(svg, `${method.x} ${scene.y} 369 ${scene.height}`);
      svg.querySelector("title").textContent = `${scene.name} — ${label}`;
      button.setAttribute("aria-label", `Enlarge ${scene.name} — ${label}`);
    });
    if (announce) {
      document.querySelector("#scene-status").textContent = `${scene.name}, ${nextIndex + 1} of ${scenes.length}. Six reconstruction methods.`;
    }
  };
  if (announce) transitionDataset(scenePanel, render, direction);
  else render();
}
datasetTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => showScene(index));
  tab.addEventListener("keydown", (event) => {
    const targets = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: scenes.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    showScene(targets[event.key]);
    datasetTabs[sceneIndex].focus();
  });
});
document.querySelector("#previous-scene").addEventListener("click", () => showScene(sceneIndex - 1));
document.querySelector("#next-scene").addEventListener("click", () => showScene(sceneIndex + 1));
scenePanel.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  showScene(sceneIndex + (event.key === "ArrowRight" ? 1 : -1));
});
const comparisonPanels = document.querySelector(".comparison-panels");
let touchStart;
comparisonPanels.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "touch") touchStart = { x: event.clientX, y: event.clientY };
});
comparisonPanels.addEventListener("pointercancel", () => { touchStart = null; });
comparisonPanels.addEventListener("pointerup", (event) => {
  if (!touchStart || event.pointerType !== "touch") return;
  const dx = event.clientX - touchStart.x;
  const dy = event.clientY - touchStart.y;
  touchStart = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    suppressSceneClickUntil = Date.now() + 350;
    showScene(sceneIndex + (dx < 0 ? 1 : -1));
  }
});
showScene(0, false);

const quantitativeTabs = [...document.querySelectorAll("[data-quant-dataset]")];
const quantitativePanels = [...document.querySelectorAll(".quantitative-panel")];
const quantitativeStage = document.querySelector("#quantitative-stage");
let quantitativeIndex = 0;
function showQuantitative(index) {
  const nextIndex = (index + quantitativeTabs.length) % quantitativeTabs.length;
  if (nextIndex === quantitativeIndex) return;
  const direction = index > quantitativeIndex ? 1 : -1;
  quantitativeIndex = nextIndex;
  quantitativeTabs.forEach((tab, i) => {
    tab.setAttribute("aria-selected", String(i === nextIndex));
    tab.tabIndex = i === nextIndex ? 0 : -1;
  });
  transitionDataset(quantitativeStage, () => {
    quantitativePanels.forEach((panel, i) => { panel.hidden = i !== nextIndex; });
    document.querySelector("#quantitative-count").textContent = `${nextIndex + 1} / ${quantitativeTabs.length}`;
    document.querySelector("#quantitative-status").textContent = `Showing ${quantitativeTabs[nextIndex].textContent} results.`;
  }, direction);
}
document.querySelector("#previous-quantitative").addEventListener("click", () => showQuantitative(quantitativeIndex - 1));
document.querySelector("#next-quantitative").addEventListener("click", () => showQuantitative(quantitativeIndex + 1));
quantitativeTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => showQuantitative(index));
  tab.addEventListener("keydown", (event) => {
    const targets = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: quantitativeTabs.length - 1 };
    if (!(event.key in targets)) return;
    event.preventDefault();
    showQuantitative(targets[event.key]);
    quantitativeTabs[quantitativeIndex].focus();
  });
});

// Figures remain ordinary image links when JavaScript or <dialog> is unavailable.
const figureDialog = document.querySelector("#figure-dialog");
if (typeof figureDialog.showModal === "function") {
  const enlargedFigure = document.querySelector("#enlarged-figure");
  const enlargedScene = document.querySelector("#enlarged-scene");
  const imageContainer = document.querySelector(".dialog-image-container");
  document.querySelectorAll("[data-zoom]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      enlargedScene.setAttribute("hidden", "");
      enlargedFigure.hidden = false;
      enlargedFigure.src = link.href;
      enlargedFigure.alt = link.querySelector("img").alt;
      document.querySelector("#figure-dialog-title").textContent = link.dataset.title;
      const pdfLink = document.querySelector("#figure-pdf");
      pdfLink.hidden = !link.dataset.pdf;
      if (link.dataset.pdf) pdfLink.href = link.dataset.pdf;
      else pdfLink.removeAttribute("href");
      figureDialog.showModal();
      imageContainer.scrollTo(0, 0);
    });
  });
  sceneButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (Date.now() < suppressSceneClickUntil || scenePanel.classList.contains("is-switching")) return;
      const svg = button.querySelector("svg");
      const title = svg.querySelector("title").textContent;
      enlargedFigure.hidden = true;
      enlargedScene.removeAttribute("hidden");
      setSceneViewport(enlargedScene, svg.getAttribute("viewBox"));
      document.querySelector("#enlarged-scene-title").textContent = title;
      document.querySelector("#figure-dialog-title").textContent = title;
      const pdfLink = document.querySelector("#figure-pdf");
      pdfLink.hidden = true;
      pdfLink.removeAttribute("href");
      figureDialog.showModal();
      imageContainer.scrollTo(0, 0);
    });
  });
  document.querySelector("#close-figure").addEventListener("click", () => figureDialog.close());
  figureDialog.addEventListener("click", (event) => {
    if (event.target !== figureDialog) return;
    const bounds = figureDialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) figureDialog.close();
  });
}

const copyButton = document.querySelector("#copy-bibtex");
const citation = document.querySelector("#citation");
const hasCitation = citation.textContent.trim().length > 0;
document.querySelector("#citation-placeholder").hidden = hasCitation;
document.querySelector(".citation-actions").hidden = !hasCitation;
copyButton.hidden = !hasCitation;
let copyTimeout;
copyButton.addEventListener("click", async () => {
  if (!citation.textContent.trim()) return;
  const status = document.querySelector("#copy-status");
  clearTimeout(copyTimeout);
  try {
    await navigator.clipboard.writeText(citation.textContent);
    copyButton.textContent = "Copied!";
    status.textContent = "BibTeX citation copied to clipboard.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(citation);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyButton.textContent = "Selected";
    status.textContent = "Citation selected. Press Control+C or Command+C to copy, or download the .bib file.";
  }
  copyTimeout = setTimeout(() => { copyButton.textContent = "Copy"; }, 2500);
});

// Start reveals after a panel has entered the viewport far enough to see it move.
// Content stays visible without JavaScript and with reduced motion enabled.
if ("IntersectionObserver" in window && typeof Element.prototype.animate === "function") {
  const targets = [...document.querySelectorAll([
    ".hero .title-container", "main > .section > .container > h2", "#tldr",
    "#teaser figure", ".teaser-copy", "#method figure", ".method-card",
    ".dataset-tabs", ".qualitative-reveal", ".carousel-controls",
    ".quantitative-reveal", ".contributions-list li", ".citation-heading", ".citation-section pre",
  ].join(", "))];
  const animations = new Map();
  let enterObserver;
  let resetFrame;
  [".method-card", ".contributions-list li"].forEach((selector) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.dataset.revealDelay = String((index % 3) * 70);
    });
  });

  function reveal(element) {
    if (element.classList.contains("is-visible")) return;
    element.classList.add("is-visible");
    if (motionPreference.matches) return;
    const animation = element.animate([
      { opacity: 0, transform: "translate3d(0, 44px, 0)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ], {
      duration: 900,
      delay: Number(element.dataset.revealDelay || 0),
      easing: "cubic-bezier(.22, .65, .3, 1)",
      fill: "backwards",
    });
    animations.set(element, animation);
    animation.finished.catch(() => {}).then(() => {
      if (animations.get(element) === animation) animations.delete(element);
    });
  }

  function rearmBelowViewport() {
    resetFrame = null;
    if (motionPreference.matches) return;
    // Handle both continuous scrolling and jumps from one side of a panel to the other.
    const below = targets.filter((element) => element.classList.contains("is-visible") && !element.contains(document.activeElement) && element.getBoundingClientRect().top > window.innerHeight + 160);
    below.forEach((element) => {
      animations.get(element)?.cancel();
      element.classList.remove("is-visible");
    });
  }

  function startReveals() {
    const inset = Math.min(120, Math.round(window.innerHeight * .14));
    enterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= .08) reveal(entry.target);
      });
    }, { threshold: [0, .08], rootMargin: `0px 0px -${inset}px 0px` });
    targets.forEach((element) => element.classList.add("reveal"));
    rearmBelowViewport();
    requestAnimationFrame(() => {
      if (motionPreference.matches) return;
      targets.forEach((element) => enterObserver.observe(element));
    });
  }

  if (!motionPreference.matches) startReveals();
  window.addEventListener("scroll", () => {
    if (!resetFrame && !motionPreference.matches) resetFrame = requestAnimationFrame(rearmBelowViewport);
  }, { passive: true });
  document.addEventListener("focusin", (event) => {
    const target = event.target.closest(".reveal");
    if (target) reveal(target);
  });
  motionPreference.addEventListener("change", (event) => {
    enterObserver?.disconnect();
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    targets.forEach((element) => element.classList.add("is-visible"));
    if (!event.matches) startReveals();
  });
}
