import { Color } from "three";
import { IfcViewerAPI } from "web-ifc-viewer";

export async function setupScene(document, viewerContainerID, wasmPath) {
  const viewerContainer = document.getElementById(viewerContainerID);

  const viewer = new IfcViewerAPI({
    container: viewerContainer,
    backgroundColor: new Color(0x89c0ff),
  });

  // Bring building to the origin of the scene
  await viewer.IFC.applyWebIfcConfig({
    COORDINATE_TO_ORIGIN: true,
    USE_FAST_BOOLS: true,
  });

  viewer.axes.setAxes();
  viewer.grid.setGrid(50, 50);
  await viewer.IFC.setWasmPath(wasmPath);
  viewer.clipper.active = true;

  return viewer;
}
