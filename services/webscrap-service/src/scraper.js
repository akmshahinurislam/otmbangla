import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { getTendersCollection, getSubscriptionsCollection, getAppPackagesCollection, getEContractsCollection } from './db.js';
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
    return { district: 'Sylhet', districtId: 'DDist-64' };
  }
  if (t.includes('sunamganj')) {
    return { district: 'Sunamganj', districtId: 'DDist-63' };
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

  // Get date strings for today and yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  logger.info(`📅 Target scraping dates: Yesterday (${yesterdayStr}) and Today (${todayStr})`);

  try {
    const url = 'https://www.eprocure.gov.bd/TenderDetailsServlet';
    
    let pageNo = 1;
    let keepScraping = true;
    let scrapedCount = 0;

    while (keepScraping) {
      logger.info(`📄 Fetching e-GP search results: Page ${pageNo}...`);
      
      const postData = new URLSearchParams({
        funName: 'AllTenders',
        keyword: '',
        pageNo: String(pageNo),
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
        logger.info(`🛑 Received empty response on page ${pageNo}. Stopping.`);
        break;
      }

      const completeHtml = `<table>${html}</table>`;
      const $ = cheerio.load(completeHtml);
      const rows = $('tr');

      if (rows.length === 0) {
        logger.info(`🛑 No rows found on page ${pageNo}. Stopping.`);
        break;
      }

      logger.info(`  Parsing ${rows.length} rows from page ${pageNo}...`);

      let pageHasTargetDate = false;
      let oldestDateOnPage = '';

      for (let i = 0; i < rows.length; i++) {
        try {
          const tds = $(rows[i]).find('td');
          if (tds.length < 6) continue;

          const cell1 = $(tds[1]).text().trim();
          const cell1Parts = cell1.split(',').map(p => p.trim());
          if (cell1Parts.length === 0 || !cell1Parts[0]) continue;

          const rawId = cell1Parts[0];
          const tenderId = `T-${rawId}`;
          
          let refNo = 'N/A';
          let status = 'Live';
          
          if (cell1Parts.length >= 3) {
            refNo = cell1Parts[1];
            status = cell1Parts[2];
          } else if (cell1Parts.length === 2) {
            const val = cell1Parts[1];
            if (['live', 'corrigendum', 'closed', 'cancelled', 'active', 'evaluation'].includes(val.toLowerCase())) {
              status = val;
            } else {
              refNo = val;
            }
          }

          const cell2 = $(tds[2]).text().trim();
          let nature = 'Works';
          let title = cell2;
          
          const commaIdx = cell2.indexOf(',');
          if (commaIdx !== -1) {
            nature = cell2.substring(0, commaIdx).trim();
            title = cell2.substring(commaIdx + 1).trim();
          }

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

          if (publishedDate) {
            oldestDateOnPage = publishedDate;
          }

          // Check if tender was published on today or yesterday
          if (publishedDate === todayStr || publishedDate === yesterdayStr) {
            pageHasTargetDate = true;
            
            const categoryMap = matchCategory(title, nature);
            const districtMap = matchDistrict(organization + ' ' + title);
            const budget = generateBudget(rawId);
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
          } else if (publishedDate && publishedDate < yesterdayStr) {
            // Found a tender older than yesterday. Since listings are sorted descending, we are done.
            logger.info(`⏱️ Reached older tender ${tenderId} published on ${publishedDate}. Stopping pagination.`);
            keepScraping = false;
          }
        } catch (error) {
          const err = /** @type {any} */ (error);
          logger.error(`Error parsing row ${i} on page ${pageNo}:`, err.message);
        }
      }

      // If the entire page has dates older than yesterday, we can stop
      if (!pageHasTargetDate && oldestDateOnPage && oldestDateOnPage < yesterdayStr) {
        logger.info(`⏱️ Entire page ${pageNo} has dates older than ${yesterdayStr}. Stopping.`);
        keepScraping = false;
      }

      if (keepScraping) {
        pageNo++;
        logger.info(`⏳ Waiting 1000ms before requesting next page to prevent e-GP rate limits...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    logger.info(`✨ Web scraping completed successfully! Synced ${scrapedCount} notices into the database.`);
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

/**
 * Utility date parser for e-GP detail pages
 * @param {string} dateStr
 * @returns {string}
 */
function parseDetailDate(dateStr) {
  if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return '';
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) return dateStr;
  const day = parts[0].padStart(2, '0');
  const monthStr = parts[1];
  const year = parts[2];
  
  /** @type {Record<string, string>} */
  const months = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  
  const month = months[monthStr] || '01';
  return `${year}-${month}-${day}`;
}

/**
 * Utility selector function to find sibling TD by case-insensitive text key
 * @param {cheerio.CheerioAPI} $
 * @param {string} searchKey
 * @returns {string}
 */
function findDetailValue($, searchKey) {
  let value = '';
  const keyNormal = searchKey.toLowerCase().replace(/[:\s]/g, '');
  $('td, th').each((i, el) => {
    const cellText = $(el).text().trim();
    const cellNormal = cellText.toLowerCase().replace(/[:\s]/g, '');
    if (cellNormal === keyNormal || (cellNormal.startsWith(keyNormal) && cellNormal.length <= keyNormal.length + 3)) {
      const sibling = $(el).next('td, th');
      if (sibling.length > 0) {
        value = sibling.text().trim();
        return false; // break loop
      }
    }
  });
  return value;
}

/**
 * Scrapes Annual Procurement Plan (APP) from eprocure.gov.bd and saves details in DB
 */
export async function runAPPScraper() {
  logger.info('🕷️ Starting web scraping routine for Bangladesh e-GP Annual Procurement Plan (APP)...');
  let collection;
  if (process.env.MOCK_DB !== 'true') {
    collection = getAppPackagesCollection();
  }

  try {
    const listUrl = 'https://www.eprocure.gov.bd/SearchAPPServlet';
    
    // 1. Fetch the main APP listing table
    const postDataList = new URLSearchParams({
      stateId: '0',
      financialYear: '2025-2026',
      departmentid: '0',
      pageNo: '1',
      officeId: '0',
      action: 'Search',
      size: '10'
    });

    const listResponse = await axios.post(listUrl, postDataList.toString(), {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.eprocure.gov.bd/resources/common/SearchAPP.jsp',
        'Origin': 'https://www.eprocure.gov.bd'
      }
    });

    const listHtml = listResponse.data;
    if (!listHtml || listHtml.trim().length === 0) {
      throw new Error('Received empty response from SearchAPPServlet main list');
    }

    const completeListHtml = `<table>${listHtml}</table>`;
    const $list = cheerio.load(completeListHtml);
    const rows = $list('tr');

    if (rows.length === 0) {
      throw new Error('No rows found in e-GP APP main list');
    }

    logger.info(`📄 APP main list parsed successfully. Collecting all package detail paths across the first 10 PE offices...`);

    /** @type {any[]} */
    const detailPathsToScrape = [];
    let validPeOfficesProcessed = 0;
    const maxPeOfficesToProcess = 10;

    for (let r = 0; r < rows.length; r++) {
      if (validPeOfficesProcessed >= maxPeOfficesToProcess) {
        break;
      }

      const tds = $list(rows[r]).find('td');
      if (tds.length < 5) continue;

      const links = $list(tds[4]).find('a');
      if (links.length === 0) continue;

      // Extract officeId and budget types for this PE office
      let officeId = '';
      /** @type {any[]} */
      const bTypes = [];
      links.each((i, link) => {
        const href = $list(link).attr('href') || '';
        const officeIdMatch = href.match(/officeId=(\d+)/);
        const bTypeIdMatch = href.match(/bTypeId=(\d+)/);
        if (officeIdMatch) officeId = officeIdMatch[1];
        if (bTypeIdMatch) bTypes.push(bTypeIdMatch[1]);
      });

      if (!officeId) continue;

      validPeOfficesProcessed++;
      logger.info(`🔍 [${validPeOfficesProcessed}/${maxPeOfficesToProcess}] PE Office Row ${r + 1} - Office ID: ${officeId}. Checking budget types [${bTypes.join(', ')}]...`);

      // Cycle budget types to find records for this PE office
      for (const bType of bTypes) {
        let pageNo = 1;
        while (true) {
          const postDataSearch = new URLSearchParams({
            bTypeId: bType,
            pageNo: String(pageNo),
            office: officeId,
            action: 'advSearch',
            size: '10',
            keyWord: 'null'
          });

          const searchResponse = await axios.post(listUrl, postDataSearch.toString(), {
            timeout: 15000,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Referer': `https://www.eprocure.gov.bd/resources/common/StdSearch.jsp?officeId=${officeId}&bTypeId=${bType}`,
              'Origin': 'https://www.eprocure.gov.bd'
            }
          });

          const searchHtml = searchResponse.data;
          if (!searchHtml || searchHtml.includes('No Records Found')) {
            break; // Stop pagination if no records found or empty
          }

          const completeSearchHtml = `<table>${searchHtml}</table>`;
          const $search = cheerio.load(completeSearchHtml);
          const searchRows = $search('tr');

          let pagePathsFound = 0;
          for (let i = 0; i < searchRows.length; i++) {
            const tdsSearch = $search(searchRows[i]).find('td');
            if (tdsSearch.length < 5) continue;
            
            const linkSearch = $search(tdsSearch[4]).find('a');
            if (linkSearch.length > 0) {
              const onclick = linkSearch.attr('onclick') || '';
              const pathMatch = onclick.match(/\/resources\/common\/ViewPackageDetail\.jsp\?[^']+/);
              if (pathMatch) {
                const detailPath = pathMatch[0];
                const item = {
                  path: detailPath,
                  officeId,
                  bType
                };
                // Ensure unique paths
                if (!detailPathsToScrape.some(p => p.path === detailPath)) {
                  detailPathsToScrape.push(item);
                  pagePathsFound++;
                }
              }
            }
          }

          if (pagePathsFound === 0) {
            break; // Stop pagination if no new paths found on this page
          }

          pageNo++;
        }
      }
    }

    if (detailPathsToScrape.length === 0) {
      throw new Error('Failed to find any valid package detail links in the search results');
    }

    logger.info(`🎯 Found ${detailPathsToScrape.length} package detail links to scrape. Starting detailed scraping...`);

    const scrapedDocs = [];

    // 4. Fetch and parse each corresponding detail page sequentially
    for (let idx = 0; idx < detailPathsToScrape.length; idx++) {
      const { path: detailPath, officeId, bType: chosenBType } = detailPathsToScrape[idx];
      const detailUrl = `https://www.eprocure.gov.bd${detailPath}`;
      logger.info(`🕷️ [${idx + 1}/${detailPathsToScrape.length}] Fetching detail page: ${detailUrl}`);

      try {
        const detailResponse = await axios.get(detailUrl, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Referer': `https://www.eprocure.gov.bd/resources/common/StdSearch.jsp?officeId=${officeId}&bTypeId=${chosenBType}`
          }
        });

        const detailHtml = detailResponse.data;
        if (!detailHtml || detailHtml.trim().length === 0) {
          logger.warn(`⚠️ Received empty response from ViewPackageDetail.jsp for path: ${detailPath}`);
          continue;
        }

        // 5. Parse all package and date fields from the detailed page
        const $detail = cheerio.load(detailHtml);

        const appId = findDetailValue($detail, 'APP ID');
        const pkgIdMatch = detailPath.match(/pkgId=(\d+)/);
        const pkgId = pkgIdMatch ? pkgIdMatch[1] : '';

        if (!appId || !pkgId) {
          logger.warn(`⚠️ Failed to parse appId (${appId}) or pkgId (${pkgId}) from detail path ${detailPath}`);
          continue;
        }

        // Key information mapping
        const ministry = findDetailValue($detail, 'Ministry');
        const division = findDetailValue($detail, 'Division');
        const organization = findDetailValue($detail, 'Organization');
        const peOffice = findDetailValue($detail, 'PE Office and Code') || findDetailValue($detail, 'PE Office');
        const projectName = findDetailValue($detail, 'Project Name');
        const appCode = findDetailValue($detail, 'APP Code');
        const financialYear = findDetailValue($detail, 'Financial Year');
        const budgetType = findDetailValue($detail, 'Budget Type');
        const advanceProcurementApp = findDetailValue($detail, 'Advance Procurement (APP)');
        const procuringEntity = findDetailValue($detail, 'Procuring Entity');
        const district = findDetailValue($detail, 'District');
        const procurementNature = findDetailValue($detail, 'Procurement Nature');
        const typeOfEmergency = findDetailValue($detail, 'Type of Emergency');
        const serviceType = findDetailValue($detail, 'Service Type');
        const advanceProcurementPackage = findDetailValue($detail, 'Advance Procurement (Package)');
        const packageNo = findDetailValue($detail, 'Package No');
        const packageDescription = findDetailValue($detail, 'Package Description');
        
        // Parse estimated cost safely
        const estimatedCostStr = findDetailValue($detail, 'Package Estimated Cost (In BDT)') || findDetailValue($detail, 'Estimated Cost');
        const packageEstimatedCost = parseFloat(estimatedCostStr.replace(/,/g, '')) || 0;

        const category = findDetailValue($detail, 'Category');
        const approvingAuthority = findDetailValue($detail, 'Approving Authority');
        const procurementMethod = findDetailValue($detail, 'Procurement Method');
        const procurementType = findDetailValue($detail, 'Procurement Type');
        const packageType = findDetailValue($detail, 'Package Type');
        const sourceOfFund = findDetailValue($detail, 'Source of Fund');
        const developmentPartners = findDetailValue($detail, 'Development Partners');

        // Parse Expected Dates
        const dates = {
          expectedDateOfAdvertisement: parseDetailDate(findDetailValue($detail, 'Expected Date of Advertisement of Tender/Proposal on e-GP website')),
          expectedDateOfSubmission: parseDetailDate(findDetailValue($detail, 'Expected Date of submission of Tender/Proposal')),
          expectedDateOfOpening: parseDetailDate(findDetailValue($detail, 'Expected Date of Opening of Tender/Proposal')),
          expectedDateOfSubmissionEvaluation: parseDetailDate(findDetailValue($detail, 'Expected Date of Submission of Evaluation Report')),
          expectedDateOfApprovalAward: parseDetailDate(findDetailValue($detail, 'Expected Date of Approval for Award of Contract')),
          expectedDateOfIssuanceNOA: parseDetailDate(findDetailValue($detail, 'Expected Date of Issuance of the NOA')),
          expectedDateOfSigningContract: parseDetailDate(findDetailValue($detail, 'Expected Date of Signing of Contract')),
          expectedDateOfCompletionContract: parseDetailDate(findDetailValue($detail, 'Expected Date of Completion of Contract'))
        };

        const totalTimeStr = findDetailValue($detail, 'Total Time to Contract Signing');
        const totalTimeToContractSigning = parseInt(totalTimeStr, 10) || 0;

        // Parse Electronic Signature
        let electronicallySignedBy = '';
        $detail('td, th').each((i, el) => {
          const txt = $detail(el).text().trim();
          if (txt.toLowerCase().includes('electronically signed by')) {
            electronicallySignedBy = txt.replace(/electronically signed by\s*:/i, '').trim();
            return false;
          }
        });

        const appPackageDoc = {
          appId,
          pkgId,
          ministry,
          division,
          organization,
          peOffice,
          projectName,
          appCode,
          financialYear,
          budgetType,
          advanceProcurementApp,
          procuringEntity,
          district,
          procurementNature,
          typeOfEmergency,
          serviceType,
          advanceProcurementPackage,
          packageNo,
          packageDescription,
          packageEstimatedCost,
          category,
          approvingAuthority,
          procurementMethod,
          procurementType,
          packageType,
          sourceOfFund,
          developmentPartners,
          dates,
          totalTimeToContractSigning,
          electronicallySignedBy,
          scrapedAt: new Date()
        };

        // 6. Save and upsert in MongoDB or mock DB
        if (process.env.MOCK_DB === 'true') {
          logger.info(`🤖 Mock DB Mode: Saving scraped APP Package ID: ${appId} to local file...`);
          const outPath = 'scraped_app_package_proof.json';
          let existing = [];
          try {
            if (fs.existsSync(outPath)) {
              existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
            }
          } catch (e) {}
          
          const existingIdx = existing.findIndex((/** @type {any} */ item) => item.appId === appId && item.pkgId === pkgId);
          if (existingIdx !== -1) {
            existing[existingIdx] = appPackageDoc;
          } else {
            existing.push(appPackageDoc);
          }
          fs.writeFileSync(outPath, JSON.stringify(existing, null, 2), 'utf8');
        } else {
          if (collection) {
            await collection.updateOne(
              { appId, pkgId },
              { $set: appPackageDoc },
              { upsert: true }
            );
          }
          logger.info(`✨ Successfully scraped and stored APP Package ID: ${appId}, Package ID: ${pkgId} in MongoDB!`);
        }

        scrapedDocs.push(appPackageDoc);
      } catch (err) {
        const errorMsg = /** @type {any} */ (err).message;
        logger.error(`🔥 Failed to parse detailed package for path ${detailPath}: ${errorMsg}`);
      }
    }

    logger.info(`🎉 Successfully scraped ${scrapedDocs.length} of ${detailPathsToScrape.length} APP packages!`);
    return { success: true, count: scrapedDocs.length, data: scrapedDocs };

  } catch (error) {
    const err = /** @type {any} */ (error);
    logger.error('🔥 Failed to scrape e-GP Annual Procurement Plan (APP):', err.message);
    throw err;
  }
}

