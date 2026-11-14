// Paper / phosphor toggle. Without JS the page follows the OS setting and the button stays hidden.
const button = document.querySelector(".theme-toggle");
const root = document.documentElement;

function readSaved() {
  try { return localStorage.getItem("theme"); } catch { return null; }
}

function apply(theme) {
  root.dataset.theme = theme;
  button.textContent = theme === "phosphor" ? "◐ paper" : "◐ phosphor";
}

const saved = readSaved();
const osDark = matchMedia("(prefers-color-scheme: dark)").matches;
apply(saved ?? (osDark ? "phosphor" : "paper"));
button.hidden = false;

button.addEventListener("click", () => {
  const next = root.dataset.theme === "phosphor" ? "paper" : "phosphor";
  apply(next);
  try { localStorage.setItem("theme", next); } catch { /* private mode: choice lasts this page only */ }
});
