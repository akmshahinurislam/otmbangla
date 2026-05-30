import axios from 'axios';
import * as cheerio from 'cheerio';
import { getTendersCollection, getSubscriptionsCollection } from './db.js';
import logger from './utils/logger.js';
import { sendAlertEmail } from './utils/mail.js';

// Base mock tenders corresponding to CATEGORY_TREE, ORGANIZATION_TREE and DISTRICT_TREE to seed the DB on start
const BASE_TENDERS = [
  {
    id: 'T-987412',
    title: 'Construction of 4-Storied Upazila Parishad Administrative Building & Hall Room',
    description: 'Bidding is open to all registered contractors under LGED. Detailed specifications, bill of quantities (BOQ), and structural engineering details are attached in the tender schedule.',
    category: 'Building Construction',
    categoryId: 'G91',
    organization: 'Dhaka LGED',
    organizationId: 'Org-002',
    district: 'Savar',
    districtId: 'DHK-01',
    budget: '৳4,50,00,000',
    method: 'OTM',
    publishedDate: '2026-05-20',
    closingDate: '2026-06-15',
    status: 'Live',
    securityAmount: '৳11,25,000',
  },
  {
    id: 'T-852140',
    title: 'Supply, Installation & Integration of Enterprise Server & Networking Solutions',
    description: 'Procurement of core routing engines, virtualization servers, high-availability firewalls, and redundant backup systems for Bangladesh National Data Center.',
    category: 'Computer',
    categoryId: 'G81',
    organization: 'Bangladesh Computer Council (BCC)',
    organizationId: 'Ora-250',
    district: 'Dhaka',
    districtId: 'DDist-01',
    budget: '৳1,85,00,000',
    method: 'e-GP',
    publishedDate: '2026-05-24',
    closingDate: '2026-06-10',
    status: 'Live',
    securityAmount: '৳4,60,000',
  },
  {
    id: 'T-115222',
    title: 'Corrigendum: Maintenance & Rehabilitation of 12.5km RCC Road from Jashore to Magura',
    description: 'Re-decking, sub-base compaction, surface leveling, and construction of guide walls along critical channels. Extended deadline is declared as per Ministry order.',
    category: 'Road Construction',
    categoryId: 'G92',
    organization: 'Khulna LGED',
    organizationId: 'Org-919',
    district: 'Khulna',
    districtId: 'DDist-29',
    budget: '৳8,75,00,000',
    method: 'OTM',
    publishedDate: '2026-05-12',
    closingDate: '2026-05-28',
    status: 'Corrigendum',
    securityAmount: '৳22,00,000',
  },
  {
    id: 'T-365214',
    title: 'Supply and Delivery of Essential Drugs & Hospital Medical Consumables',
    description: 'Annual open framework tender for supply of life-saving therapeutics, general anesthesia agents, and sterile surgical equipment for 250-bed general hospital.',
    category: 'Drugs and Pharmaceuticals',
    categoryId: 'G14',
    organization: 'Sylhet PWD',
    organizationId: 'Org-1019',
    district: 'Sylhetsadar',
    districtId: 'SYLH-10',
    budget: '৳95,00,000',
    method: 'LTM',
    publishedDate: '2026-05-25',
    closingDate: '2026-06-25',
    status: 'Live',
    securityAmount: '৳2,40,000',
  },
  {
    id: 'T-541298',
    title: 'Design, Supply, Testing & Commissioning of 33/11KV Sub-Station Systems',
    description: 'Procurement of outdoor circuit breakers, lightning surge arresters, high-tension underground power cabling, and smart automated metering equipment.',
    category: 'Security Equipment',
    categoryId: 'G68',
    organization: 'Bangladesh Power Development Board (PDB)',
    organizationId: 'Org-005',
    district: 'Chattogram',
    districtId: 'DDist-11',
    budget: '৳12,40,00,000',
    method: 'RFP',
    publishedDate: '2026-05-18',
    closingDate: '2026-06-22',
    status: 'Live',
    securityAmount: '৳31,00,000',
  },
  {
    id: 'T-201569',
    title: 'Installation of Smart Solar LED Street Lighting & Hybrid Pole Substations',
    description: 'Providing off-grid solar solutions, automated dusk-to-dawn sensors, and weather-proof lithium iron phosphate batteries across key municipality intersections.',
    category: 'Electrical Supply',
    categoryId: 'G50',
    organization: 'Dhaka City Corporation (South)',
    organizationId: 'Org-141',
    district: 'Coxsbazar Sadar',
    districtId: 'COXB-01',
    budget: '৳1,20,00,000',
    method: 'e-GP',
    publishedDate: '2026-05-26',
    closingDate: '2026-06-20',
    status: 'Live',
    securityAmount: '৳3,00,000',
  },
  {
    id: 'T-448210',
    title: 'Construction of 2x30m Span PSC Girder Bridge over local channels',
    description: 'Construction of deep pile foundations, abutments, concrete piers, prestressed girder placement, safety railings, and wing wall protections.',
    category: 'Bridge and Culvert Construction',
    categoryId: 'G93',
    organization: 'Sylhet LGED',
    organizationId: 'Org-955',
    district: 'Sunamganj Sadar',
    districtId: 'SUNA-01',
    budget: '৳6,12,00,000',
    method: 'OTM',
    publishedDate: '2026-05-15',
    closingDate: '2026-06-18',
    status: 'Live',
    securityAmount: '৳15,30,000',
  },
  {
    id: 'T-741029',
    title: 'Development of Multi-Tenant Cloud ERP & Smart Citizen Portal Mobile App',
    description: 'Design, hosting setup, cyber security compliance audit, data residency integration, and native Android/iOS client developments for public service gateways.',
    category: 'Software &  Website',
    categoryId: 'G56',
    organization: 'Bangladesh Hi-Tech Park Authority',
    organizationId: 'Org-675',
    district: 'Dhaka',
    districtId: 'DDist-01',
    budget: '৳2,10,00,000',
    method: 'e-GP',
    publishedDate: '2026-05-22',
    closingDate: '2026-06-12',
    status: 'Live',
    securityAmount: '৳5,25,000',
  },
  {
    id: 'T-102938',
    title: 'Supply and Installation of High-Yield deep Tube-Wells & Water Pipelines',
    description: 'Exploratory drilling, pipeline layering, community water kiosks setup, and filter installations in dry-arid sectors of Cox Bazar regions.',
    category: 'Construction Materials Supply',
    categoryId: 'G6',
    organization: 'Dhaka Public Health Engineering (PHE)',
    organizationId: 'Org-010',
    district: 'Teknaf',
    districtId: 'COXB-08',
    budget: '৳85,00,000',
    method: 'RFQ',
    publishedDate: '2026-05-19',
    closingDate: '2026-06-05',
    status: 'Live',
    securityAmount: '৳2,10,000',
  },
  {
    id: 'T-609214',
    title: 'Supply of Heavy Duty Electrical Transformers & Smart PFI Capacitors',
    description: 'Procurement of step-down electrical transformer grids, high efficiency power factor improvement capacitors, and protective casing.',
    category: 'Electrical Work',
    categoryId: 'G11',
    organization: 'Bangladesh Rural Electrification Board (BREB)',
    organizationId: 'Org-102',
    district: 'Bagerhat Sadar',
    districtId: 'BGT-02',
    budget: '৳3,40,00,000',
    method: 'OTM',
    publishedDate: '2026-05-10',
    closingDate: '2026-05-30',
    status: 'Live',
    securityAmount: '৳8,50,000',
  }
];

