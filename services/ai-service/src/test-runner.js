import fs from 'fs';
import path from 'path';

// Define the 60 E2E questions
const testCases = [
  // 1-10: Location Searches
  { id: 1, query: "Show me tenders in Savar.", expected: ["T-987412"] },
  { id: 2, query: "Are there any notices in Cox's Bazar?", expected: ["T-201569", "T-102938"] }, // Cox's Bazar / Teknaf
  { id: 3, query: "Find all tenders from Sylhet district.", expected: ["T-365214"] },
  { id: 4, query: "Any projects in Khulna?", expected: ["T-115222"] },
  { id: 5, query: "Tenders in Sunamganj.", expected: ["T-448210"] },
  { id: 6, query: "Bagerhat area er notice list dao.", expected: ["T-609214"] },
  { id: 7, query: "Teknaf er notice gula dekhaw.", expected: ["T-102938"] },
  { id: 8, query: "Dhaka district details tender.", expected: ["T-852140", "T-741029"] },
  { id: 9, query: "Chattogram local areas tender notices.", expected: ["T-541298"] },
  { id: 10, query: "Is there anything in Magura or Jashore or Khulna?", expected: ["T-115222"] },

  // 11-20: Procurement Organizations
  { id: 11, query: "Tenders published by PWD.", expected: ["T-365214"] },
  { id: 12, query: "LGED procurement notices.", expected: ["T-987412", "T-115222", "T-448210"] },
  { id: 13, query: "Find notices from Bangladesh Computer Council.", expected: ["T-852140"] },
  { id: 14, query: "PHE department tenders.", expected: ["T-102938"] },
  { id: 15, query: "BREB organization electrical notice.", expected: ["T-609214"] },
  { id: 16, query: "Is there any notice from Bangladesh Power Development Board?", expected: ["T-541298"] },
  { id: 17, query: "Dhaka City Corporation tenders.", expected: ["T-201569"] },
  { id: 18, query: "Bangladesh Hi-Tech Park Authority portal tender.", expected: ["T-741029"] },
  { id: 19, query: "Sylhet PWD drugs notice.", expected: ["T-365214"] },
  { id: 20, query: "Khulna LGED road reconstruction work.", expected: ["T-115222"] },

  // 21-30: Categories and Keywords
  { id: 21, query: "Building Construction category works.", expected: ["T-987412"] },
  { id: 22, query: "Computer server procurement.", expected: ["T-852140"] },
  { id: 23, query: "Tenders related to Road Construction.", expected: ["T-115222"] },
  { id: 24, query: "Medical equipment and drugs tenders.", expected: ["T-365214"] },
  { id: 25, query: "Sub-station testing commissioning works.", expected: ["T-541298"] },
  { id: 26, query: "Solar LED light installation.", expected: ["T-201569"] },
  { id: 27, query: "Girder bridge construction.", expected: ["T-448210"] },
  { id: 28, query: "Multi-tenant cloud ERP software.", expected: ["T-741029"] },
  { id: 29, query: "Deep tube-well water pipeline installation.", expected: ["T-102938"] },
  { id: 30, query: "Heavy duty electrical transformer supply.", expected: ["T-609214"] },

  // 31-45: Dates (Current Reference Wednesday, May 27, 2026)
  { id: 31, query: "Is there any notice published yesterday?", expected: ["T-201569"] }, // May 26
  { id: 32, query: "Are there any tenders closing tomorrow?", expected: ["T-115222"] }, // May 28
  { id: 33, query: "Show me tenders closing on 30 May 2026.", expected: ["T-609214"] }, // May 30
  { id: 34, query: "Tenders published between 20 May and 24 May 2026.", expected: ["T-987412", "T-852140", "T-741029"] },
  { id: 35, query: "Are there any notices published today?", expected: [] }, // None published May 27
  { id: 36, query: "Bagerhat notice closing in 3 days.", expected: ["T-609214"] }, // May 30
  { id: 37, query: "Tenders closing within next 7 days.", expected: ["T-115222", "T-609214"] }, // Closing May 28, May 30
  { id: 38, query: "Notices published on May 22, 2026.", expected: ["T-741029"] },
  { id: 39, query: "Tender notices published on 25 May.", expected: ["T-365214"] },
  { id: 40, query: "Is there any notice closing on 15 June 2026?", expected: ["T-987412"] },
  { id: 41, query: "Tenders closing on June 10.", expected: ["T-852140"] },
  { id: 42, query: "Notices published from 15 May to 19 May 2026.", expected: ["T-541298", "T-448210", "T-102938"] },
  { id: 43, query: "Show notices published before 12 May 2026.", expected: ["T-609214"] }, // May 10
  { id: 44, query: "Any notices published on 26 May?", expected: ["T-201569"] },
  { id: 45, query: "Tenders closing on June 25.", expected: ["T-365214"] },

  // 46-60: Mixed / Bilingual / Multi-filter
  { id: 46, query: "Sylhet district absolute drugs notice by PWD.", expected: ["T-365214"] },
  { id: 47, query: "Dhaka area high tech park authority software tender.", expected: ["T-741029"] },
  { id: 48, query: "Cox's Bazar area te PHE er high-yield tube-well tender ache?", expected: ["T-102938"] },
  { id: 49, query: "আজকে কি PWD এর কোনো নতুন টেন্ডার নোটিস পাবলিশ হয়েছে?", expected: [] },
  { id: 50, query: "গতকাল কক্সবাজার থেকে কোন টেন্ডার নোটিস এসেছে?", expected: ["T-201569"] },
  { id: 51, query: "আগামীকাল বন্ধ হবে এমন কোনো LGED টেন্ডার আছে?", expected: ["T-115222"] },
  { id: 52, query: "BCC company hardware server computer setup.", expected: ["T-852140"] },
  { id: 53, query: "চট্টগ্রামে বিদ্যুৎ উন্নয়ন বোর্ডের সাবস্টেশন টেন্ডার।", expected: ["T-541298"] },
  { id: 54, query: "সুনামগঞ্জে ব্রিজ নির্মাণের টেন্ডার নোটিস।", expected: ["T-448210"] },
  { id: 55, query: "Savar Upazila parishad administrative building by LGED.", expected: ["T-987412"] },
  { id: 56, query: "Bagerhat dynamic electrical transformer of BREB closing in 3 days.", expected: ["T-609214"] },
  { id: 57, query: "Road construction tender in Khulna closing tomorrow.", expected: ["T-115222"] },
  { id: 58, query: "Software app development by Hi-Tech Park in Dhaka.", expected: ["T-741029"] },
  { id: 59, query: "Essential life saving drugs in Sylhet PWD.", expected: ["T-365214"] },
  { id: 60, query: "Dhaka national data center server system by BCC.", expected: ["T-852140"] }
];

