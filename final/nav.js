/* ============================================================================
 * PlanPilot — Shared top navigation
 * Inject with: <div data-nav="landing|decoder|customer|devdocs"></div>
 * ==========================================================================*/
(function () {
  "use strict";

  const LINKS = [
    { id: "landing", label: "Overview", href: "index.html" },
    { id: "decoder", label: "Pitch Decoder", href: "decoder.html" },
    { id: "devdocs", label: "For Dev", href: "devdocs.html" },
  ];

  function render(mount) {
    const active = mount.getAttribute("data-nav") || "landing";
    const links = LINKS.map(
      (l) => `<a class="nav-link${l.id === active ? " active" : ""}" href="${l.href}">${l.label}</a>`
    ).join("");

    mount.outerHTML = `
      <nav class="nav">
        <div class="nav-inner">
          <a class="brand" href="index.html">
            <span class="brand-mark">Plan<span class="dot">Pilot</span></span>
            <span class="brand-tag">Persuasion Defense</span>
          </a>
          <div class="nav-links">${links}</div>
        </div>
      </nav>`;
  }

  function init() {
    document.querySelectorAll("[data-nav]").forEach(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
