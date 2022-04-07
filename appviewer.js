import { setupStats } from "./setup/setupStats.js";
import { setupScene } from "./setup/setupScene.js";
import { setupStoreys } from "./setup/setupStoreys.js";

const wasmPath = "./wasm/";

const subsets = {};

main(document);

setupFileLoading(document, subsets);

// Set up the scene
async function main(document) {
  const ifcViewer = await setupScene(document, "viewer-container", wasmPath);
  window.webIfcApi = ifcViewer;

  // Stats
  setupStats(ifcViewer, document);

  setupEvents(ifcViewer, document, subsets);
}

function setupEvents(viewer, document) {
  window.onkeydown = setupKeyDownHandler(viewer);

  setupDoubleClickHandler(viewer, document);
}

let dimensionsActive = false;

// Add basic input logic

function setupKeyDownHandler(viewer) {
  return (event) => {
    switch (event.code) {
      case "KeyE":
        {
          dimensionsActive = !dimensionsActive;
          viewer.dimensions.active = dimensionsActive;
          viewer.dimensions.previewActive = dimensionsActive;
          viewer.IFC.selector.unPrepickIfcItems();
          // Keeps showing errors.
          // window.onmousemove = dimensionsActive ? null : viewer.IFC.selector.prePickIfcItem;
          console.log("Dimensions active: " + dimensionsActive);
        }
        break;

      case "KeyD":
        viewer.dimensions.create();
        break;

      case "KeyG":
        viewer.clipper.createPlane();
        break;

      case "Delete": {
        viewer.dimensions.deleteAll();
        viewer.clipper.deletePlane();
        viewer.IFC.selector.unpickIfcItems();
        break;
      }
    }
  };
}

let model = null;

// Load the model from the selected file
function setupFileLoading(document, subsets) {
  const input = document.getElementById("file-input");
  input.addEventListener(
    "change",
    async (changed) => {
      const viewer = window.webIfcApi;
      if (model) {
        // does not work well
        //viewer.context.getScene().remove(model);
        model = null;
        subsets.length = 0;
      }

      const file = changed.target.files[0];
      model = await viewer.IFC.loadIfc(file);
      console.log("Model:", model);
      await setupStoreys(
        viewer,
        document,
        viewer.IFC.context.items.ifcModels.length - 1,
        subsets
      );

      const height = await viewer.IFC.properties.getBuildingHeight(0);
      console.log("Height:", height);
    },
    false
  );
}

function setupDoubleClickHandler(viewer, document) {
  const output = document.getElementById("id-output");

  window.ondblclick = async (event) => {
    if (output) {
      const item = await viewer.IFC.selector.pickIfcItem(true);
      if (!item) {
        return;
      }

      if (item.modelID === undefined || item.id === undefined) {
        return;
      }

      const props = await viewer.IFC.getProperties(
        item.modelID,
        item.id,
        false
      );
      output.innerHTML = JSON.stringify(props, null, 2);
    }
  };
}

async function setupStoreysFromProject(viewer) {
  const project = await viewer.IFC.getSpatialStructure(modelID);
}

async function releaseMemory() {
  await window.webIfcApi.IFC.dispose();

  window.webIfcApi = null;

  // If IFC models are an array or object,
  // you must release them there as well
  // Otherwise, they won't be garbage collected
  subsets.length = 0;

  // Prepare for the next model.
  main(document);
}

// Sets up memory disposal
const button = document.getElementById("memory-button");
button.addEventListener(`click`, () => releaseMemory());
