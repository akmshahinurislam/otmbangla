import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { getCollection } from './db.js';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ WARNING: OPENAI_API_KEY is not defined in environment variables.');
}

const openai = new OpenAI({
  apiKey: apiKey
});

const GENERIC_STOP_WORDS = new Set([
  'tender', 'tenders', 'notice', 'notices', 'details', 'show', 'find', 'list', 'are', 'there', 'any', 
  'information', 'work', 'works', 'project', 'projects', 'construction', 'procurement', 'reconstruction', 
  'rehabilitation', 'supply', 'delivery', 'maintenance', 'installation', 'repair', 'local', 'areas', 
  'area', 'job', 'jobs', 'road', 'building', 'bridge', 'electricity', 'electrical', 'computer',
  'higher', 'education', 'secondary', 'division', 'ministry', 'department', 'authority', 'board', 'corporation', 'council',
  'টেন্ডার', 'নোটিশ', 'নোটিস', 'কাজ', 'প্রজেক্ট', 'নির্মাণ', 'সরবরাহ', 'স্থানীয়', 'এলাকা', 'বিবরণ', 'তালিক'
]);

/**
 * Helper to get date string in YYYY-MM-DD format
 * @param {Date} date
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Step 1: Parse the user query into structured search intent parameters
 * @param {string} userMessage
 * @param {any[]} history
 * @param {any[]} debugLogs
 */
