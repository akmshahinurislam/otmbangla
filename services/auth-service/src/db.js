import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/otm_bangla_db';

/** @type {import('mongodb').Db | null} */
let db = null;
/** @type {MongoClient | null} */
let client = null;

import bcrypt from 'bcryptjs';

const DEFAULT_PROJECTS = [
  {
    id: 'p-1',
    name: 'Dhaka Elevated Expressway - Sec 4',
    code: 'DEE-S4',
    location: 'Airport Road, Dhaka',
    budget: 850000,
    ownerEmail: 'admin@otmbangla.com',
    teamEmails: ['karim@project.com', 'hasan@project.com']
  },
  {
    id: 'p-2',
    name: 'LGED Bridge Construction - Tangail',
    code: 'LBC-TG',
    location: 'Mirzapur, Tangail',
    budget: 350000,
    ownerEmail: 'admin@otmbangla.com',
    teamEmails: ['subrata@project.com', 'karim@project.com']
  }
];

const DEFAULT_TEAM = [
  {
    email: 'karim@project.com',
    name: 'Karim Uddin',
    role: 'Project Manager',
    phone: '01711223344'
  },
  {
    email: 'hasan@project.com',
    name: 'Hasan Ali',
    role: 'Supervisor',
    phone: '01811556677'
  },
  {
    email: 'subrata@project.com',
    name: 'Subrata Roy',
    role: 'Site Engineer',
    phone: '01911889900'
  }
];

const DEFAULT_ALLOCATIONS = [
  {
    id: 'a-1',
    projectCode: 'DEE-S4',
    teamEmail: 'karim@project.com',
    amount: 500000,
    date: '2026-05-20',
    method: 'Bank Transfer',
    notes: 'Initial cash advanced for civil foundation materials.'
  },
  {
    id: 'a-2',
    projectCode: 'DEE-S4',
    teamEmail: 'hasan@project.com',
    amount: 100000,
    date: '2026-05-22',
    method: 'bKash',
    notes: 'Site supervisor petty cash.'
  },
  {
    id: 'a-3',
    projectCode: 'LBC-TG',
    teamEmail: 'subrata@project.com',
    amount: 150000,
    date: '2026-05-25',
    method: 'Nagad',
    notes: 'Cash advanced for local sand supply.'
  },
  {
    id: 'a-4',
    projectCode: 'LBC-TG',
    teamEmail: 'karim@project.com',
    amount: 200000,
    date: '2026-05-28',
    method: 'Bank Transfer',
    notes: 'Cash advanced to Karim for Tangail project initial layout.'
  }
];

const DEFAULT_EXPENSES = [
  {
    id: 'e-1',
    projectCode: 'DEE-S4',
    teamEmail: 'karim@project.com',
    title: '500 Bags of Holcim Cement',
    amount: 270000,
    category: 'Materials',
    date: '2026-05-22',
    type: 'cash',
    notes: 'Cement purchased from local stockist. Cash payment.',
    receiptMockIdx: 0
  },
  {
    id: 'e-2',
    projectCode: 'DEE-S4',
    teamEmail: 'karim@project.com',
    title: 'Site labor wages Week 21',
    amount: 100000,
    category: 'Labor',
    date: '2026-05-24',
    type: 'cash',
    notes: 'Paid 25 labor workers for concrete casting work.'
  },
  {
    id: 'e-3',
    projectCode: 'DEE-S4',
    teamEmail: 'karim@project.com',
    title: '3 Tons Reinforcing Steel Rods',
    amount: 290000,
    category: 'Materials',
    date: '2026-05-26',
    type: 'baki',
    vendor: 'Messrs Bismillah Steel, Dhaka',
    notes: 'Rods delivered on site. Credit terms approved by owner.',
    receiptMockIdx: 1,
    isSettled: false
  },
  {
    id: 'e-4',
    projectCode: 'LBC-TG',
    teamEmail: 'subrata@project.com',
    title: 'Excavator Rent (2 Days)',
    amount: 60000,
    category: 'Equipment',
    date: '2026-05-27',
    type: 'baki',
    vendor: 'Dacca Machinery Hire, Tangail',
    notes: 'Bridge approach excavation. Payment requested by supplier.',
    isSettled: false
  },
  {
    id: 'e-5',
    projectCode: 'DEE-S4',
    teamEmail: 'karim@project.com',
    title: 'Transport truck fuel charge',
    amount: 25000,
    category: 'Transport',
    date: '2026-06-01',
    type: 'cash',
    notes: 'Diesel purchase for soil carrying dumper truck.',
    receiptMockIdx: 2
  },
  {
    id: 'e-6',
    projectCode: 'LBC-TG',
    teamEmail: 'subrata@project.com',
    title: 'Local Sand Delivery - 4 Trucks',
    amount: 55000,
    category: 'Materials',
    date: '2026-06-02',
    type: 'cash',
    notes: 'Coarse sand supply for structural concrete mix.'
  },
  {
    id: 'e-7',
    projectCode: 'LBC-TG',
    teamEmail: 'karim@project.com',
    title: 'Site office rent and utilities',
    amount: 30000,
    category: 'Utilities',
    date: '2026-06-02',
    type: 'cash',
    notes: 'Paid monthly office advance at Tangail site.'
  }
];