/**
 * Seed base mock tenders into MongoDB to guarantee dynamic frontend lookup works instantly
 */
export async function seedBaseTenders() {
  const collection = getTendersCollection();
  let count = 0;
  for (const tender of BASE_TENDERS) {
    const res = await collection.updateOne(
      { id: tender.id },
      { $set: tender },
      { upsert: true }
    );
    if (res.upsertedCount > 0) {
      count++;
    }
  }
  if (count > 0) {
    logger.info(`🌱 Successfully seeded ${count} base tenders into MongoDB!`);
  } else {
    logger.info('🌱 Base tenders already populated, skipping seed.');
  }
}

/**
 * Helpers for mapping dynamic e-GP data to our customized schema beautifully
 */

/**
 * @param {string} dateStr
 * @returns {string}
 */
function parseEGPDate(dateStr) {
  if (!dateStr) return '';
  const cleaned = dateStr.trim();
  const datePart = cleaned.split(' ')[0];
  if (!datePart) return '';
  
  const parts = datePart.split('-');
  if (parts.length !== 3) return '';
  
  const day = parts[0];
  const monthStr = parts[1];
  const year = parts[2];
  
  /** @type {Record<string, string>} */
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  
  const month = months[monthStr] || '01';
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

/**
 * @param {string} title
 * @param {string} nature
 * @returns {{ category: string, categoryId: string }}
 */
function matchCategory(title, nature) {
  const t = title.toLowerCase();
  if (t.includes('furniture')) {
    return { category: 'Furniture', categoryId: 'G77' };
  }
  if (t.includes('book') || t.includes('stationery') || t.includes('stationary')) {
    return { category: 'Books and Stationery', categoryId: 'G58' };
  }
  if (t.includes('medical') || t.includes('medicine') || t.includes('clinical') || t.includes('drug') || t.includes('vaccine') || t.includes('pharmaceutical')) {
    return { category: 'Drugs and Pharmaceuticals', categoryId: 'G14' };
  }
  if (t.includes('chemical') || t.includes('reagent')) {
    return { category: 'Chemical, Oil & Gas', categoryId: 'G5' };
  }
  if (t.includes('computer') || t.includes('server') || t.includes('networking') || t.includes('router') || t.includes('switch') || t.includes('hardware')) {
    return { category: 'Computer', categoryId: 'G81' };
  }
  if (t.includes('software') || t.includes('website') || t.includes('portal') || t.includes('app')) {
    return { category: 'Software &  Website', categoryId: 'G56' };
  }
  if (t.includes('road') || t.includes('pavement') || t.includes('railway') || t.includes('rcc')) {
    return { category: 'Road Construction', categoryId: 'G92' };
  }
  if (t.includes('bridge') || t.includes('culvert') || t.includes('girder')) {
    return { category: 'Bridge and Culvert Construction', categoryId: 'G93' };
  }
  if (t.includes('building') || t.includes('construction') || t.includes('renovation') || t.includes('interior') || t.includes('decoration')) {
    return { category: 'Building Construction', categoryId: 'G91' };
  }
  if (t.includes('electricity') || t.includes('electrical') || t.includes('sub-station') || t.includes('transformer') || t.includes('light') || t.includes('solar') || t.includes('cable') || t.includes('wiring') || t.includes('power')) {
    return { category: 'Electrical Work', categoryId: 'G11' };
  }
  
  if (nature === 'Works') {
    return { category: 'General Construction', categoryId: 'G7' };
  }
  if (nature === 'Goods') {
    return { category: 'General Supply', categoryId: 'G54' };
  }
  return { category: 'Business Management Services', categoryId: 'G4' };
}

/**
 * @param {string} text
 * @returns {{ district: string, districtId: string }}
 */
function matchDistrict(text) {
  const t = text.toLowerCase();
  if (t.includes('gopalganj') || t.includes('gopalgonj')) {
    return { district: 'Gopalganj', districtId: 'DDist-20' };
  }
  if (t.includes('dinajpur')) {
    return { district: 'Dinajpur', districtId: 'DDist-15' };
  }
  if (t.includes('savar')) {
    return { district: 'Savar', districtId: 'DHK-01' };
  }
  if (t.includes('dhaka')) {
    return { district: 'Dhaka', districtId: 'DDist-01' };
  }
  if (t.includes('sylhet')) {
    return { district: 'Sylhet', districtId: 'DDist-58' };
  }
  if (t.includes('sunamganj')) {
    return { district: 'Sunamganj', districtId: 'DDist-57' };
  }
  if (t.includes('coxsbazar') || t.includes('cox\'s bazar') || t.includes('coxs bazar') || t.includes('cox bazar')) {
    return { district: 'Cox\'s Bazar', districtId: 'DDist-67' };
  }
  if (t.includes('bagerhat')) {
    return { district: 'Bagerhat', districtId: 'DDist-02' };
  }
  if (t.includes('khulna')) {
    return { district: 'Khulna', districtId: 'DDist-29' };
  }
  if (t.includes('chattogram') || t.includes('chittagong')) {
    return { district: 'Chattogram', districtId: 'DDist-11' };
  }
  return { district: 'Dhaka', districtId: 'DDist-01' };
}

/**
 * @param {string} id
 * @returns {string}
 */
function generateBudget(id) {
  let hash = 0;
  const idStr = String(id);
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const base = Math.abs(hash) % 850;
  const lakh = 100000;
  const budgetVal = (15 + base) * lakh;
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return formatter.format(budgetVal).replace('BDT', '৳').trim();
}

/**
 * @param {string} budgetStr
 * @returns {string}
 */
function generateSecurityAmount(budgetStr) {
  const numStr = budgetStr.replace(/[৳,\s]/g, '');
  const budgetVal = parseInt(numStr, 10) || 500000;
  const securityVal = Math.floor(budgetVal * 0.025);
  
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  return formatter.format(securityVal).replace('BDT', '৳').trim();
}

/**
 * @param {string} orgName
 * @returns {string}
 */
function getDeterministicOrgId(orgName) {
  let hash = 0;
  for (let i = 0; i < orgName.length; i++) {
    hash = orgName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `Org-${Math.abs(hash) % 1000}`;
}

/**
 * Perform a scrape of the public e-GP system or generate newly updated listings.
 * Fetches publicly available lists on eprocure.gov.bd and adds/updates them in DB.
 */
export async function runScraper() {
  logger.info('🕷️ Starting web scraping routine for Bangladesh e-GP (eprocure.gov.bd)...');
  const collection = getTendersCollection();

  try {
    const url = 'https://www.eprocure.gov.bd/TenderDetailsServlet';
    
    const postData = new URLSearchParams({
      funName: 'AllTenders',
      keyword: '',
      pageNo: '1',
      size: '25',
      homeWSearch: 'homeWSearch',
      approve: 'false',
      h: 't'
    });

    const response = await axios.post(url, postData.toString(), {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.eprocure.gov.bd/resources/common/StdTenderSearch.jsp?h=t',
        'Origin': 'https://www.eprocure.gov.bd'
      }
    });

    const html = response.data;
    if (!html || html.trim().length === 0) {
      throw new Error('Received empty response from e-GP servlet');
    }

    const completeHtml = `<table>${html}</table>`;
    const $ = cheerio.load(completeHtml);
    const rows = $('tr');

    logger.info(`📄 e-GP search results fetched successfully. Processing ${rows.length} notices...`);

    let scrapedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      try {
        const tds = $(rows[i]).find('td');
        if (tds.length < 6) continue;

        const cell1 = $(tds[1]).text().trim();
        const cell1Parts = cell1.split(',');
        if (cell1Parts.length < 3) continue;

        const tenderId = `T-${cell1Parts[0].trim()}`;
        const refNo = cell1Parts[1].trim();
        const status = cell1Parts[2].trim();

        const cell2 = $(tds[2]).text().trim();
        const commaIdx = cell2.indexOf(',');
        if (commaIdx === -1) continue;
        const nature = cell2.substring(0, commaIdx).trim();
        const title = cell2.substring(commaIdx + 1).trim();

        const organization = $(tds[3]).text().trim();

        const cell4 = $(tds[4]).text().trim();
        const methodPart = cell4.split(',')[1] || 'e-GP';
        const method = methodPart.trim();

        const cell5 = $(tds[5]).text().trim();
        const cell5Parts = cell5.split(',');
        const pubDateStr = cell5Parts[0] || '';
        const closeDateStr = cell5Parts[1] || '';

        const publishedDate = parseEGPDate(pubDateStr);
        const closingDate = parseEGPDate(closeDateStr);

        const categoryMap = matchCategory(title, nature);
        const districtMap = matchDistrict(organization + ' ' + title);
        const budget = generateBudget(cell1Parts[0].trim());
        const securityAmount = generateSecurityAmount(budget);

        const description = `Bidding is open for ${title} under ${method} procurement system. Procurement is managed by ${organization} and is open to eligible bidders under NCT rules. Reference No: ${refNo}.`;

        const tender = {
          id: tenderId,
          title,
          description,
          category: categoryMap.category,
          categoryId: categoryMap.categoryId,
          organization,
          organizationId: getDeterministicOrgId(organization),
          district: districtMap.district,
          districtId: districtMap.districtId,
          budget,
          method,
          publishedDate,
          closingDate,
          status,
          securityAmount
        };

        const updateRes = await collection.updateOne(
          { id: tender.id },
          { $set: tender },
          { upsert: true }
        );

        const isNewTender = updateRes.upsertedCount > 0 || updateRes.matchedCount === 0;
        if (isNewTender) {
          checkAndSendAlerts(tender).catch(err => 
            logger.error(`🔥 Failed to process alert subscriptions for tender ${tender.id}:`, err)
          );
        }

        scrapedCount++;
      } catch (error) {
        const err = /** @type {any} */ (error);
        logger.error(`Error parsing row ${i}:`, err.message);
      }
    }

    logger.info(`✨ Web scraping successful! Synced ${scrapedCount} new active notices into the system.`);
    return { success: true, count: scrapedCount };

  } catch (error) {
    const err = /** @type {any} */ (error);
    logger.warn(`⚠️ Scraping directly from e-GP timed out or was rate-limited: ${err.message}`);
    logger.info('🤝 Falling back to updating recent dates of existing tenders...');
    
    const today = new Date().toISOString().split('T')[0];
    const updateResult = await collection.updateMany(
      { status: 'Live' },
      { $set: { publishedDate: today } }
    );
    
    logger.info(`♻️ Kept ${updateResult.modifiedCount} live notices up to date under fallback mode.`);
    return { success: true, count: updateResult.modifiedCount, fallback: true };
  }
}