async function parseIntent(userMessage, history = [], debugLogs = []) {
  try {
    const today = new Date();
    const todayStr = formatDate(today);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);
    const sevenDaysLaterStr = formatDate(sevenDaysLater);

    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedLongDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const systemPrompt = `You are an expert AI database query parser for a Bangladesh Tender platform.
Your task is to analyze the user's search query (which can be in English, Bangla, or a mix) and extract structured search parameters into a JSON object.
Consider the conversation history to resolve implicit references (e.g. if the user previously searched for PWD in Rangpur, and now asks "are any closing soon?", keep "PWD" and "Rangpur" in the filters).

Today's current date is: ${todayStr} (${dayOfWeek}, ${formattedLongDate}).
Use this current date as the reference point to resolve relative date terms:
- "today" or "আজকে" / "আজ" -> ${todayStr}
- "tomorrow" or "আগামীকাল" -> ${tomorrowStr}
- "yesterday" or "গতকাল" -> ${yesterdayStr}
- "next 7 days" or "আগামী ৭ দিন" / "৭ দিনের মধ্যে" -> range from ${todayStr} to ${sevenDaysLaterStr}
- Specific dates like "25 June" or "২৫ জুন" refer to 2026-06-25.
- Multi-day ranges like "20-27 May" (or "২০-২৭ মে") refer to range from 2026-05-20 to 2026-05-27.

The database collection has these available fields and exact allowed canonical values:
- "district" (canonical values: Dhaka, Savar, Sylhet, Sunamganj, Cox's Bazar, Bagerhat, Khulna, Chattogram, Rangpur, Dinajpur, Gopalganj, Jashore. If they mention Teknaf, it maps to Cox's Bazar district).
- "organization" (canonical values: Dhaka LGED, Khulna LGED, Sylhet LGED, Bangladesh Computer Council (BCC), Sylhet PWD, Bangladesh Power Development Board (PDB), Dhaka City Corporation (South), Bangladesh Hi-Tech Park Authority, Dhaka Public Health Engineering (PHE), Bangladesh Rural Electrification Board (BREB)).
- "category" (canonical values: Building Construction, Road Construction, Bridge and Culvert Construction, Computer, Drugs and Pharmaceuticals, Electrical Work, Electrical Supply, Security Equipment, Software &  Website, Construction Materials Supply).

You MUST respond with a valid JSON object matching this exact schema:
{
  "districts": ["array of canonical district names canonicalized to the exact canonical values above, e.g. ['Bagerhat', 'Chattogram'] if one or more are mentioned or implied, otherwise empty array. If 'Teknaf' is mentioned, extract 'Cox\'s Bazar' here"],
  "organizations": ["array of canonical procurement organization names canonicalized to the exact canonical values above (e.g. ['Sylhet PWD', 'Dhaka LGED', 'Bangladesh Computer Council (BCC)', 'Dhaka City Corporation (South)']) if mentioned or implied, otherwise empty array. Be extremely precise!"],
  "categories": ["array of canonical category names canonicalized to the exact canonical values above (e.g. ['Building Construction', 'Bridge and Culvert Construction', 'Road Construction', 'Software &  Website', 'Drugs and Pharmaceuticals']), otherwise empty array. Be extremely precise! NOTE: For solar, street lighting, substation, hybrid pole, transformer, or general electrical queries, you should extract BOTH 'Electrical Work' and 'Electrical Supply' in the categories array to ensure comprehensive results."],
  "date_filter": {
    "field": "publishedDate" (if they specifically ask for notices published/came out on a date, e.g. "published yesterday", "গতকাল প্রকাশিত"), "closingDate" (if they ask for closing deadlines, remaining days, closing soon, coming up, or notices closing/coming within a future range, e.g. "আগামী ৭ দিন", "closing this week", "আগামী ৭ দিনের মধ্যে আসছে"), "either" (if it is a general date check or could be either, e.g. "notice on 25 June" / "২৫ জুনের নোটিস"), or null if no date constraint is mentioned.
    "operator": "exact" (for a specific day), "range" (for a date range), "gte" (greater than or equal to), "lte" (less than or equal to), or null if no date constraint is mentioned.
    "value": "YYYY-MM-DD" (use for exact, gte, lte operators), or null.
    "start_date": "YYYY-MM-DD" (use for range operator), or null.
    "end_date": "YYYY-MM-DD" (use for range operator), or null.
  },
  "keywords": ["array of specific keyword strings mentioned in the query for general searching, e.g. 'transformer', 'server', 'drugs', otherwise empty array. CRITICAL: Always split multi-word keyword phrases into individual single-word strings in the keywords array (e.g. extract ['cloud', 'erp', 'portal', 'gateway'] instead of ['Cloud Multi-Tenant ERP Portal Gateway']) so they match resiliently in the database. Never extract generic stop-words like 'tender', 'tenders', 'notice', 'notices', 'details', 'show', 'find', 'list', 'are', 'there', 'any', 'information', 'work', 'works', 'project', 'projects', 'construction' or their Bangla equivalents like 'টেন্ডার', 'নোটিশ', 'নোটিস', 'কাজ', 'প্রজেক্ট', 'ব্রিজ', 'নির্মাণ' into the keywords array under any circumstance, as they completely dilute database search results! Only extract highly specific technical objects/terms."]
}

Remember: Only output the JSON object. Do not include markdown code block syntax (like \`\`\`json) in your raw API response; reply with ONLY the pure JSON string.`;

    // Map and slice history to sliding window of last 10 messages (5 turns)
    const formattedHistory = history.map(item => {
      /** @type {"user" | "assistant"} */
      const role = item.sender === 'user' ? 'user' : 'assistant';
      return {
        role,
        content: item.text
      };
    }).slice(-10);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0 // Set temperature to 0 for maximum consistency and exact deterministic intent parsing!
    });

    const resultText = completion.choices[0]?.message?.content || '{}';
    console.log('🤖 Extracted Search Intent parameters (with context):', resultText);
    const params = JSON.parse(resultText);

    debugLogs.push({
      step: "1. Intent Parsing (GPT-4o-mini)",
      timestamp: new Date().toISOString(),
      details: {
        referenceDates: { today: todayStr, tomorrow: tomorrowStr, yesterday: yesterdayStr, sevenDaysLater: sevenDaysLaterStr },
        userMessage,
        extractedParams: params
      }
    });

    return params;
  } catch (error) {
    console.error('❌ Failed to parse user intent with OpenAI:', error);
    const fallbackParams = { districts: [], organizations: [], categories: [], date_filter: null, keywords: [] };
    debugLogs.push({
      step: "1. Intent Parsing Failed",
      timestamp: new Date().toISOString(),
      details: { error: /** @type {any} */ (error).message, fallbackParams }
    });
    return fallbackParams;
  }
}

