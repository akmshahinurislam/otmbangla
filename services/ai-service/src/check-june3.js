import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uris = [
  process.env.MONGODB_URI,
  'mongodb://127.0.0.1:27017/otm_bangla_db'
].filter(Boolean);

async function checkDate() {
  const targetDate = '2026-06-03';
  console.log(`Checking database for tenders published on: ${targetDate}`);

  let client = null;
  let db = null;

  for (const uri of uris) {
    try {
      const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
      console.log(`🔌 Attempting connection to MongoDB at: ${maskedUri}`);
      client = await MongoClient.connect(uri, { connectTimeoutMS: 5000, serverSelectionTimeoutMS: 5000 });
      db = client.db();
      console.log(`✅ Connected successfully!`);
      break;
    } catch (err) {
      console.warn(`⚠️ Failed to connect using this URI: ${err.message}`);
    }
  }

  if (!db) {
    console.error('❌ Could not connect to any database instances.');
    process.exit(1);
  }

  try {
    const tendersCollection = db.collection('tenders');

    // Find documents matching the string date or standard Date range
    const query = {
      $or: [
        { publishedDate: targetDate },
        { publishedDate: new Date(targetDate) },
        {
          publishedDate: {
            $gte: `${targetDate}T00:00:00.000Z`,
            $lte: `${targetDate}T23:59:59.999Z`
          }
        }
      ]
    };

    const count = await tendersCollection.countDocuments(query);
    console.log(`\n📊 Total notices published on ${targetDate}: ${count}`);

    if (count > 0) {
      const samples = await tendersCollection.find(query).toArray();
      console.log('\nList of notices:');
      samples.forEach(t => {
        console.log(`- ID: ${t.id} | Title: "${t.title}" | District: ${t.district} | Org: ${t.organization}`);
      });
    }

  } catch (err) {
    console.error(`❌ Error querying collection:`, err);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkDate().catch(console.error);
