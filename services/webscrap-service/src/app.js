import express from 'express';
import cors from 'cors';
import { getTendersCollection, getSubscriptionsCollection, getAppPackagesCollection, getEContractsCollection } from './db.js';
import { runScraper, runAPPScraper, runEContractsScraper } from './scraper.js';
import logger from './utils/logger.js';


const app = express();

app.use(cors());
app.use(express.json());

// 1. Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'webscrap-service' });
});

// 2. Main API endpoint to query tender notices dynamically
app.get('/api/tenders', async (req, res) => {
  try {
    const tendersCollection = getTendersCollection();
    /** @type {any} */
    const query = {};

    // A. Keyword search (ID, title, description)
    if (req.query.search) {
      const searchStr = String(req.query.search).trim();
      if (searchStr) {
        query.$or = [
          { id: { $regex: searchStr, $options: 'i' } },
          { title: { $regex: searchStr, $options: 'i' } },
          { description: { $regex: searchStr, $options: 'i' } }
        ];
      }
    }

    // B. Category filtering (supports multi-category matching)
    if (req.query.categories) {
      const cats = String(req.query.categories).split(',').filter(Boolean);
      if (cats.length > 0) {
        // Match direct category ID or parent G-code categories
        query.$or = query.$or || [];
        query.$or.push(
          { categoryId: { $in: cats } },
          { category: { $in: cats } }
        );
      }
    }

    // C. Organization filtering (supports multi-org matching)
    if (req.query.organizations) {
      const orgs = String(req.query.organizations).split(',').filter(Boolean);
      if (orgs.length > 0) {
        query.$or = query.$or || [];
        query.$or.push(
          { organizationId: { $in: orgs } },
          { organization: { $in: orgs } }
        );
      }
    }

    // D. District/Location filtering (supports multi-location matching)
    if (req.query.locations) {
      const locs = String(req.query.locations).split(',').filter(Boolean);
      if (locs.length > 0) {
        query.$or = query.$or || [];
        query.$or.push(
          { districtId: { $in: locs } },
          { district: { $in: locs } }
        );
      }
    }

    // E. Date filtering (perfectly aligned with frontend requirement)
    if (req.query.dateFrom) {
      const dateFrom = String(req.query.dateFrom);
      if (req.query.dateTo) {
        const dateTo = String(req.query.dateTo);
        // Date Range Search
        query.publishedDate = { $gte: dateFrom, $lte: dateTo };
      } else {
        // Single Date Search
        query.publishedDate = dateFrom;
      }
    }

    logger.info(`🔍 Querying tenders with filter: ${JSON.stringify(query)}`);
    
    let cursor = tendersCollection.find(query).sort({ publishedDate: -1 });
    
    if (req.query.limit) {
      const limit = parseInt(String(req.query.limit), 10);
      if (!isNaN(limit)) {
        cursor = cursor.limit(limit);
      }
    }
    
    if (req.query.skip) {
      const skip = parseInt(String(req.query.skip), 10);
      if (!isNaN(skip)) {
        cursor = cursor.skip(skip);
      }
    }

    const tenders = await cursor.toArray();
    res.json(tenders);
  } catch (error) {
    logger.error('🔥 Error fetching tenders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2.5. Fetch single tender notice by ID
app.get('/api/tenders/:id', async (req, res) => {
  try {
    const tendersCollection = getTendersCollection();
    const id = req.params.id;
    // The incoming ID can be like "ID-1284819" or "T-1284819" or "1284819"
    // Let's normalize it to find the matching tender.
    const normalizedId = id.toUpperCase().replace(/^ID-/, 'T-');
    const rawDigits = id.replace(/^(ID-|T-)/i, '');

    const tender = await tendersCollection.findOne({ 
      $or: [
        { id: id },
        { id: normalizedId },
        { id: `T-${rawDigits}` },
        { id: rawDigits }
      ]
    });

    if (!tender) {
      return res.status(404).json({ error: 'Tender notice not found' });
    }

    res.json(tender);
  } catch (error) {
    logger.error('🔥 Error fetching tender by ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2.6. Retrieve dynamic tender subscription alerts for a user
app.get('/api/alerts/subscription/:email', async (req, res) => {
  try {
    const subscriptionsCollection = getSubscriptionsCollection();
    const email = req.params.email.trim().toLowerCase();
    
    const subscription = await subscriptionsCollection.findOne({
      emails: email
    });
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.json(subscription);
  } catch (error) {
    logger.error('🔥 Error fetching subscription:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2.7. Setup dynamic tender subscription alerts
app.post('/api/alerts/subscribe', async (req, res) => {
  const { emails, whatsappNumbers, categories, organizations, locations } = req.body;

  if (!emails || !Array.isArray(emails) || emails.filter(Boolean).length === 0) {
    return res.status(400).json({ error: 'At least one active email address is required' });
  }

  if (
    (!categories || !Array.isArray(categories) || categories.filter(Boolean).length === 0) &&
    (!organizations || !Array.isArray(organizations) || organizations.filter(Boolean).length === 0) &&
    (!locations || !Array.isArray(locations) || locations.filter(Boolean).length === 0)
  ) {
    return res.status(400).json({ error: 'At least one preference filter (Category, Organization, or Location) must be selected.' });
  }

  try {
    const subscriptionsCollection = getSubscriptionsCollection();
    const activeEmails = emails.map((/** @type {any} */ e) => e.trim().toLowerCase()).filter(Boolean);
    const activeWhatsapps = whatsappNumbers ? whatsappNumbers.map((/** @type {any} */ w) => w.trim()).filter(Boolean) : [];
    
    // We will upsert subscriptions by the primary email (emails[0])
    const primaryEmail = activeEmails[0];

    const subscription = {
      emails: activeEmails,
      whatsappNumbers: activeWhatsapps,
      categories: categories || [],
      organizations: organizations || [],
      locations: locations || [],
      updatedAt: new Date(),
    };

    await subscriptionsCollection.updateOne(
      { emails: primaryEmail },
      { $set: subscription },
      { upsert: true }
    );

    logger.info(`✨ Alert preferences saved successfully for subscriber: ${primaryEmail}`);
    res.status(200).json({ success: true, message: 'Alert Preferences saved successfully!' });
  } catch (error) {
    logger.error('🔥 Subscription setup DB error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Manual Scrape Trigger endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const result = await runScraper();
    res.json({ success: true, message: 'Scraping routine completed!', data: result });
  } catch (error) {
    logger.error('🔥 Scraping trigger error:', error);
    res.status(500).json({ error: 'Scraping failed' });
  }
});

// 4. Retrieve saved Annual Procurement Plan (APP) packages
app.get('/api/app-packages', async (req, res) => {
  try {
    const collection = getAppPackagesCollection();
    const appPackages = await collection.find({}).sort({ scrapedAt: -1 }).toArray();
    res.json(appPackages);
  } catch (error) {
    logger.error('🔥 Error fetching APP packages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. Manual APP Scrape Trigger endpoint
app.post('/api/scrape/app', async (req, res) => {
  try {
    const result = await runAPPScraper();
    res.json({ success: true, message: 'APP Scraping routine completed!', data: result });
  } catch (error) {
    logger.error('🔥 APP Scraping trigger error:', error);
    res.status(500).json({ error: 'APP Scraping failed' });
  }
});

// 6. Retrieve saved eContracts (Notice of Award)
app.get('/api/econtracts', async (req, res) => {
  try {
    const collection = getEContractsCollection();
    /** @type {any} */
    const query = {};

    // A. Keyword search (Tender ID, Ref No, Title, Contractor Name)
    if (req.query.search) {
      const searchStr = String(req.query.search).trim();
      if (searchStr) {
        query.$or = [
          { tenderId: { $regex: searchStr, $options: 'i' } },
          { refNo: { $regex: searchStr, $options: 'i' } },
          { title: { $regex: searchStr, $options: 'i' } },
          { awardTo: { $regex: searchStr, $options: 'i' } }
        ];
      }
    }

    // B. District filtering
    if (req.query.district) {
      query.district = { $regex: String(req.query.district).trim(), $options: 'i' };
    }

    // C. Ministry filtering
    if (req.query.ministry) {
      query.ministry = { $regex: String(req.query.ministry).trim(), $options: 'i' };
    }

    // D. Pagination & Stats
    const page = parseInt(String(req.query.page), 10) || 1;
    const limit = parseInt(String(req.query.limit), 10) || 20;
    const skip = (page - 1) * limit;

    const total = await collection.countDocuments(query);
    const data = await collection.find(query)
      .sort({ signingDate: -1, scrapedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Calculate dynamic query-based stats
    const statsResult = await collection.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalValue: { 
            $sum: { 
              $convert: { 
                input: "$valueCrore", 
                to: "double", 
                onError: 0, 
                onNull: 0 
              } 
            } 
          },
          contractors: { $addToSet: "$awardTo" }
        }
      }
    ]).toArray();

    const stats = statsResult[0] || { totalValue: 0, contractors: [] };

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalCount: total,
        totalValueCrore: stats.totalValue.toFixed(3),
        uniqueContractorsCount: stats.contractors.length
      }
    });
  } catch (error) {
    logger.error('🔥 Error fetching econtracts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 7. Retrieve single eContract by Tender ID
app.get('/api/econtracts/:tenderId', async (req, res) => {
  try {
    const collection = getEContractsCollection();
    const tenderId = req.params.tenderId;

    const econtract = await collection.findOne({ tenderId });
    if (!econtract) {
      return res.status(404).json({ error: 'eContract not found' });
    }
    res.json(econtract);
  } catch (error) {
    logger.error('🔥 Error fetching econtract by Tender ID:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 8. Manual eContracts Scrape Trigger endpoint
app.post('/api/scrape/econtracts', async (req, res) => {
  try {
    const startPage = parseInt(req.body.startPage, 10) || 1;
    const limitPages = parseInt(req.body.limitPages, 10) || 5;
    const deepSync = req.body.deepSync === true || req.body.deepSync === 'true';

    logger.info(`Manual eContracts scrape request received: startPage=${startPage}, limitPages=${limitPages}, deepSync=${deepSync}`);
    const result = await runEContractsScraper({ startPage, limitPages, deepSync });
    res.json({ success: true, message: 'eContracts scraping completed!', data: result });
  } catch (error) {
    logger.error('🔥 eContracts scraping trigger error:', error);
    res.status(500).json({ error: 'eContracts scraping failed' });
  }
});

export default app;
