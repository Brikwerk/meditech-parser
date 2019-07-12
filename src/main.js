window.onload = function() {
  // Checking for IE
  checkIEWarnings();
  //Registering drag and drop handler
  document.getElementById("file").addEventListener('change', readFile, false);
}

/**
 * Checks for IE.
 */
function checkForIE() {
  const ua = window.navigator.userAgent;
  const msie = ua.indexOf('MSIE ');
  const trident = ua.indexOf('Trident/');
  const edge = ua.indexOf('Edge/');

  if (msie > 0 || trident > 0 || edge > 0) {
    return true;
  } else {
    return false;
  }
}

/**
 * Enables IE warnings if user is using IE.
 */
function checkIEWarnings() {
  if (checkForIE()) {
    // Getting all elements with IE class
    let elms = document.getElementsByClassName("enable-on-ie");
    // Showing all elements
    for (let i = 0; i < elms.length; i++) {
      elms[i].style.display = "block";
    }
  }
}

/**
 * Inits a counter that calls a function when finished.
 * @param {int} limit - Number of times before callback is called
 * @param {object} callback - Callback function
 */
function makeCounter(limit, callback) {
  return function () {
    if (--limit === 0) {
      callback();
    }
  }
}

/**
 * Event handler that reads and begins parsing dropped files.
 * @param {object} e - Drop event
 */
function readFile(e) {
  let files = e.target.files
  let texts = [];
  let filenames = [];
  let done = makeCounter(files.length, function () {
    parseText(texts, filenames);
  })
  for (let i = 0; i < files.length; i++) {
    let reader = new FileReader();
    reader.onload = function (event) {
      texts.push(event.target.result);
      done();
    }
    filenames.push(files[i].name);
    reader.readAsText(files[i])
  }
}

/**
 * Begins parsing of uploaded Meditech output.
 * @param {objects} texts - List of text files to parse
 * @param {object} filenames - List of filenames
 */
function parseText(texts, filenames) {
  let filename;
  let parsedData = {};
  try {
    // Parsing meditech output
    for (i = 0; i < texts.length; i++) {
      filename = filenames[i];
      console.info("\nParsing File: " + filename);

      // Data prep
      let text = texts[i];
      let data = {};
      // Stripping Windows-style returns
      text = text.replace(/\r/g, "");
      // Stripping out form feeds
      text = text.replace(/\f/g, "");
      // Ensuring system name is parseable
      text = text.replace(/  ITS /g, ' ITS ');
      let lines = text.split("\n");
      let sections = text.split("DATE: ");
      sections.shift();

      // Begin parsing
      // Checking for a valid report
      if (!validReport(lines)) {
        console.error(filename + " is not a valid report. Skipping...");
        break;
      }

      // Get report type and formatting type
      console.info("Retrieving Report Type");
      data["reportType"] = getReportType(lines, data);
      console.info("Retrieving Formatting Type");
      data["formattingType"] = getFormattingTypeAndMetaRows(lines, data);

      // Get report metadata
      console.info("Retrieving Report Metadata");
      getData(sections, data);

      // Convert to CSV string
      csv = createCSVString(data);
      parsedData[filename] = csv;

      console.log("--------------- Finished Parsing File ---------------");
    }
    saveFilesAsCSV(parsedData);
  } catch (e) {
    displayError(e, filename);
  }
}

/**
 * Displays and throws error.
 * @param {object} e - Error
 */
function displayError(e, filename) {
  let errDisplay = document.getElementById("error-display");
  errDisplay.innerHTML = "<strong class='inline-tag error-tag'>ERROR:"; // Erasing any previous errors
  let errorMessage = document.createTextNode(filename + " - " + e.name + ": " + e.message);
  errDisplay.appendChild(errorMessage);
  errDisplay.style.display = "block";
  throw e;
}

/**
 * Transforms formatted JSON data into a comma delimited CSV string
 * @param {JSON} data - JSON data to be transformed into a CSV format
 * @returns {string} - CSV formatted string, delimited by commas
 */