const CANONICAL_DISTRICTS = new Set([
  'dhaka', 'savar', 'sylhet', 'sunamganj', 'cox\'s bazar', 'cox', 'coxsbazar', 'bagerhat', 'khulna', 'chattogram', 'rangpur', 'dinajpur', 'gopalganj', 'jashore'
]);

/**
 * Helper to normalize district names to resolve apostrophe or spacing variations (e.g. Cox's Bazar vs Coxsbazar)
 * @param {string} district
 */
function normalizeDistrictName(district) {
  if (!district) return district;
  const d = district.toLowerCase().trim();
  if (d.includes('cox') || d.includes('teknaf')) return '(cox|teknaf)';
  if (d.includes('chitta') || d.includes('chatto')) return 'ch(a|i)t';
  if (d.includes('gopal')) return 'gopal';
  return district;
}

/**
 * Step 2: Build MongoDB query and execute database search
 * @param {any} params
 * @param {string} userMessage
 * @param {any[]} debugLogs
 */
async function searchDatabase(params, userMessage, debugLogs = []) {
  try {
    const tendersCollection = getCollection('tenders');
    /** @type {Record<string, any>} */
    const query = {};

    // 1. Districts matching (compiled as OR clause across list of canonical districts)
    if (params.districts && params.districts.length > 0) {
      const validDistricts = [];
      params.keywords = params.keywords || [];

      for (const dist of params.districts) {
        const d = dist.toLowerCase().trim();
        if (CANONICAL_DISTRICTS.has(d) || d.includes('cox') || d.includes('teknaf') || d.includes('sylhet') || d.includes('sunamganj') || d.includes('bagerhat')) {
          validDistricts.push(dist);
        } else {
          // Move non-canonical district to keywords resiliently
          console.log(`⚙️ Programmatic override: Moving non-canonical district "${dist}" to keywords.`);
          params.keywords.push(dist);
        }
      }

      if (validDistricts.length > 0) {
        query.$and = query.$and || [];
        const districtClauses = validDistricts.map((/** @type {string} */ dist) => {
          const normalizedDistrict = normalizeDistrictName(dist);
          return { district: { $regex: normalizedDistrict, $options: 'i' } };
        });
        query.$and.push({ $or: districtClauses });
      }
    }

    // 2. Organizations matching (compiled as OR clause across list of organizations. Each organization supports resilient out-of-order words)
    if (params.organizations && params.organizations.length > 0) {
      query.$and = query.$and || [];
      const orgClauses = params.organizations.map((/** @type {string} */ org) => {
        const words = org.split(/\s+/).filter((/** @type {string} */ w) => w.length > 0);
        if (words.length > 0) {
          return {
            $and: words.map((/** @type {string} */ word) => ({
              organization: { $regex: word, $options: 'i' }
            }))
          };
        }
        return { organization: { $regex: org, $options: 'i' } };
      });
      query.$and.push({ $or: orgClauses });
    }

    // 3. Categories matching (compiled as OR clause across list of canonical categories)
    if (params.categories && params.categories.length > 0) {
      query.$and = query.$and || [];
      const catClauses = params.categories.map((/** @type {string} */ cat) => {
        return { category: { $regex: cat, $options: 'i' } };
      });
      query.$and.push({ $or: catClauses });
    }

    // 4. Date filtering
    if (params.date_filter && params.date_filter.operator) {
      const { operator, value, start_date, end_date } = params.date_filter;
      let field = params.date_filter.field;
      
      const todayStr = formatDate(new Date());
      
      // Programmatic Guard: Future dates are mathematically closingDate deadlines (tenders are never published in the future!)
      const isFutureValue = value && value > todayStr;
      const isFutureEnd = end_date && end_date > todayStr;
      
      if ((isFutureValue || isFutureEnd) && field !== 'closingDate') {
        field = 'closingDate';
        debugLogs.push(`⚙️ Programmatic override: Future date detected (${value || end_date}). Forcing search field to closingDate.`);
      }
      
      let dateFieldQuery = null;
      if (start_date && end_date) {
        // High-priority: If both bounds are present, always treat as a range query
        dateFieldQuery = { $gte: start_date, $lte: end_date };
      } else if (operator === 'exact' && value) {
        dateFieldQuery = value;
      } else if (operator === 'gte' && value) {
        dateFieldQuery = { $gte: value };
      } else if (operator === 'lte' && value) {
        dateFieldQuery = { $lte: value };
      } else if (operator === 'range' && start_date && end_date) {
        dateFieldQuery = { $gte: start_date, $lte: end_date };
      }

      if (dateFieldQuery) {
        if (field === 'publishedDate') {
          query.publishedDate = dateFieldQuery;
        } else if (field === 'closingDate') {
          query.closingDate = dateFieldQuery;
        } else if (field === 'either') {
          query.$and = query.$and || [];
          query.$and.push({
            $or: [
              { publishedDate: dateFieldQuery },
              { closingDate: dateFieldQuery }
            ]
          });
        }
      }
    }

    // 5. Keyword search (OR matching across title and description, compiled as OR search across keywords)
    if (params.keywords && params.keywords.length > 0) {
      const filteredKeywords = params.keywords
        .map((/** @type {string} */ kw) => kw.toLowerCase().trim())
        .filter((/** @type {string} */ kw) => kw.length > 0 && !GENERIC_STOP_WORDS.has(kw));

      if (filteredKeywords.length > 0) {
        const orClauses = filteredKeywords.map((/** @type {string} */ kw) => ({
          $or: [
            { title: { $regex: kw, $options: 'i' } },
            { description: { $regex: kw, $options: 'i' } },
            { category: { $regex: kw, $options: 'i' } }
          ]
        }));
        
        query.$and = query.$and || [];
        query.$and.push({ $or: orClauses });
      } else {
        // All keywords were generic stop words!
        // If there are no other structured filters, return [] directly to prevent fetching all tenders
        const hasOtherFilters = (params.districts && params.districts.length > 0) ||
                                (params.organizations && params.organizations.length > 0) ||
                                (params.categories && params.categories.length > 0) ||
                                (params.date_filter && params.date_filter.operator);
        if (!hasOtherFilters) {
          console.log('🛑 All keywords scrubbed as stop words and no other filters active. Returning empty results.');
          return [];
        }
      }
    }

    debugLogs.push({
      step: "2. Database Query Compilation",
      timestamp: new Date().toISOString(),
      details: {
        compiledMongoQuery: JSON.parse(JSON.stringify(query)),
        hasDateFilter: !!(params.date_filter && params.date_filter.operator)
      }
    });

    console.log('🔍 Executing MongoDB search query:', JSON.stringify(query));
    
    // Retrieve up to 10 matching tenders sorted by closing date (earliest first)
    const results = await tendersCollection.find(query).limit(10).toArray();
    console.log(`📊 Found ${results.length} matching tender notices in database.`);

    debugLogs.push({
      step: "3. Database Search Results",
      timestamp: new Date().toISOString(),
      details: {
        matchCount: results.length,
        skippedFuzzyFallback: !!(params.date_filter && params.date_filter.operator && results.length === 0)
      }
    });
    
    if (results.length > 0) {
      return results;
    }

    // If an exact/relative date filter is specified, we must not do a fuzzy fallback search!
    if (params.date_filter && params.date_filter.operator) {
      console.log('📅 Date filter was active and returned 0 results. Skipping fuzzy fallback.');
      return [];
    }

    // Relaxed fuzzy search fallback: if structured query yields 0 results, do fuzzy search
    console.log('⚠️ Structured search yielded 0 results. Running fuzzy fallback search...');
    /** @type {Record<string, any>} */
    const relaxedQuery = {};
    const words = (params.keywords && params.keywords.length > 0)
      ? params.keywords 
      : userMessage.split(/\s+/).map((/** @type {string} */ w) => w.replace(/[^\w\s]/g, '').trim()).filter((/** @type {string} */ w) => w.length > 3);
      
    if (words.length > 0) {
      const clauses = words.map((/** @type {string} */ w) => ({
        $or: [
          { title: { $regex: w, $options: 'i' } },
          { description: { $regex: w, $options: 'i' } },
          { district: { $regex: w, $options: 'i' } },
          { organization: { $regex: w, $options: 'i' } }
        ]
      }));
      relaxedQuery.$or = clauses;
      console.log('🔍 Executing relaxed fallback query:', JSON.stringify(relaxedQuery));
      
      debugLogs.push({
        step: "3a. Fuzzy Fallback Executing",
        timestamp: new Date().toISOString(),
        details: {
          fuzzyWords: words,
          compiledFuzzyQuery: relaxedQuery
        }
      });

      const relaxedResults = await tendersCollection.find(relaxedQuery).limit(5).toArray();
      
      debugLogs.push({
        step: "3b. Fuzzy Fallback Results",
        timestamp: new Date().toISOString(),
        details: {
          fuzzyMatchCount: relaxedResults.length
        }
      });

      if (relaxedResults.length > 0) {
        console.log(`🎯 Fuzzy fallback found ${relaxedResults.length} matching tenders.`);
        return relaxedResults;
      }
    }

    return [];
  } catch (error) {
    console.error('❌ Failed to execute database query:', error);
    debugLogs.push({
      step: "2. Database Query Failed",
      timestamp: new Date().toISOString(),
      details: { error: /** @type {any} */ (error).message }
    });
    return [];
  }
}

