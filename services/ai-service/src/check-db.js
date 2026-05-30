import { initializeDatabase, getCollection, closeDatabase } from './db.js';

async function main() {
  await initializeDatabase();
  const tenders = getCollection('tenders');
  const allTenders = await tenders.find({}).toArray();
  console.log(`Total tenders: ${allTenders.length}`);
  console.log('Sample tenders:');
  for (const t of allTenders) {
    console.log(`- ${t.id}: "${t.title}" in ${t.district} | Org: ${t.organization} | Cat: ${t.category} | Pub: ${t.publishedDate} | Close: ${t.closingDate} | Status: ${t.status}`);
  }
  await closeDatabase();
}

main().catch(console.error);