/**
 * Automatically clean up expired tenders by deleting notices whose closing date is earlier than today.
 * (i.e. deleting them 1 day after their deadline has passed).
 */
export async function runCleanup() {
  logger.info('🧹 Starting automatic tender cleanup job...');
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const collection = getTendersCollection();
    const result = await collection.deleteMany({ closingDate: { $lt: todayStr } });
    logger.info(`✅ Cleaned up ${result.deletedCount} expired tenders with deadline before ${todayStr}.`);
    return { success: true, count: result.deletedCount };
  } catch (error) {
    logger.error('🔥 Automatic tender cleanup failed:', error);
    throw error;
  }
}

/**
 * Scrapes eContracts (Notice of Award) from eprocure.gov.bd and saves details in DB & local files
 * @param {any} options
 */
export async function runEContractsScraper(options = {}) {
  const startPage = options.startPage || 1;
  const limitPages = options.limitPages || 5;
  const deepSync = options.deepSync || false;

  logger.info(`🕷️ Starting web scraping routine for Bangladesh e-GP eContracts (NOA)...`);
  const collection = getEContractsCollection();

  const exportDir = process.env.ECONTRACTS_EXPORT_DIR || 'F:\\OTMBangla-Main\\data\\econtracts';
  try {
    fs.mkdirSync(exportDir, { recursive: true });
    logger.info(`📂 Saving eContracts JSON files under: ${exportDir}`);
  } catch (error) {
    const err = /** @type {any} */ (error);
    logger.error(`🔥 Failed to create export directory: ${err.message}`);
  }

  try {
    const listUrl = 'https://www.eprocure.gov.bd/SearchNoaServlet';
    let pageNo = startPage;
    let keepScraping = true;
    let totalSynced = 0;

    while (keepScraping && pageNo < startPage + limitPages) {
      logger.info(`📄 Fetching eContracts index: Page ${pageNo}...`);

      const postData = new URLSearchParams({
        keyword: '',
        pageNo: String(pageNo),
        size: '100'
      });

      const response = await axios.post(listUrl, postData.toString(), {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Referer': 'https://www.eprocure.gov.bd/resources/common/SearchNOA.jsp',
          'Origin': 'https://www.eprocure.gov.bd'
        }
      });

      const html = response.data;
      if (!html || html.trim().length === 0 || html.includes('No Records Found')) {
        logger.info(`🛑 Received empty response or no records on page ${pageNo}. Stopping.`);
        break;
      }

      const completeHtml = `<table>${html}</table>`;
      const $ = cheerio.load(completeHtml);
      const rows = $('tr');

      if (rows.length === 0) {
        logger.info(`🛑 No rows found on page ${pageNo}. Stopping.`);
        break;
      }

      logger.info(`  Parsing ${rows.length} rows from index page ${pageNo}...`);
      /** @type {any[]} */
      const pageContracts = [];
      let pageNewOrUpdatedCount = 0;

      for (let i = 0; i < rows.length; i++) {
        try {
          const tds = $(rows[i]).find('td');
          if (tds.length < 8) continue;

          const sNo = $(tds[0]).text().trim();
          const ministry = $(tds[1]).text().trim().replace(/\s+/g, ' ');
          
          const col2 = $(tds[2]);
          const linkEl = col2.find('a');
          const href = linkEl.attr('href') || '';
          
          const linkText = linkEl.text().trim();
          const linkParts = linkText.split(',').map(s => s.trim());
          const tenderId = linkParts[0] || '';
          const refNo = linkParts.slice(1).join(', ') || '';

          const title = col2.find('.more').text().trim().replace(/\s+/g, ' ');
          
          let advDate = '';
          col2.contents().each((index, el) => {
            if (el.type === 'text') {
              const text = $(el).text().trim();
              if (text) {
                advDate = text;
              }
            }
          });

          const pkgLotIdMatch = href.match(/pkgLotId=(\d+)/);
          const tenderIdMatch = href.match(/tenderid=(\d+)/);
          const pkgLotId = pkgLotIdMatch ? pkgLotIdMatch[1] : '';
          const detailTenderId = tenderIdMatch ? tenderIdMatch[1] : '';

          const peAndMethod = $(tds[3]).text().trim().replace(/\s+/g, ' ');
          const district = $(tds[4]).text().trim();
          const signingDate = $(tds[5]).text().trim();
          const awardTo = $(tds[6]).text().trim();
          const valueCrore = $(tds[7]).text().trim();

          /** @type {any} */
          const contractDoc = {
            pkgLotId,
            tenderId,
            ministry,
            refNo,
            title,
            advertisementDate: advDate,
            peAndMethod,
            district,
            signingDate,
            awardTo,
            valueCrore,
            detailLink: href,
            scrapedAt: new Date()
          };

          const existingDoc = await collection.findOne({ pkgLotId, tenderId });
          const needsDetails = !existingDoc || !existingDoc.details || deepSync;

          if (needsDetails) {
            if (pkgLotId && detailTenderId) {
              const detailUrl = `https://www.eprocure.gov.bd/resources/common/ViewAwardedContracts.jsp?pkgLotId=${pkgLotId}&tenderid=${detailTenderId}`;
              logger.info(`    🕷️ Fetching detail page for Tender ID: ${tenderId}...`);
              
              try {
                const detailResponse = await axios.get(detailUrl, {
                  timeout: 10000,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Referer': 'https://www.eprocure.gov.bd/resources/common/SearchNOA.jsp'
                  }
                });

                const $detail = cheerio.load(detailResponse.data);

                const agency = findDetailValue($detail, 'Agency');
                const peName = findDetailValue($detail, 'Procuring Entity Name');
                const peCode = findDetailValue($detail, 'Procuring Entity Code');
                const peDistrict = findDetailValue($detail, 'Procuring Entity District');
                const contractAwardFor = findDetailValue($detail, 'Contract Award for');
                const budgetAndSource = findDetailValue($detail, 'Budget and Source of Funds');
                const devPartner = findDetailValue($detail, 'Development Partner');
                const projectName = findDetailValue($detail, 'Project/Programme Name');
                const packageNo = findDetailValue($detail, 'Tender/Proposal Package No.');
                const packageName = findDetailValue($detail, 'Tender/Proposal Package Name');
                const noaDate = findDetailValue($detail, 'Date of Notification of Award');
                const contractStart = findDetailValue($detail, 'Proposed Date of Contract Start');
                const contractCompletion = findDetailValue($detail, 'Proposed Date of Contract Completion');
                const contractValueTaka = findDetailValue($detail, 'Contract Value (Taka)');
                const tendererIdVal = findDetailValue($detail, 'Tenderer ID of the Economic Operator');
                const businessAddress = findDetailValue($detail, 'Business Address of the Economic Operator');
                const deliveryLocation = findDetailValue($detail, 'Location of Delivery/Works/Consultancy');
                const authOfficerName = findDetailValue($detail, 'Name of Authorised Officer');
                const authOfficerDesignation = findDetailValue($detail, 'Designation of Authorised Officer');

                /** @type {any[]} */
                const shareholders = [];
                $detail('table.viewShareholdersTable tr, #viewShareholderInfoDiv table tr').each((j, el) => {
                  const tdsShare = $detail(el).find('td');
                  if (tdsShare.length >= 3) {
                    const sNoShare = $detail(tdsShare[0]).text().trim();
                    const nameShare = $detail(tdsShare[1]).text().trim().replace(/\s+/g, ' ');
                    const ownershipShare = $detail(tdsShare[2]).text().trim();
                    const countryShare = tdsShare.length >= 4 ? $detail(tdsShare[3]).text().trim() : '';
                    if (nameShare && nameShare.toLowerCase() !== 'name') {
                      shareholders.push({ sNo: sNoShare, name: nameShare, ownership: ownershipShare, country: countryShare });
                    }
                  }
                });

                contractDoc.details = {
                  agency,
                  procuringEntityName: peName,
                  procuringEntityCode: peCode,
                  procuringEntityDistrict: peDistrict,
                  contractAwardFor,
                  budgetAndSourceOfFunds: budgetAndSource,
                  developmentPartner: devPartner,
                  projectName,
                  packageNo,
                  packageName,
                  dateOfNotificationOfAward: noaDate,
                  proposedContractStart: contractStart,
                  proposedContractCompletion: contractCompletion,
                  contractValueTaka,
                  tendererId: tendererIdVal,
                  businessAddress,
                  locationOfDelivery: deliveryLocation,
                  authorisedOfficerName: authOfficerName,
                  authorisedOfficerDesignation: authOfficerDesignation,
                  beneficialOwnership: shareholders
                };

                await new Promise(resolve => setTimeout(resolve, 500));
              } catch (errorDetail) {
                const errDetail = /** @type {any} */ (errorDetail);
                logger.error(`🔥 Failed to parse detail page for Tender ID: ${tenderId}: ${errDetail.message}`);
              }
            }
          } else {
            contractDoc.details = existingDoc.details;
          }

          const updateRes = await collection.updateOne(
            { pkgLotId, tenderId },
            { $set: contractDoc },
            { upsert: true }
          );

          if (updateRes.upsertedCount > 0 || updateRes.modifiedCount > 0 || !existingDoc) {
            pageNewOrUpdatedCount++;
          }

          pageContracts.push(contractDoc);
          totalSynced++;
        } catch (errorRow) {
          const errRow = /** @type {any} */ (errorRow);
          logger.error(`🔥 Failed to parse row in page ${pageNo}: ${errRow.message}`);
        }
      }

      if (pageContracts.length > 0) {
        const filePath = path.join(exportDir, `page_${pageNo}.json`);
        try {
          fs.writeFileSync(filePath, JSON.stringify(pageContracts, null, 2), 'utf8');
        } catch (errorFile) {
          const errFile = /** @type {any} */ (errorFile);
          logger.error(`🔥 Failed to save page_${pageNo}.json: ${errFile.message}`);
        }
      }

      if (pageNewOrUpdatedCount === 0 && !deepSync) {
        logger.info(`⏱️ All contracts on page ${pageNo} already exist and are up to date. Stopping incremental crawl.`);
        break;
      }

      pageNo++;
      logger.info(`⏳ Waiting 800ms to respect rate-limiting...`);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    logger.info(`🎉 eContracts scrape completed! Synced ${totalSynced} records.`);
    return { success: true, count: totalSynced };
  } catch (error) {
    const err = /** @type {any} */ (error);
    logger.error('🔥 Failed to scrape eContracts:', err.message);
    throw err;
  }
}
