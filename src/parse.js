// Constants
const ACCEPTED_REPORTS = [
  "REPEAT/REJECT STATISTICS"
];
const ACCEPTABLE_HEADERS = [
  "CATEGORY",
  "SITE"
];
const SUBSECTION_ID_FILTER = [
  "REPEAT/REJECT RATE:",
  "TOTAL MATERIALS:   ",
  "GRAND TOTAL        ",
  "TOTAL              "
];
const UNACCEPTABLE_DATA = [
  "TOTAL",
  "GRAND TOTAL",
  "",
  undefined,
  " "
]
const UNACCEPTABLE_COLUMNS = [
  "",
  undefined,
  " ",
  "ooo",
  "---"
]
const NUM_OF_REPEATING_COLS = 2;

/**
 * Checks if the report is an acceptable format.
 * @param {array} lines - Array of lines from the report
 */
function validReport(lines) {
  reportKind = lines[1].split(/  +/g)[1];
  console.log("Report Kind: " + reportKind);
  if (ACCEPTED_REPORTS.includes(reportKind)) {
    return true;
  } else {
    return false;
  }
}

/**
 * Gets the type of Meditech report.
 * @param {string} text - String of the full text file to parse
 */
function getReportType(lines) {
  // Category type report will have an extra line in the header with the category
  // Site type report will not have the category line
  console.log("Retrieving cateogry line...")
  let categoryLine = lines[5].split(/ +/g);
  categoryLine.shift(); // Getting rid of blank space on empty line
  console.log(categoryLine);
  if (categoryLine.length > 0 && categoryLine[0] === "CATEGORY:") {
    console.log("Report is format type CATEGORY");
    return "CATEGORY";
  } else {
    console.log("Report is format type SITE");
    return "SITE";
  }
}

/**
 * Gets the formatting type for the tables within the report and the data/col row indexes
 * @param {array} lines - An array of lines from the report
 * @param {object} data - A JSON object that houses data on the current file
 */
function getFormattingTypeAndMetaRows(lines, data) {
  // O-type will have OOOO
  // Dash-type will have ----
  // Iterating over lines searching for header line
  console.log("Searching for acceptable header");
  for (let i = 0; i < lines.length; i++) {
    line = lines[i].split(/ +/g);
    if (ACCEPTABLE_HEADERS.indexOf(line[0]) >= 0) {
      console.log("Found acceptable header in the following line:");
      console.log(line);

      // Getting data/col line index info
      console.log("Saving column line index of " + (i+1), lines[i+1]);
      data["colIndex"] = i+1;
      let offset = 3;
      console.log("Saving data start line index of " + (i+offset), lines[i+offset]);
      data["dataStartIndex"] = i+offset;
      
      console.log("Checking formatting type")

      // Extracting first four chars from separator
      let formatString = line[1].slice(0, 4);
      console.log("Format String: " + formatString);
      if (formatString === "----") {
        console.log("Formatting is type dash");
        return "-";
      } else {
        console.log("Formatting is type O");
        return "O";
      }
    }
  }
  throw new Error("Report formatting could not be identified");
}

