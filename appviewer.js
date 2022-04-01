import {
    Color,
    MeshLambertMaterial    
} from "three";
  
import { IfcViewerAPI } from "web-ifc-viewer"

import { 
    IFCWALLSTANDARDCASE,      
    IFCSLAB,
    IFCDOOR,
    IFCWINDOW,
    IFCFURNISHINGELEMENT,
    IFCMEMBER,
    IFCPLATE,
    IFCBUILDINGSTOREY
} from  "web-ifc";

import Stats from 'stats.js/src/Stats';
  
const wasmPath = "./wasm/";

//Sets up the renderer, fetching the canvas of the HTML
const viewerContainer = document.getElementById("viewer-container");

const viewer = new IfcViewerAPI({
    container: viewerContainer,
    backgroundColor: new Color(0x89C0FF)
});

// Bring building to the origin of the scene
viewer.IFC.applyWebIfcConfig({
    COORDINATE_TO_ORIGIN: true,
    USE_FAST_BOOLS: true
});

window.webIfcApi = viewer;

// Set up the scene
viewer.axes.setAxes();
viewer.grid.setGrid(50, 50);
viewer.IFC.setWasmPath(wasmPath);
viewer.clipper.active = true;

let dimensionsActive = false;

// Add basic input logic
const handleKeyDown = (event) => {
    switch(event.code) {
        case 'KeyE':
            {
              dimensionsActive = !dimensionsActive;
              viewer.dimensions.active = dimensionsActive;
              viewer.dimensions.previewActive = dimensionsActive;
              viewer.IFC.selector.unPrepickIfcItems();
              window.onmousemove = dimensionsActive ? null : viewer.IFC.selector.prePickIfcItem;              
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
}

window.onkeydown = handleKeyDown;

window.onmousemove = viewer.IFC.selector.prePickIfcItem;

// Stats
const stats = new Stats();
stats.showPanel(0);
document.body.append(stats.dom);
stats.dom.style.right = '0px';
stats.dom.style.left = 'auto';
viewer.context.stats = stats;

  // Load the model from the selected file
  const input = document.getElementById("file-input");
  input.addEventListener(
      "change",
      async (changed) => {
          const file = changed.target.files[0];
          await viewer.IFC.loadIfc(file);

          await setupStoreys();
      },
      false
  );      

const output = document.getElementById("id-output");

window.ondblclick = async(event) => {
    if (!output) {        
        return;
    }

    const item = await viewer.IFC.selector.pickIfcItem(true);
    if (!item) {
        return;
    }

    if (item.modelID === undefined || item.id === undefined) {
        return;
    }       
    
    // Added the await to force the properties to be retrieved.
    const props = await viewer.IFC.getProperties(item.modelID, item.id, false);
    output.innerHTML = JSON.stringify(props, null, 2);
}

const modelID = 0;

const storeysByID = {};

async function setupStoreys() {
    const storeys = await viewer.IFC.getAllItemsOfType(modelID, IFCBUILDINGSTOREY);
    console.log("Storeys: " + storeys);
    for (let i = 0; i < storeys.length; i++) {
        const storeyID = storeys[i];
        const storeyProperties = await viewer.IFC.getProperties(modelID, storeyID);
        console.log(JSON.stringify(storeyProperties, null, 2));
        console.log("Elevation:" + JSON.stringify(storeyProperties.Elevation));
        
        console.log("Elevation value: %o", Object.values(storeyProperties.Elevation));
        
        storeysByID[storeyID] = storeyProperties;
    }

    /*const storeysByLevel =  Object.values(storeysByID);
    storeysByLevel.sort(function(a, b) {
        return a.Elevation[value] > b.Elevation[value]
    });*/
}

/*
const categories = {
    IFCWALLSTANDARDCASE,
    IFCSLAB,
    IFCFURNISHINGELEMENT,
    IFCDOOR,
    IFCWINDOW,
    IFCPLATE,
    IFCMEMBER
};

function getName(category) {
    const names = Object.keys(categories);
    return names.find(name => categories[name] === category);
}

// Gets the IDs of all the items of a specific category
async function getAll(category) {
    const manager = window.webIfcApi.IFC;
    return manager.getAllItemsOfType(modelID, category, false);
}

// Creates a new subset containing all elements of a category
async function newSubsetOfType(category) {
    const ids = await getAll(category);
    return window.webIfcApi.IFC.createSubset({
        modelID: modelID,
        scene,
        ids,
        removePrevious: true,
        customID: category.toString()
    })
}

// Stores the created subsets
const subsets = {};

async function setupAllCategories() {
    const allCategories = Object.values(categories);
    for (let i = 0; i < allCategories.length; i++) {
        const category = allCategories[i];
        await setupCategory(category);
    }
}

// Creates a new subset and configures the checkbox
async function setupCategory(category) {
    subsets[category] = await newSubsetOfType(category);
    // console.log("Items for category %s: %s", getName(category), JSON.stringify(subsets[category], null, 2));
    setupCheckBox(category);
}

// Sets up the checkbox event to hide / show elements
function setupCheckBox(category) {
    const name = getName(category);
    console.log('Called setupCheckBox for category %s', name);
    const checkBox = document.getElementById(name);
    if (checkBox) {
        checkBox.addEventListener('change', async (event) => {
            const checked = event.target.checked;
            const subset = subsets[category];
            console.log("Subset for category %s: %s", getName(category), JSON.stringify(subset, null, 2));
            if (checked) scene.add(subset);
            else await subset.removeFromParent();   // Does not work in the current versions of ifc packages
        });
    }
}
*/

async function releaseMemory() {
    // This releases all IFCLoader memory
    await window.webIfcApi.IFC.dispose();
    // ifcLoader = null;
    // ifcLoader = new IFCLoader();

    // If the wasm path was set before, we need to reset it
    await window.webIfcApi.IFC.setWasmPath(wasmPath);

    // If IFC models are an array or object,
    // you must release them there as well
    // Otherwise, they won't be garbage collected
    subsets.length = 0;
    models.length = 0;    
}

// Sets up memory disposal
const button = document.getElementById('memory-button');
button.addEventListener(`click`, () => releaseMemory());