import Stats from "stats.js/src/Stats";

export function setupStats(viewer, document) {
  const stats = new Stats();
  stats.showPanel(0);
  document.body.append(stats.dom);
  stats.dom.style.right = "0px";
  stats.dom.style.left = "auto";

  viewer.context.stats = stats;
}