/**
 * @param {import('mongodb').Db} db
 */
async function seedDatabase(db) {
  try {
    const projectsCol = db.collection('projects');
    const projectCount = await projectsCol.countDocuments();
    if (projectCount === 0) {
      console.log('🌱 Seeding default projects...');
      await projectsCol.insertMany(DEFAULT_PROJECTS);
    }

    const allocationsCol = db.collection('allocations');
    const allocationCount = await allocationsCol.countDocuments();
    if (allocationCount === 0) {
      console.log('🌱 Seeding default allocations...');
      await allocationsCol.insertMany(DEFAULT_ALLOCATIONS);
    }

    const expensesCol = db.collection('expenses');
    const expenseCount = await expensesCol.countDocuments();
    if (expenseCount === 0) {
      console.log('🌱 Seeding default expenses...');
      await expensesCol.insertMany(DEFAULT_EXPENSES);
    }

    const usersCol = db.collection('users');
    const pmCount = await usersCol.countDocuments({ role: { $in: ['Project Manager', 'Site Engineer', 'Supervisor', 'Accountant'] } });
    if (pmCount === 0) {
      console.log('🌱 Seeding default team users...');
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      for (const member of DEFAULT_TEAM) {
        const existing = await usersCol.findOne({ email: member.email });
        if (!existing) {
          await usersCol.insertOne({
            name: member.name,
            email: member.email,
            phone: member.phone,
            role: member.role,
            password: hashedPassword,
            status: 'Active',
            createdAt: new Date(),
            failedLoginAttempts: 0
          });
        }
      }
    }

    const existingAdmin = await usersCol.findOne({ email: 'admin@otmbangla.com' });
    if (!existingAdmin) {
      console.log('🌱 Seeding default admin user...');
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await usersCol.insertOne({
        name: 'Owner Admin',
        email: 'admin@otmbangla.com',
        phone: '01800000000',
        role: 'Owner',
        password: hashedPassword,
        status: 'Active',
        createdAt: new Date(),
        failedLoginAttempts: 0
      });
    }
  } catch (err) {
    console.error('❌ Error during database seeding:', err);
  }
}

export async function initializeDatabase() {
  try {
    const maskedUri = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`🔌 Connecting to MongoDB at ${maskedUri}...`);

    client = await MongoClient.connect(uri);
    db = client.db();

    console.log('🔨 Ensuring unique indexes exist on "users" collection...');
    const users = db.collection('users');
    
    await users.createIndex({ phone: 1 }, { unique: true });
    await users.createIndex({ email: 1 }, { unique: true });

    // Seed database items
    await seedDatabase(db);

    console.log('✅ MongoDB Database and unique indexes verified successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB Database:', error);
    process.exit(1);
  }
}

/**
 * Get a specific collection from the database
 * @param {string} name
 */
export function getCollection(name) {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db.collection(name);
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (client) {
    await client.close();
  }
}


