// index.js

// /////////////////////////////////////////////////////////////////////////////////////////////
// Libraries
const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require("axios");
const { parse } = require("json2csv");

// /////////////////////////////////////////////////////////////////////////////////////////////
// Paths
const companiesListPath = "dataIn/au_companies.html";
const exportDetailsPath = "dataIn/details";
const exportPathJson = "dataOut/au_companies.json";
const exportPathCsv = "dataOut/au_companies.csv";

// /////////////////////////////////////////////////////////////////////////////////////////////
// Constants

// Flatten JSON and configure fields for CSV
const fields = [
  "companyId",
  "companyName",
  "companyUrl",
  "@context",
  "@type",
  "name",
  "image",
  "telephone",
  "address.@type",
  "address.streetAddress",
  "address.addressLocality",
  "address.addressRegion",
  "address.postalCode",
  "address.addressCountry",
  "geo.@type",
  "geo.latitude",
  "geo.longitude",
  "description",
  "logo",
  "sameAs",
  "url",
];

// /////////////////////////////////////////////////////////////////////////////////////////////
// METHODS

// Function to convert data to CSV format
function arrayToCSV(objArray) {
  const opts = { fields };

  try {
    const csv = parse(objArray, opts);

    return csv;
  } catch (err) {
    console.error("Error converting JSON to CSV", err);
  }
}

// Delay function
function delay(ms) {
  console.log(`Delaying for ${ms} milliseconds...\n`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to fetch and extract structured data from a URL
async function fetchStructuredData(url) {
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const scriptContent = dom.window.document.querySelector(
      'script[type="application/ld+json"]'
    ).textContent;

    // Replace new line characters with the escaped new line
    const cleanedScriptContent = scriptContent.trim();

    // Assuming there's only one <script type="application/ld+json"> tag per page
    // const jsonData = JSON.parse(cleanedScriptContent);
    return cleanedScriptContent;
  } catch (error) {
    console.error("\nError fetching or parsing structured data:\n", error);
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
    const rawData = fs.readFileSync(exportFilePath, "utf8");
    const cleanedData = rawData
      .replace(/\\n\s+/gm, "")
      .replace(/\\n\\t/gm, "")
      .replace(/\\t/gm, "")
      .replace(/\\n\\n/gm, "s")
      .replace(/\\"/gm, '"')
      .replace(/"{/gm, "{")
      .replace(/}"/gm, "}");

    // console.log(cleanedData);
    const data = JSON.parse(cleanedData);

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

    // parse data into JSON
    // return JSON.parse(data);
    await delay(1000);
    return null;
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

  // Initialize an array to hold the company data
  const companyData = [];

  // Get all category list bus items
  const items = Array.from(
    document.querySelectorAll(".category_list_bus_item")
  );

  // Process each item sequentially
  for (const item of items) {
    const companyId = item.getAttribute("id");
    const companyName = item.querySelector("h2 a").textContent.trim();
    const companyUrl = item.querySelector("h2 a").href;

    // Get details
    console.log(`Processing company ID: ${companyId}`); // Log which company is being processed
    const companyDetails = await processUrl(companyId, companyUrl);

    // Delay for 1 second after each request
    // await delay(1000);

    // If there are no details, return the original data
    if (companyDetails === null) {
      companyData.push({
        companyId,
        companyName,
        companyUrl,
      });
    } else {
      // Add additional details
      companyData.push({
        companyId,
        companyName,
        companyUrl,
        ...companyDetails, // processUrl returns an object with address, phone, description
      });
    }
  }

  // Print extracted data
  console.log(`\nDONE:Extracted ${companyData.length} companies.`);

  // Write data to JSON file
  fs.writeFileSync(exportPathJson, JSON.stringify(companyData, null, 2));
  console.log("\t> JSON file has been saved.");

  // Write data to CSV file
  fs.writeFileSync(exportPathCsv, arrayToCSV(companyData));
  console.log("\t> CSV file has been saved.");
}

// /////////////////////////////////////////////////////////////////////////////////////////////
// RUN MAIN
main().catch(console.error); // Handling errors and starting the main function