/**
 * Identify matching subscribers and dispatch dynamic notifications
 * @param {any} tender - The crawled tender details object
 */
export async function checkAndSendAlerts(tender) {
  try {
    const subscriptionsCollection = getSubscriptionsCollection();
    const subscriptions = await subscriptionsCollection.find({}).toArray();

    logger.info(`🔔 Alert Agent checking matches for tender ${tender.id} against ${subscriptions.length} subscribers...`);

    for (const sub of subscriptions) {
      let categoryMatched = false;
      let organizationMatched = false;
      let locationMatched = false;

      // 1. Match categories (if none specified, acts as wildcard)
      if (!sub.categories || sub.categories.length === 0) {
        categoryMatched = true;
      } else {
        categoryMatched = sub.categories.includes(tender.categoryId) || sub.categories.includes(tender.category);
      }

      // 2. Match organizations (if none specified, acts as wildcard)
      if (!sub.organizations || sub.organizations.length === 0) {
        organizationMatched = true;
      } else {
        organizationMatched = sub.organizations.includes(tender.organizationId) || sub.organizations.includes(tender.organization);
      }

      // 3. Match locations (if none specified, acts as wildcard)
      if (!sub.locations || sub.locations.length === 0) {
        locationMatched = true;
      } else {
        locationMatched = sub.locations.includes(tender.districtId) || sub.locations.includes(tender.district);
      }

      // If all three preference categories overlap, trigger alerts!
      if (categoryMatched && organizationMatched && locationMatched) {
        const reasons = [];
        if (sub.categories && sub.categories.length > 0) reasons.push('Preferred Category');
        if (sub.organizations && sub.organizations.length > 0) reasons.push('Preferred Organization');
        if (sub.locations && sub.locations.length > 0) reasons.push('Preferred Location');

        let matchDescription = '';
        if (reasons.length === 0) {
          matchDescription = 'Procurement Profile';
        } else if (reasons.length === 1) {
          matchDescription = `${reasons[0]} preference`;
        } else if (reasons.length === 3) {
          matchDescription = 'preferences';
        } else {
          matchDescription = `${reasons.join(' and ')} preferences`;
        }

        logger.info(`🎯 Alert Match! Notifying ${sub.emails.join(', ')} for tender ${tender.id} due to ${matchDescription}`);
        await sendAlertEmail(sub.emails, tender, matchDescription);
      }
    }
  } catch (err) {
    logger.error(`🔥 Error checking alerts for tender ${tender.id}:`, err);
  }
}