async function runTests() {
  const endpoint = 'http://127.0.0.1:3004/api/ai/chat';
  console.log(`🚀 Starting HTTP E2E test run for 60 variation queries via ${endpoint}...`);
  
  let passedCount = 0;
  let failedCount = 0;
  const results = [];

  for (const tc of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🧪 Test #${tc.id}: "${tc.query}"`);
    console.log(`Expected Tenders: ${JSON.stringify(tc.expected)}`);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: tc.query, history: [] })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error status: ${response.status}`);
      }

      const responseBody = await response.json();
      const matchedIds = responseBody.tenders.map(t => t.id);
      
      console.log(`Actual Matches: ${JSON.stringify(matchedIds)}`);
      
      // Determine pass condition: all expected IDs must be present in matchedIds.
      // If expected is empty, actual must be empty too.
      let passed = true;
      if (tc.expected.length === 0) {
        passed = matchedIds.length === 0;
      } else {
        passed = tc.expected.every(id => matchedIds.includes(id));
      }

      if (passed) {
        console.log(`✅ PASS`);
        passedCount++;
      } else {
        console.log(`❌ FAIL`);
        console.log('Debug logs for failure:', JSON.stringify(responseBody.debug, null, 2));
        failedCount++;
      }

      results.push({
        id: tc.id,
        query: tc.query,
        expected: tc.expected,
        actual: matchedIds,
        passed,
        debug: responseBody.debug
      });

    } catch (error) {
      console.error(`💥 CRITICAL ERROR executing Test #${tc.id}:`, error);
      failedCount++;
      results.push({
        id: tc.id,
        query: tc.query,
        expected: tc.expected,
        actual: [],
        passed: false,
        error: error.message
      });
    }
  }

  console.log(`\n==================================================`);
  console.log(`🏁 Test Summary:`);
  console.log(`Total Tried: ${testCases.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Success Rate: ${((passedCount / testCases.length) * 100).toFixed(2)}%`);
  console.log(`==================================================`);

  // Write results to JSON file
  fs.writeFileSync(
    path.join(process.cwd(), 'src/e2e-results.json'),
    JSON.stringify({ summary: { total: testCases.length, passed: passedCount, failed: failedCount }, results }, null, 2)
  );

  process.exit(failedCount > 0 ? 1 : 0);
}

runTests().catch(console.error);
