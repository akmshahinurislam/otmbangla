import fs from 'fs';
import path from 'path';

// Define the full 100 E2E questions
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
  { id: 60, query: "Dhaka national data center server system by BCC.", expected: ["T-852140"] },

  // 61-100: Risky / Edge Cases / Oversuring Queries
  { id: 61, query: "Tenders in Savar or Bagerhat.", expected: ["T-987412", "T-609214"] },
  { id: 62, query: "Find notices from BCC or BREB.", expected: ["T-852140", "T-609214"] },
  { id: 63, query: "Software & Website or Road Construction category.", expected: ["T-115222", "T-741029"] },
  { id: 64, query: "Council Computer Bangladesh setup solutions.", expected: ["T-852140"] },
  { id: 65, query: "Rural Electrification Board Bagerhat transformer.", expected: ["T-609214"] },
  { id: 66, query: "Power Development Board sub station Chattogram.", expected: ["T-541298"] },
  { id: 67, query: "Public Health Engineering Teknaf tube well.", expected: ["T-102938"] },
  { id: 68, query: "Show tenders closing on 20 June 2026.", expected: ["T-201569"] },
  { id: 69, query: "Notices closing on June 18.", expected: ["T-448210"] },
  { id: 70, query: "Tenders closing on 5 June 2026.", expected: ["T-102938"] },
  { id: 71, query: "Show me tenders closing on June 22.", expected: ["T-541298"] },
  { id: 72, query: "Are there any notices closing today?", expected: [] },
  { id: 73, query: "Notices published on May 10, 2026.", expected: ["T-609214"] },
  { id: 74, query: "Notices published on May 12.", expected: ["T-115222"] },
  { id: 75, query: "Notices published on 15 May.", expected: ["T-448210"] },
  { id: 76, query: "Notices published on 18 May.", expected: ["T-541298"] },
  { id: 77, query: "Notices published on 19 May 2026.", expected: ["T-102938"] },
  { id: 78, query: "Notices published on 20 May 2026.", expected: ["T-987412"] },
  { id: 79, query: "Notices published on 22 May 2026.", expected: ["T-741029"] },
  { id: 80, query: "Notices published on 24 May.", expected: ["T-852140"] },
  { id: 81, query: "Notices published on 25 May.", expected: ["T-365214"] },
  { id: 82, query: "Notices published on 26 May.", expected: ["T-201569"] },
  { id: 83, query: "Tenders closing on 25 June 2026.", expected: ["T-365214"] },
  { id: 84, query: "Tenders closing on 12 June 2026.", expected: ["T-741029"] },
  { id: 85, query: "Tenders closing on June 15.", expected: ["T-987412"] },
  { id: 86, query: "Tenders closing on June 20.", expected: ["T-201569"] },
  { id: 87, query: "Tenders closing on June 22.", expected: ["T-541298"] },
  { id: 88, query: "Notices published between 10 May and 18 May 2026 in Bagerhat or Chattogram.", expected: ["T-609214", "T-541298"] },
  { id: 89, query: "Notices published between 10 May and 18 May 2026 in Bagerhat or Chattogram or Dhaka.", expected: ["T-609214", "T-541298"] },
  { id: 90, query: "Are there any active tender opportunities from Higher Education Secondary Division?", expected: [] },
  { id: 91, query: "কক্সবাজার yesterday notice.", expected: ["T-201569"] },
  { id: 92, query: "Magura 28 May closing road.", expected: ["T-115222"] },
  { id: 93, query: "BCC enterprise cloud database computing.", expected: ["T-852140"] },
  { id: 94, query: "PHE deep well safe water drinking Teknaf.", expected: ["T-102938"] },
  { id: 95, query: "Rural Board steps down transformer.", expected: ["T-609214"] },
  { id: 96, query: "Health Drugs Life Saving Sylhet PWD.", expected: ["T-365214"] },
  { id: 97, query: "Solar light Hybrid poles City Corporation.", expected: ["T-201569"] },
  { id: 98, query: "PSC Girder Bridge Sunamganj LGED.", expected: ["T-448210"] },
  { id: 99, query: "Building Upazila administrative Savar LGED.", expected: ["T-987412"] },
  { id: 100, query: "Cloud Multi-Tenant ERP Portal Gateway.", expected: ["T-741029"] }
];

function escapeCSV(str) {
  if (typeof str !== 'string') return str;
  let clean = str.replace(/"/g, '""');
  if (clean.includes(',') || clean.includes('\n') || clean.includes('"')) {
    return `"${clean}"`;
  }
  return clean;
}

function generateCSV() {
  let csvContent = 'ID,Query,Expected Matches\r\n';
  for (const tc of testCases) {
    csvContent += `${tc.id},${escapeCSV(tc.query)},${escapeCSV(JSON.stringify(tc.expected))}\r\n`;
  }

  // Save to workspace root
  const workspacePath = path.join('f:\\OTMBangla-Main', 'ai_search_test_questions.csv');
  fs.writeFileSync(workspacePath, csvContent, 'utf-8');
  console.log(`✅ CSV successfully created at workspace path: ${workspacePath}`);

  // Save to Brain Artifact directory
  const brainDir = 'C:\\Users\\Masfia Computer\\.gemini\\antigravity-ide\\brain\\3b760a38-6d0b-4741-a856-66100b1b0cba';
  if (fs.existsSync(brainDir)) {
    const brainPath = path.join(brainDir, 'ai_search_test_questions.csv');
    fs.writeFileSync(brainPath, csvContent, 'utf-8');
    console.log(`✅ CSV successfully copied to brain artifact path: ${brainPath}`);
  }
}

generateCSV();
