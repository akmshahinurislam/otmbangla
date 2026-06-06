import { processAiQuery } from '../src/ai.js';
import { closeDatabase } from '../src/db.js';

async function runTests() {
  console.log("--- STARTING DIRECT AI SERVICE INTERCEPT TESTS ---");

  // Test Case 1: Ask about JV in Tender 232433
  console.log("\n[Test 1] Query: 'In this Tender 232433, Is JV allowed?'");
  try {
    const res1 = await processAiQuery("In this Tender 232433, Is JV allowed?", []);
    console.log("Response Message:\n", res1.message);
    console.log("Debug Steps:\n", JSON.stringify(res1.debug, null, 2));
  } catch (error) {
    console.error("Test 1 Failed:", error);
  }

  // Test Case 2: Ask about liquid assets in Tender 1284272 (the active analyzed tender)
  console.log("\n[Test 2] Query: 'What is the liquid assets limit for Tender 1284272?'");
  try {
    const res2 = await processAiQuery("What is the liquid assets limit for Tender 1284272?", []);
    console.log("Response Message:\n", res2.message);
    console.log("Debug Steps:\n", JSON.stringify(res2.debug, null, 2));
  } catch (error) {
    console.error("Test 2 Failed:", error);
  }

  console.log("\n--- END OF TESTS ---");
  process.exit(0);
}

runTests();
