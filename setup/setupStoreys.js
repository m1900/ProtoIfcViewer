import { IFCBUILDINGSTOREY } from "web-ifc";
import { IfcProperties } from "web-ifc-viewer/dist/components/ifc/ifc-properties";
import { toFixedImproved } from "../utils.js";
import { MeshLambertMaterial } from "three";

/**
 *
 * @param {IFCProject} project
 * @param {storey ID, IFCBuildingStorey} realStoreys
 */
async function processProject(project, realStoreys) {
  for (let i = 0; i < project.children.length; i++) {
    const projectChild = project.children[i];

    switch (projectChild.type) {
      case "IFCSITE":
        await processSite(projectChild, realStoreys);
        break;
    }
  }
}

/**
 *
 * @param {IFCSite} site
 * @param {storey ID, IFCBuildingStorey} realStoreys
 */
async function processSite(site, realStoreys) {
  for (let i = 0; i < site.children.length; i++) {
    const siteChild = site.children[i];

    switch (siteChild.type) {
      case "IFCBUILDING":
        await processBuilding(siteChild, realStoreys);
        break;
    }
  }
}

/**
 *
 * @param {IFCBuilding} building
 * @param {storey ID, IFCBuildingStorey} realStoreys
 */
async function processBuilding(building, realStoreys) {
  for (let i = 0; i < building.children.length; i++) {
    const buildingChild = building.children[i];

    switch (buildingChild.type) {
      case "IFCBUILDINGSTOREY":
        await processStorey(buildingChild, realStoreys);
        break;
    }
  }
}

/**
 *
 * @param {IFCBuildingStorey} storey
 * @param {storey ID, IFCBuildingStorey} realStoreys
 */
async function processStorey(storey, realStoreys) {
  realStoreys[storey.expressID] = storey;
}

export async function setupStoreys(viewer, document, modelID, subsets) {
  const project = await viewer.IFC.getSpatialStructure(modelID);

  console.log("Project:", JSON.stringify(project, null, 2));
  console.log("ID of project:", project.expressID);

  const realStoreysByID = {};

  switch (project.type) {
    case "IFCPROJECT":
      await processProject(project, realStoreysByID);
      break;

    case "IFCSITE":
      break;
  }

  const realStoreys = Object.values(realStoreysByID);

  const storeyPropertiesByID = {};

  for (let i = 0; i < realStoreys.length; i++) {
    const storey = realStoreys[i];
    const storeyProperties = await viewer.IFC.getProperties(
      modelID,
      storey.expressID
    );
    if (!storeyProperties) {
      continue;
    }
    // console.log(JSON.stringify(storeyProperties, null, 2));
    console.log("Elevation value: %s", storeyProperties.Elevation.value);
    storeyPropertiesByID[storey.expressID] = storeyProperties;
  }

  // console.log("Storeys: " + storeys);

  // Sort the storeys from bottom to top.
  const storeyPropertiesByLevel = Object.values(storeyPropertiesByID);
  storeyPropertiesByLevel.sort(function (a, b) {
    return a.Elevation.value > b.Elevationvalue;
  });

  const checkboxContainer = document.getElementById("storey-checkboxes");
  // Clear checkboxes of old model.
  checkboxContainer.innerHTML = "";

  // Create the checkboxes
  const checkboxIDsAndStoreys = {};

  for (let i = 0; i < storeyPropertiesByLevel.length; i++) {
    const storeyProperties = storeyPropertiesByLevel[i];
    const checkboxID = addCheckbox(storeyProperties, checkboxContainer, i);
    checkboxIDsAndStoreys[storeyProperties.expressID] = checkboxID;

    console.log(
      "Storey [%s], check box ID %s",
      storeyProperties.LongName.value,
      checkboxID
    );
  }

  // Add event handlers to the checkboxes
  for (let i = 0; i < storeyPropertiesByLevel.length; i++) {
    const storeyProperties = storeyPropertiesByLevel[i];
    const storey = realStoreysByID[storeyProperties.expressID];
    const checkboxID = checkboxIDsAndStoreys[storeyProperties.expressID];

    console.log(
      "[%s], %s elevation %s, check box %s",
      storeyProperties.expressID,
      storeyProperties.LongName.value,
      toFixedImproved(storeyProperties.Elevation.value / 10000.0, 3),
      checkboxID
    );
    await setupStorey(
      storeyProperties,
      storey,
      modelID,
      viewer,
      document,
      subsets,
      checkboxID
    );
  }
}

// Creates a new subset and configures the checkbox
async function setupStorey(
  storeyProperties,
  storey,
  modelID,
  ifcViewer,
  document,
  subsets,
  checkboxID
) {
  const subset = await newSubsetOfStorey(
    storey,
    modelID,
    ifcViewer,
    checkboxID
    //storeyProperties.LongName.value
  );
  subsets[storeyProperties.expressID] = subset;
  // console.log("Items for category %s: %s", getName(category), JSON.stringify(subsets[category], null, 2));
  connectCheckboxToEvent(
    storeyProperties,
    checkboxID,
    document,
    subsets,
    ifcViewer
  );
}

const preselectMat = new MeshLambertMaterial({
  transparent: true,
  opacity: 0.6,
  color: 0xff88ff,
  depthTest: false,
});

// Creates a new subset containing all elements of a storey
async function newSubsetOfStorey(storey, modelID, viewer, storeyName) {
  //const ids = await getAll(storey);
  const childIDs = storey.children.map(function (child) {
    return child.expressID;
  });

  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: modelID,
    scene: viewer.IFC.context.scene,
    ids: childIDs,
    removePrevious: false, // nakijken of dit nodig is om meerdere subsets naast elkaar te laten staan
    customID: storeyName,
    // material: preselectMat,
  });
}

// Sets up the checkbox event to hide / show elements
function addCheckbox(storey, checkboxContainer, index) {
  const name = storey.LongName.value;
  console.log("Called addCheckBox for storey ", name);

  const checkBoxID = `storey-${index}`;
  // Create checkbox
  const checkBoxHtml = `<div>
      <input checked="true" id="${checkBoxID}" type="checkbox">
      <label for="${checkBoxID}">${name}<label/><br>      
  </div>`;

  checkboxContainer.innerHTML += checkBoxHtml;

  return checkBoxID;
}

/**
 *
 * @param {IfcProperties} storeyProperties
 * @param {string} checkBoxID
 * @param {*} document
 * @param {*} subsets
 * @param {IfcViewerAPI} viewer
 */
function connectCheckboxToEvent(
  storeyProperties,
  checkBoxID,
  document,
  subsets,
  viewer
) {
  const name = storeyProperties.LongName.value;
  //console.log("Called connectCheckboxToEvent for storey ", name);

  const checkBox = document.getElementById(checkBoxID);
  if (checkBox) {
    checkBox.addEventListener("change", async (event) => {
      const checked = event.target.checked;
      const subset = subsets[storeyProperties.expressID];
      console.log(
        "Subset for storey %s: %s",
        storeyProperties.LongName.value,
        JSON.stringify(subset, null, 2)
      );
      if (checked) {
        // viewer.context.items.ifcModels.push(subset);
        viewer.IFC.context.scene.add(subset);
      } else {
        await subset.removeFromParent(); // Does not work in the current versions of ifc packages
      }
    });
  }
}