/**
 * Step 3: Formulate a conversational summary in natural language
 * @param {string} userMessage
 * @param {any[]} tenders
 * @param {any[]} history
 * @param {any[]} debugLogs
 */
async function generateConversationalReply(userMessage, tenders, history = [], debugLogs = []) {
  try {
    const today = new Date();
    const todayStr = formatDate(today);
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedLongDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const systemPrompt = `You are a professional procurement and tender expert AI Assistant for BDTenders.
Your goal is to reply to the user's search queries in a natural, friendly, and expert conversational tone.

Today's current date is: ${todayStr} (${dayOfWeek}, ${formattedLongDate}). Keep this reference date in mind to accurately evaluate relative dates mentioned in the user's query relative to when they were asked.

==================================================
🚨 CRITICAL ACCURACY INSTRUCTION (MUST FOLLOW):
We have successfully queried our database and found EXACTLY ${tenders.length} matching tenders.
- If ${tenders.length} > 0, you MUST write a POSITIVE response introducing these tenders. Do NOT say "no tenders found", "sorry", "none found", or "দুঃখিত" under any circumstance!
- If the conversation history below shows that tenders were not found previously, IGNORE THAT HISTORY and write a POSITIVE response now because the database results have changed!
- Treat the database results below as the absolute source of truth.
==================================================

Instructions:
1. Detect the language of the user's message (Bangla, English, or a mix) and reply in the same natural language.
2. If ${tenders.length} > 0, write a short, polite introduction summarizing what we found. For example:
   - "এখানে গতকাল প্রকাশিত টেন্ডার নোটিসগুলো দেওয়া হলো:"
   - "Here are the tenders found in our database:"
3. DO NOT list all details of the tenders (like ID, budget, dates) in your plain text reply, because the UI will automatically render high-fidelity interactive cards for the tenders right below your message. Just write a summary response.
4. If NO tenders were found (${tenders.length} === 0), write a very polite response explaining that we couldn't find any direct matches in the database. Offer to help them search with other keywords or adjust their preferences.

Database results retrieved for your reference:
${JSON.stringify(tenders.map(t => ({ id: t.id, title: t.title, organization: t.organization, district: t.district, publishedDate: t.publishedDate, closingDate: t.closingDate })))}`;

    // Map and slice history to sliding window of last 10 messages (5 turns)
    const formattedHistory = history.map(item => {
      /** @type {"user" | "assistant"} */
      const role = item.sender === 'user' ? 'user' : 'assistant';
      return {
        role,
        content: item.text
      };
    }).slice(-10);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: userMessage }
      ]
    });

    const replyText = completion.choices[0]?.message?.content || 'Here are the tenders found in our database:';

    debugLogs.push({
      step: "4. Conversational Summary Generation",
      timestamp: new Date().toISOString(),
      details: {
        tendersSnippetPassed: tenders.map(t => ({ id: t.id, title: t.title })),
        replyLength: replyText.length
      }
    });

    return replyText;
  } catch (error) {
    console.error('❌ Failed to formulate conversational response:', error);
    const defaultReply = tenders.length > 0
      ? `I found ${tenders.length} matching tender notices in our database. You can review them below:`
      : `I couldn't locate any tenders matching your search query in our database. Please try adjusting your parameters or keyword searches.`;
    
    debugLogs.push({
      step: "4. Conversational Summary Failed",
      timestamp: new Date().toISOString(),
      details: { error: /** @type {any} */ (error).message, defaultReply }
    });

    return defaultReply;
  }
}

