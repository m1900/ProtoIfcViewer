import { IFCBUILDINGSTOREY } from "web-ifc";

import { toFixedImproved } from "../utils.js";

export async function setupStoreys(viewer, document, modelID, subsets) {
  const storeys = await viewer.IFC.getAllItemsOfType(
    modelID,
    IFCBUILDINGSTOREY
  );

  const storeysByID = {};

  // console.log("Storeys: " + storeys);
  for (let i = 0; i < storeys.length; i++) {
    const storeyID = storeys[i];
    const storeyProperties = await viewer.IFC.getProperties(modelID, storeyID);
    if (!storeyProperties) {
      continue;
    }
    // console.log(JSON.stringify(storeyProperties, null, 2));
    console.log("Elevation value: %s", storeyProperties.Elevation.value);
    storeysByID[storeyID] = storeyProperties;
  }

  // Sort the storeys from bottom to top.
  const storeysByLevel = Object.values(storeysByID);
  storeysByLevel.sort(function (a, b) {
    return a.Elevation.value > b.Elevationvalue;
  });

  const checkboxContainer = document.getElementById("storey-checkboxes");
  // Clear checkboxes of old model.
  checkboxContainer.innerHTML = "";

  const checkboxIDsAndStoreys = {};

  for (let i = 0; i < storeysByLevel.length; i++) {
    const storey = storeysByLevel[i];
    const checkboxID = addCheckbox(storey, checkboxContainer, i);
    checkboxIDsAndStoreys[storey.expressID] = checkboxID;

    console.log(
      "Storey [%s], check box ID %s",
      storey.LongName.value,
      checkboxID
    );
  }

  for (let i = 0; i < storeysByLevel.length; i++) {
    const storey = storeysByLevel[i];
    const checkboxID = checkboxIDsAndStoreys[storey.expressID];

    console.log(
      "[%s], %s elevation %s, check box %s",
      storey.expressID,
      storey.LongName.value,
      toFixedImproved(storey.Elevation.value / 10000.0, 3),
      checkboxID
    );
    await setupStorey(storey, modelID, viewer, document, subsets, checkboxID);
  }
}

// Creates a new subset and configures the checkbox
async function setupStorey(
  storey,
  modelID,
  ifcViewer,
  document,
  subsets,
  checkboxID
) {
  const subset = await newSubsetOfType(storey, modelID, ifcViewer);
  subsets[storey.expressID] = subset;
  // console.log("Items for category %s: %s", getName(category), JSON.stringify(subsets[category], null, 2));
  connectCheckboxToEvent(storey, checkboxID, document, subsets, ifcViewer);
}

// Creates a new subset containing all elements of a storey
async function newSubsetOfType(storey, modelID, viewer) {
  //const ids = await getAll(storey);
  return viewer.IFC.loader.ifcManager.createSubset({
    modelID: modelID,
    ids: [storey.expressID],
    removePrevious: true, // nakijken of dit nodig is om meerdere subsets naast elkaar te laten staan
    customID: storey.LongName.value,
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

function connectCheckboxToEvent(storey, checkBoxID, document, subsets, viewer) {
  const name = storey.LongName.value;
  //console.log("Called connectCheckboxToEvent for storey ", name);

  const checkBox = document.getElementById(checkBoxID);
  if (checkBox) {
    checkBox.addEventListener("change", async (event) => {
      const checked = event.target.checked;
      const subset = subsets[storey.expressID];
      //   console.log(
      //     "Subset for storey %s: %s",
      //     storey.LongName.value,
      //     JSON.stringify(subset, null, 2)
      //   );
      if (checked) {
        viewer.context.items.ifcModels.push(subset);
      } else {
        await subset.removeFromParent(); // Does not work in the current versions of ifc packages
      }
    });
  }
}