function getData(sections, data) {
  console.log("Getting header:")
  getHeader(sections[0], data);

  ensurePropertyExists(data, "sectionNames", []);

  let sectionID;
  let lastSectionID;
  // Ensuring subsectionID is accessible between sections
  // as sections don't always have a subsection label, thus,
  // we use the previous one.
  let subsectionID;
  let lastsubsectionID;
  for (let i = 0; i < sections.length; i++) {
    console.log("-- Beginning Section Parse... --");
    let lines = sections[i].split(/\n/g);

    // Getting section ID depending on report type
    if (data["reportType"] === "CATEGORY") {
      sectionID = getWords(lines[5])[0].split(": ")[1];
    } else {
      sectionID = getWords(lines[4])[0].split(": ")[1];
    }
    console.log("SectionID: " + sectionID);
    ensurePropertyExists(data, sectionID, {});
    // Record section ID if we haven't seen it before
    if (!data["sectionNames"].includes(sectionID)) {
      data["sectionNames"].push(sectionID);
    }

    // Iterating over data lines
    for (let j = data["dataStartIndex"]; j < lines.length; j++) {
      let rowType = getRowType(lines[j]);
      if (rowType === "SUBSECTION") {
        header = lines[j].split(/  +/g)[0];
        subsectionID = header;

        ensurePropertyExists(data[sectionID], "subsectionNames", []);
        // Record subsection ID if we haven't seen it before
        console.log(data[sectionID]["subsectionNames"]);
        if (!data[sectionID]["subsectionNames"].includes(subsectionID)) {
          data[sectionID]["subsectionNames"].push(subsectionID);
          console.log(subsectionID);
        }

        ensurePropertyExists(data[sectionID], subsectionID, {});
        ensurePropertyExists(data[sectionID][subsectionID], "rowCount" , 0);
        ensurePropertyExists(data[sectionID][subsectionID], "firstPass" , true);

        getColumns(lines, data[sectionID][subsectionID], data["colIndex"]);

        // Saving section/subsection we're counting
        lastsubsectionID = subsectionID;
        lastSectionID = sectionID;
      // Row Data
      } else if (rowType === "DATA") {
        ensurePropertyExists(data[sectionID][subsectionID], "data", []);
        dataValues = filterValues(lines[j].split(/  +/g));
        if (data[sectionID][subsectionID]["firstPass"] === true) {
          console.log(dataValues);
          data[sectionID][subsectionID]["data"].push(dataValues); 
        } else {
          dataValues = dataValues.slice(NUM_OF_REPEATING_COLS, dataValues.length);
          console.log(dataValues);
          index = data[sectionID][subsectionID]["rowCount"]
          data[sectionID][subsectionID]["data"][index] = data[sectionID][subsectionID]["data"][index].concat(dataValues);
          data[sectionID][subsectionID]["rowCount"]++;
        }
      // Total data for section/subsection
      } else if (rowType === "TOTAL") {
        // A total row signals the end of a subsection
        // If we were counting a section before and it's not already locked,
        // lock it to signal the first pass is done
        if (lastSectionID && lastsubsectionID && data[lastSectionID][lastsubsectionID]["firstPass"]) {
          console.log("Locking " + lastSectionID + ", " + lastsubsectionID);
          data[lastSectionID][lastsubsectionID]["firstPass"] = false;
        }

        totalData = filterValues(lines[j].split(/  +/g));
        if (data[sectionID][subsectionID]["total"] !== undefined) {
          data[sectionID][subsectionID]["total"] = data[sectionID][subsectionID]["total"].concat(totalData);
        } else {
          data[sectionID][subsectionID]["total"] = totalData;
        }
      // Grand total for section
      } else if (rowType === "GRAND TOTAL") {
        grandTotalData = filterValues(lines[j].split(/  +/g));
        if (data[sectionID]["grandTotal"] !== undefined) {
          data[sectionID]["grandTotal"] = data[sectionID]["grandTotal"].concat(grandTotalData);
        } else {
          data[sectionID]["grandTotal"] = grandTotalData;
        }
      // Total num of materials for section
      } else if (rowType === "TOTAL MATERIALS") {
        totalMaterials = lines[j].split(/ +/g)[2];
        data[sectionID]["totalMaterials"] = totalMaterials;
      // Repeat/reject rate
      } else if (rowType === "REPEAT/REJECT RATE") {
        rate = lines[j].split(/ +/g)[2];
        data[sectionID]["rate"] = rate;
      }
    }
  }
  console.log(data);
}