function createCSVString(data) {
  let csv = "";

  // Header
  csv += "Report: ," + data.reportName + "\n";
  csv += "Authority: ," + data.authority + "\n";
  csv += "Date Created: ," + data.dateCreated + "\n";
  csv += "User: ," + data.user + "\n";
  csv += "Date Range: ," + data.dateRangeStart + " - " + data.dateRangeEnd + '\n';
  csv += "Departments: ," + data.departments + "\n";
  csv += ",\n"

  // Sections
  for (let i = 0; i < data["sectionNames"].length; i++) {
    section = data[data.sectionNames[i]];
    if (data.reportType === "CATEGORY") {
      csv += "CATEGORY: ," + data.sectionNames[i] + "\n";
      subsectionCol = "SITE";
    } else {
      csv += "SITE: ," + data.sectionNames[i] + "\n";
      subsectionCol = "CATEGORY";
    }
    // Subsections
    for (let j = 0; j < section["subsectionNames"].length; j++) {
      subsection = section["subsectionNames"][j];
      csv += subsectionCol + "," + subsection + "\n";
      // Writing out data
      csv += section[subsection]["columns"].join() + "\n";
      for (let k = 0; k < section[subsection]["data"].length; k++) {
        csv += section[subsection]["data"][k].join() + "\n";
      }
      // Subsection total
      if (section[subsection]["total"] !== undefined) {
        csv += "TOTAL\n";
        let totalString = section[subsection]["total"].join() + "\n";
        // Adding repeating columns to total string
        for (let l = 0; l < NUM_OF_REPEATING_COLS; l++) {
          totalString = "," + totalString;
        }
        csv += totalString;
      }
    }
    // Subsection grand total
    if (section["grandTotal"] !== undefined) {
      csv += "GRAND TOTAL\n";
      let grandTotalString = section["grandTotal"].join() + "\n";
      // Adding repeating columns to grand total string
      for (let l = 0; l < NUM_OF_REPEATING_COLS; l++) {
        grandTotalString = "," + grandTotalString;
      }
      csv += grandTotalString;
    }
    // Materials and rate
    if (section["totalMaterials"] !== undefined) {
      csv += "TOTAL MATERIALS: ," + section["totalMaterials"] + "\n";
    }
    if (section["rate"] !== undefined) {
      csv += "REPEAT/REJECT RATE: ," + section["rate"] + "\n";
    }
    csv += ",\n";
  }

  return csv;
}

/**
 * Transforms the JSON Meditech data into a CSV string and prompts a save with a CSV file
 * @param {JSON} parsedData - JSON data with the formatted Meditech data
 */
function saveFilesAsCSV(parsedData) {
  // Creating CSV
  let csv = "";
  let filenames = Object.keys(parsedData).sort();
  for (i = 0; i < filenames.length; i++) {
    let filename = filenames[i];
    let parsedText = parsedData[filename];
    csv += "Filename:," + filename + "\n";
    csv += parsedText + "\n\n";
  }
  // Prompting client save
  console.log("Saving compiled CSV");
  let content = new Blob([csv], {type: "text/plain;charset=utf-8"});
  let milliseconds = (new Date).getTime();
  saveAs(content, "parsed-content-" + milliseconds + ".csv");
}

/**
 * Transforms the JSON Meditech data into a CSV string and prompts a save with a zip
 * @param {JSON} parsedData - JSON data with the formatted Meditech data
 */
function saveFilesAsZip(parsedData) {
  // Creating zip
  let zip = new JSZip();
  let filenames = Object.keys(parsedData).sort();
  for (i = 0; i < filenames.length; i++) {
    let filename = filenames[i];
    let parsedText = parsedData[filename];
    let csvName = filename + '.csv';

    // Adding file to zip
    zip.file(csvName, parsedText);
  }
  // Zipping and prompting client save
  console.log("Created zip");
  zip.generateAsync({ type: "blob" })
    .then(function (content) {
      let milliseconds = (new Date).getTime();
      saveAs(content, "parsed-content-" + milliseconds + ".zip");
    });
}
