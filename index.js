// index.js

// /////////////////////////////////////////////////////////////////////////////////////////////
// Libraries
const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require("axios");

// /////////////////////////////////////////////////////////////////////////////////////////////
// Paths
const companiesListPath = "dataIn/au_companies.html";
const exportDetailsPath = "dataIn/details";
const exportPathJson = "dataOut/au_companies.json";
const exportPathCsv = "dataOut/au_companies.csv";

// /////////////////////////////////////////////////////////////////////////////////////////////
// METHODS

// Function to convert data to CSV format
function arrayToCSV(objArray) {
  const array = [Object.keys(objArray[0])].concat(objArray);
  return array
    .map((it) => {
      return Object.values(it)
        .map(
          (field) => `"${field.toString().replace(/"/g, '""')}"` // Handle quotes in data
        )
        .join(",");
    })
    .join("\r\n");
}

// Delay function
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to fetch and extract structured data from a URL
async function fetchStructuredData(url) {
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const scripts = dom.window.document.querySelectorAll(
      'script[type="application/ld+json"]'
    );

    // Assuming there's only one <script type="application/ld+json"> tag per page
    if (scripts.length > 0) {
      const jsonData = JSON.parse(scripts[0].textContent);
      return jsonData;
    }

    return null;
  } catch (error) {
    console.error("Error fetching or parsing structured data:", error);
    return null;
  }
}

// Function to process URL and save the results to a JSON file
async function processUrl(id, url) {
  console.log(`Processing | ID: ${id} | URL: ${url}`);
  const exportFilePath = `${exportDetailsPath}/${id}.json`;

  // Check if the file exists
  if (fs.existsSync(exportFilePath)) {
    console.log("\t> File exists, reading from path...");
    const data = JSON.parse(fs.readFileSync(exportFilePath, "utf8"));
    // Wait a bit even if cached to mimic network delay and avoid quick re-runs
    await delay(500);
    return data;
  } else {
    console.log("\t> Fetching new data from URL...");
    // Fetch and parse structured data
    const data = await fetchStructuredData(url);

    // Check if data is not null or undefined before writing to file
    if (data) {
      fs.writeFileSync(exportFilePath, JSON.stringify(data, null, 2), "utf8");
      console.log("\t> Data saved to file:", exportFilePath);
    } else {
      console.log("\t> No data received for URL:", url);
    }

    // Delay for 1/2 second after fetching data
    await delay(500);
    return data;
  }
}

// /////////////////////////////////////////////////////////////////////////////////////////////
// MAIN Function

// Main function
async function main() {
  // Load the HTML file (make sure the path is correct)
  const htmlContent = fs.readFileSync(companiesListPath, "utf8");

  // Parse the HTML content
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Extract data from each .category_list_bus_item
  const companyPromises = Array.from(
    document.querySelectorAll(".category_list_bus_item")
  ).map(async (item) => {
    const companyId = item.getAttribute("id");
    const companyName = item.querySelector("h2 a").textContent.trim();
    const companyUrl = item.querySelector("h2 a").href;

    // get details
    // Assuming processUrl fetches additional details asynchronously
    const companyDetails = await processUrl(companyId, companyUrl);

    return {
      companyId,
      companyName,
      companyUrl,
      ...companyDetails, // processUrl returns an object with address, phone, description
    };
  });

  // Wait for all promises to resolve
  const companyData = await Promise.all(companyPromises);

  // Print extracted data
  console.log(`\nDONE:Extracted ${companyData.length} companies.`);

  // Write data to JSON file
  fs.writeFileSync(exportPathJson, JSON.stringify(companyData, null, 2));
  // Write data to CSV file
  //   fs.writeFileSync(exportPathCsv, arrayToCSV(companyData));
}

// /////////////////////////////////////////////////////////////////////////////////////////////
// RUN MAIN
main().catch(console.error); // Handling errors and starting the main function