function getHeader(section, data) {
  let words = getWords(section.replace(/\n/g, "  "));
  data.dateCreated = parseTime(words[0]);
  data.authority = words[1];
  data.user = words[3].split(":")[1];
  data.reportName = words[4];
  data.dateRangeStart = parseTime(words[5].split(" - ")[0].split(":")[1]);
  data.dateRangeEnd = parseTime(words[5].split(" - ")[1]);
  data.departments = words[6].split(":")[1];
}

function getWords(text) {
  return text.split(/  +/g).filter(function(word) {
    return !(word === '' || word === null || word === undefined);
  });
}

/**
 * Converts formatted datetime string to a JavaScript datetime object.
 * @param {string} datetimeString - String with date and time in either 'dd/mm/yy' format or 'dd/mm/yy @ hhmm' format
 */
function parseTime(datetimeString) {
  let datetime;
  if (datetimeString.indexOf("@") >= 0) {
    // Datetime string contains time
    dateComps = datetimeString.split(" @ ")[0].split("/");
    timeComps = [
      datetimeString.split(" @ ")[1].substring(0,2),
      datetimeString.split(" @ ")[1].substring(2,4)
    ];
    datetime = new Date(
      parseInt('20' + dateComps[2]), // Year -> Adding 20 as year doesn't include 20
      parseInt(dateComps[1]) - 1, // Month -> Watch out, January = 0
      parseInt(dateComps[0]), // Day
      parseInt(timeComps[0]), // Hour
      parseInt(timeComps[1]) // Minute
    );
  } else {
    dateComps = datetimeString.split(" @ ")[0].split("/");
    datetime = new Date(
      parseInt('20' + dateComps[2]), // Year -> Adding 20 as year doesn't include 20
      parseInt(dateComps[1]) - 1, // Month -> Watch out, January = 0
      parseInt(dateComps[0]), // Day
    );
  }
  return datetime;
}

function getRowType(line) {
  leftPadding = line.substring(0, 2); // First chars of line
  // Figuring out what the line is
  // Row heading, Total, or Other Info Identification
  if (!(leftPadding === "  " || leftPadding === "" || leftPadding === "--" || leftPadding === "oo")) {
    let headerTest = line.substring(0, 19); // Grab full(er) header
    // Checking for acceptable subsections
    if (!(SUBSECTION_ID_FILTER.includes(headerTest))) {
      return "SUBSECTION";
    } else {
      // If it's not a subsection, return a cleaned title
      return headerTest.replace(":", "").replace(/  +/g,"");
    }
  // Row Data
  } else if (leftPadding === "  ") {
    return "DATA";
  } else {
    return "OTHER";
  }
}

/**
 * Checks if a property exists in a JSON object. If not, it is created.
 * @param {object} object - JSON object
 * @param {string} property - JSON object key
 * @param {any} value - Value to assigned to the key if it's not instantiated
 */
function ensurePropertyExists(object, property, value) {
  if (typeof object[property] === "undefined") {
    object[property] = value;
  }
}

function getColumns(lines, subsectionData, colIndex) {
  ensurePropertyExists(subsectionData, "columns", []);
  let columns = lines[colIndex].split(/ +/g);
  columns.shift(); // Removing leading space item

  columns = columns.filter(function(column) {
    if (UNACCEPTABLE_COLUMNS.includes(column)) {
      return false;
    } else {
      return true;
    }
  });

  // Checking if we've stored the columns
  if (subsectionData["firstPass"] === true) {
    subsectionData["columns"] = columns;
  } else {
    columns = columns.slice(NUM_OF_REPEATING_COLS, columns.length);
    subsectionData["columns"] = subsectionData["columns"].concat(columns);
  }
  console.log("Subsection Columns:")
  console.log(subsectionData["columns"]);
}

function filterValues(vals) {
  vals = vals.filter(function (val) {
    if (UNACCEPTABLE_DATA.includes(val) || val.indexOf("%") >= 0) {
      return false;
    } else {
      return true;
    }
  });
  return vals;
}
