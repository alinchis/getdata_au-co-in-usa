// test delay

// Delay function
function delay(ms) {
  console.log(`Delaying for ${ms} milliseconds...`);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testDelay() {
  console.log("Start delay");
  await delay(1000);
  console.log("End delay");
}

testDelay();