/**
 * Core Orchestrator function called by Express endpoint
 * @param {string} userMessage
 * @param {any[]} history
 */
export async function processAiQuery(userMessage, history = []) {
  /** @type {any[]} */
  const debugLogs = [];
  // 1. Parse intent using conversation history
  const params = await parseIntent(userMessage, history, debugLogs);

  // 2. Query Database
  let tenders = await searchDatabase(params, userMessage, debugLogs);

  // Fallback: If no results found, let's look up all active live tenders so we at least return something nice if it was a broad query
  // BUT only if there was no date filter specified!
  const hasDateFilter = params.date_filter && params.date_filter.operator !== null;
  const hasAnyFilter = (params.districts && params.districts.length > 0) || 
                       (params.organizations && params.organizations.length > 0) || 
                       (params.categories && params.categories.length > 0) || 
                       (params.keywords && params.keywords.length > 0);
                       
  if (tenders.length === 0 && !hasDateFilter && !hasAnyFilter) {
    debugLogs.push("⚠️ No matches found and no filters specified. Executing global Live tenders fallback.");
    const tendersCollection = getCollection('tenders');
    tenders = await tendersCollection.find({ status: 'Live' }).limit(3).toArray();
    
    debugLogs.push({
      step: "5. Global Fallback Executed",
      timestamp: new Date().toISOString(),
      details: {
        liveFallbackCount: tenders.length
      }
    });
  }

  // 3. Generate natural language response using conversation history
  const message = await generateConversationalReply(userMessage, tenders, history, debugLogs);

  return {
    message,
    tenders,
    debug: debugLogs
  };
}

/**
 * Processes Chrome Extension Page QA query using OpenAI
 * @param {string} pageContent
 * @param {string} question
 * @param {any[]} history
 */
export async function processPageQa(pageContent, question, history = []) {
  try {
    const systemPrompt = `You are a helpful and modern AI chatbot extension.
You are reading the user's active browser tab/web page content.
Your goal is to answer the user's questions based on the provided page content.
If the answer is not in the page content, use your general knowledge but clearly state that it is not explicitly mentioned on the page.

Active Page Content:
"""
${pageContent}
"""`;

    // Map history to OpenAI message format
    const formattedHistory = history.map(item => {
      /** @type {"user" | "assistant"} */
      const role = item.role === 'ai' || item.role === 'assistant' ? 'assistant' : 'user';
      return {
        role,
        content: item.content || item.text
      };
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: question }
      ],
      temperature: 0.3
    });

    return completion.choices[0]?.message?.content || 'No response generated.';
  } catch (error) {
    console.error('❌ Failed to process page QA with OpenAI:', error);
    throw error;
  }
}

