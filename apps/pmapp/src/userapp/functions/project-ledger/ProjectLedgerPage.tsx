import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Users, TrendingUp, DollarSign, AlertCircle, Check, X, Send, 
  Smartphone, Laptop, ChevronRight, Image as ImageIcon, Receipt, 
  Calendar, Building, MapPin, CreditCard, HelpCircle, UserPlus, RefreshCw,
  Trash2, ArrowUpRight, ArrowDownLeft, Copy
} from 'lucide-react';
import { getApiUrl } from '../../shared/config';

// --- TYPES ---
interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  budget: number;
  ownerEmail: string;
  teamEmails: string[];
}

interface TeamMember {
  email: string;
  name: string;
  role: 'Project Manager' | 'Site Engineer' | 'Supervisor' | 'Accountant';
  phone: string;
}

interface Allocation {
  id: string;
  projectCode: string;
  teamEmail: string;
  amount: number;
  date: string;
  method: 'bKash' | 'Nagad' | 'Bank Transfer' | 'Cash Handover';
  notes?: string;
}

interface DuePayment {
  id: string;
  amount: number;
  date: string;
  method: 'direct' | 'pm';
  notes?: string;
}

interface Expense {
  id: string;
  projectCode: string;
  teamEmail: string;
  title: string;
  amount: number;
  category: 'Materials' | 'Labor' | 'Transport' | 'Food' | 'Equipment' | 'Utilities' | 'Others';
  date: string;
  type: 'cash' | 'baki';
  vendor?: string;
  notes?: string;
  receiptMockIdx?: number;
  isSettled?: boolean; // Scenario A flag
  settleMethod?: 'direct' | 'pm'; // How the due was settled
  payments?: DuePayment[];
}

// Pre-defined receipt mockups
const MOCK_RECEIPT_FILES = [
  'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=300&q=80',
];

// Default mockup data
const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'p-1',
    name: 'Dhaka Elevated Expressway - Sec 4',
    code: 'DEE-S4',
    location: 'Airport Road, Dhaka',
    budget: 850000, // Reduced slightly to make exceeding 100% budget extremely easy to trigger in demo!
    ownerEmail: 'admin@otmbangla.com',
    teamEmails: ['karim@project.com', 'hasan@project.com']
  },
  {
    id: 'p-2',
    name: 'LGED Bridge Construction - Tangail',
    code: 'LBC-TG',
    location: 'Mirzapur, Tangail',
    budget: 350000, // Lower budget to demonstrate over-budget warnings instantly
    ownerEmail: 'admin@otmbangla.com',
    teamEmails: ['subrata@project.com', 'karim@project.com']
  }
];

const DEFAULT_TEAM: TeamMember[] = [
  {
    email: 'karim@project.com',
    name: 'Karim Uddin',
    role: 'Project Manager',
    phone: '+8801711223344'
  },
  {
    email: 'hasan@project.com',
    name: 'Hasan Ali',
    role: 'Supervisor',
    phone: '+8801811556677'
  },
  {
    email: 'subrata@project.com',
    name: 'Subrata Roy',
    role: 'Site Engineer',
    phone: '+8801911889900'
  }
];

const DEFAULT_ALLOCATIONS: Allocation[] = [
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

const DEFAULT_EXPENSES: Expense[] = [
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

// --- TRANSLATIONS DICTIONARY ---
const TRANSLATIONS = {
  bn: {
    contractorModule: 'ঠিকাদার মডিউল',
    autoApproveActive: 'সরাসরি খতিয়ান ভুক্তি',
    pageTitle: 'প্রজেক্ট ও টিম লেজার',
    pageSubtitle: 'প্রজেক্টের নগদ প্রবাহ ট্র্যাক করুন, মাঠ পর্যায়ের দল নিযুক্ত করুন এবং সাইটের দৈনিক খরচ ও বকেয়া হিসাব (*বাকি খরচ*) পরিচালনা করুন।',
    filterProject: 'প্রজেক্ট ফিল্টার:',
    allProjects: 'সকল প্রজেক্ট',
    newProject: 'নতুন প্রজেক্ট',
    invitePm: 'টিম মেম্বার আমন্ত্রণ',
    sendCash: 'নগদ টাকা পাঠান',
    metricBudget: 'প্রজেক্ট বাজেট',
    metricAdvanced: 'প্রদত্ত অগ্রিম তহবিল',
    metricSpent: 'নগদ খরচ (ব্যয়)',
    metricDues: 'বকেয়া পাওনা (বাকি)',
    descBudget: 'চুক্তিভিত্তিক মোট মূল্য',
    descAdvanced: 'মাঠ পর্যায়ে প্রজেক্টে দেয়া অগ্রিম টাকা',
    descSpent: 'সাইট থেকে মোট নগদ খরচ',
    descDues: 'সরবরাহকারীদের বকেয়া বিল',
    projectComparison: 'প্রজেক্ট বাজেট বনাম খরচের তুলনা',
    activeProjects: 'চলতি প্রজেক্টসমূহ:',
    totalSpentLabel: 'মোট খরচ:',
    budgetLabel: 'বাজেট',
    legendCash: 'নগদ খরচ',
    legendBaki: 'বাকি (বকেয়া)',
    legendPmCash: 'PM-এর কাছে নগদ',
    budgetUsed: 'বাজেট ব্যবহৃত হয়েছে',
    ledgerTitle: 'সাধারণ ক্যাশ ফ্লো ও খরচ লেজার',
    ledgerSubtitle: 'আয় ও ব্যয়ের সম্পূর্ণ বিবরণী',
    colDate: 'তারিখ',
    colPm: 'প্রজেক্ট / ম্যানেজার',
    colDesc: 'বিবরণ',
    colCategory: 'ক্যাটাগরি',
    colType: 'ধরণ',
    colAmount: 'পরিমাণ',
    colAction: 'অ্যাকশন',
    typeAlloc: 'তহবিল বরাদ্দ',
    typeBaki: 'বিক্রেতা বকেয়া (বাকি)',
    typeCash: 'নগদ খরচ',
    launchMobile: 'প্রজেক্ট ম্যানেজার মোবাইল অ্যাপ সিমুলেটর চালু করুন',
    simTitle: 'সুপারভাইজার মোবাইল সিমুলেটর',
    simInstructions: 'এই ফোন ফ্রেমটি সাইট পিএম-এর মোবাইল অ্যাপের অনুরূপ। মাঠ পর্যায়ের ম্যানেজাররা সরাসরি এখান থেকে সাইটের খরচ লোগ করতে পারেন।',
    simNoteHeader: 'লাইভ সিঙ্ক ডেমো নির্দেশিকা:',
    simNoteStep1: '১. নিচে একজন সুপারভাইজার নির্বাচন করুন।',
    simNoteStep2: '২. মোবাইল স্ক্রিনে প্রজেক্ট সিলেক্ট করুন।',
    simNoteStep3: '৩. দৈনিক নগদ অথবা বাকি খরচ এন্ট্রি দিন।',
    simNoteStep4: '৪. সাবমিট করুন; তা সাথে সাথে অ্যাডমিন লেজারে আপডেট হবে।',
    labelSelectPmSim: 'সিমুলেট করার জন্য পিএম নির্বাচন:',
    assignedProjects: 'বরাদ্দকৃত প্রজেক্ট:',
    overallWallet: 'মোট ক্যাশ ব্যালেন্স:',
    btnBackDashboard: '← ওনার ড্যাশবোর্ডে ফিরুন',
    simBalanceTitle: 'প্রজেক্ট ফান্ড হিসাব',
    simCashFunds: 'নগদ তহবিল (Project Cash)',
    simBakiOutstanding: 'বকেয়া বাকি (Project Baki)',
    labelSelectProjectMobile: 'প্রজেক্ট নির্বাচন করুন:',
    labelMobileTitle: 'খরচের বিবরণ / Item Title',
    placeholderMobileTitle: 'যেমন: ৫০০ বস্তা সিমেন্ট, বালু ভরাট',
    labelMobileAmount: 'খরচ টাকা / Amount (BDT)',
    labelMobileCategory: 'ক্যাটাগরি / Category',
    labelMobilePaymentType: 'পরিশোধের ধরণ / Payment Type',
    btnSimCash: '🟢 নগদ খরচ (Nagad Cash)',
    btnSimBaki: '🔴 বাকি খরচ (Baki / Due)',
    labelVendor: 'বাকি বিক্রেতার নাম / Vendor Name',
    placeholderVendor: 'যেমন: মেসার্স বিসমিল্লাহ স্টিল',
    labelVoucher: 'ভাউচার ছবি / Receipt Voucher',
    btnCamera: 'ক্যামেরা রশিদ নির্বাচন করুন',
    labelNotes: 'অতিরিক্ত নোট / Notes',
    placeholderNotes: 'কোন অতিরিক্ত মন্তব্য থাকলে...',
    btnSubmitExpense: 'খরচ জমা দিন (Submit Expenditure)',
    simLoggedTitle: 'এই প্রজেক্টের খরচ লোগ (Logged)',
    noSimExpenses: 'এই প্রজেক্টে এখনও কোন খরচ লোগ করা হয়নি।',
    activeLedgerLabel: 'সক্রিয় লেজার',
    modalCreateProj: 'নতুন প্রজেক্ট তৈরি করুন',
    projName: 'প্রজেক্টের নাম',
    projCode: 'প্রজেক্ট কোড',
    projLocation: 'প্রজেক্টের অবস্থান',
    projBudget: 'চুক্তিভিত্তিক বাজেট (টাকা)',
    btnCancel: 'বাতিল',
    btnCreate: 'তৈরি করুন',
    modalInvitePm: 'মাঠ পর্যায়ের পিএম আমন্ত্রণ',
    pmEmail: 'ম্যানেজার ইমেইল',
    pmName: 'পূর্ণ নাম',
    pmRole: 'পদবী',
    assignProjects: 'প্রজেক্ট বরাদ্দ করুন (একাধিক নির্বাচনযোগ্য)',
    pmMobile: 'মোবাইল নম্বর',
    btnInvite: 'আমন্ত্রণ পাঠান',
    modalSendCash: 'সাইটে নগদ তহবিল বরাদ্দ',
    allocPm: 'গ্রহীতা ম্যানেজার নির্বাচন',
    allocProj: 'বরাদ্দকৃত প্রজেক্ট নির্বাচন',
    allocAmount: 'টাকার পরিমাণ (BDT)',
    allocMethod: 'পাঠানোর মাধ্যম',
    allocNotes: 'লেনদেন রেফারেন্স / নোট',
    btnConfirm: 'বরাদ্দ নিশ্চিত করুন',
    catMaterials: 'রড/সিমেন্ট/বালু (Materials)',
    catLabor: 'লেবার মজুরি (Labor Wages)',
    catTransport: 'পরিবহন ভাড়া (Transport)',
    catFood: 'খাবার খরচ (Staff Food)',
    catEquipment: 'যন্ত্রপাতি ভাড়া (Equipment rent)',
    catUtilities: 'অফিস/ইউটিলিটি (Utilities)',
    catOthers: 'অন্যান্য খরচ (Others)',
    resetAlert: 'প্রজেক্ট লেজারের সমস্ত ডেমো ডেটা রিসেট করতে চান?',
    btnSettleDues: 'বকেয়া পরিশোধ করুন',
    modalSettleDuesTitle: 'বকেয়া বিলসমূহ এবং পরিশোধ পোর্টাল',
    processDirect: 'সরাসরি বিক্রেতা (Direct)',
    processPm: 'পিএম ওয়ালেট (To PM)',
    btnSettle: 'পরিশোধ করুন',
    noDuesMsg: 'সকল প্রজেক্টের সমস্ত বকেয়া পরিশোধ করা হয়েছে!',
    colProcess: 'মাধ্যম (Process)',
    voidAlert: 'এই লেনদেনটি লেজার থেকে স্থায়ীভাবে মুছে ফেলতে চান?',
    cashWarning: 'সতর্কতা: প্রজেক্টের নগদ তহবিলের চেয়ে খরচের পরিমাণ বেশি। তবুও কি সাবমিট করতে চান?',
    successCashMsg: 'প্রজেক্ট {code}-এর জন্য ৳{amount} নগদ খরচ সফলভাবে লোগ করা হয়েছে!',
    successBakiMsg: 'প্রজেক্ট {code}-এর জন্য {vendor}-এর কাছে ৳{amount} বাকি খরচ লোগ করা হয়েছে!'
  },
  en: {
    contractorModule: 'Contractor Module',
    autoApproveActive: 'Direct Ledger Entry',
    pageTitle: 'Project & Team Ledger',
    pageSubtitle: 'Track project cash flow, assign field teams to multiple projects, and view daily field expenditures & dues (*Baki Khoroch*).',
    filterProject: 'Filter Project:',
    allProjects: 'All Projects',
    newProject: 'New Project',
    invitePm: 'Invite PM',
    sendCash: 'Send Cash',
    metricBudget: 'Project Budget',
    metricAdvanced: 'Funds Advanced',
    metricSpent: 'Spent (Cash)',
    metricDues: 'Supplier Dues (Baki)',
    descBudget: 'Total contractual value',
    descAdvanced: 'Total cash advanced to field PMs',
    descSpent: 'Deducted from site cash',
    descDues: 'Outstanding credit dues',
    projectComparison: 'Project Budgets vs Expenditure Comparison',
    activeProjects: 'Active Projects:',
    totalSpentLabel: 'Total Spent:',
    budgetLabel: 'Budget',
    legendCash: 'Cash Spent',
    legendBaki: 'Baki (Due)',
    legendPmCash: 'PM Cash-on-Hand',
    budgetUsed: 'of Budget Used',
    ledgerTitle: 'General Cash Flow & Expense Ledger',
    ledgerSubtitle: 'Income & Expenditure Ledger',
    colDate: 'Date',
    colPm: 'Project / Team PM',
    colDesc: 'Description',
    colCategory: 'Category',
    colType: 'Type',
    colAmount: 'Amount',
    colAction: 'Action',
    typeAlloc: 'Allocated Funds',
    typeBaki: 'Supplier Baki',
    typeCash: 'Nagad Cash Spent',
    launchMobile: 'Launch Project Manager Mobile App Simulator',
    simTitle: 'Supervisor Mobile Simulator',
    simInstructions: 'This phone frame simulates the Project Manager Site Companion. Field managers log items directly on their phones.',
    simNoteHeader: 'Live Sync Demonstration Guide:',
    simNoteStep1: '1. Select a supervisor below.',
    simNoteStep2: '2. Switch projects inside the phone frame.',
    simNoteStep3: '3. Log daily cash expenses or credit dues.',
    simNoteStep4: '4. Submit. Ledger updates instantly.',
    labelSelectPmSim: 'Select PM to Simulate:',
    assignedProjects: 'Assigned Projects:',
    overallWallet: 'Overall Wallet Cash:',
    btnBackDashboard: '← Back to Owner Dashboard',
    simBalanceTitle: 'Project Fund Summary',
    simCashFunds: 'Project Cash',
    simBakiOutstanding: 'Project Baki',
    labelSelectProjectMobile: 'Select Project:',
    labelMobileTitle: 'Item Title / Detail',
    placeholderMobileTitle: 'e.g. 500 Bags Cement, Sand delivery',
    labelMobileAmount: 'Amount (BDT)',
    labelMobileCategory: 'Category',
    labelMobilePaymentType: 'Payment Type',
    btnSimCash: '🟢 Nagad Cash (Cash)',
    btnSimBaki: '🔴 Baki / Due (Credit)',
    labelVendor: 'Vendor / Supplier Name',
    placeholderVendor: 'e.g. Messrs Bismillah Steel',
    labelVoucher: 'Upload Receipt Slip',
    btnCamera: 'Select Camera Receipt',
    labelNotes: 'Notes',
    placeholderNotes: 'Enter optional comments...',
    btnSubmitExpense: 'Submit Expenditure',
    simLoggedTitle: 'Project Expense Log',
    noSimExpenses: 'No expenses logged for this project yet.',
    activeLedgerLabel: 'Active Ledger',
    modalCreateProj: 'Create New Project Ledger',
    projName: 'Project Name',
    projCode: 'Project Code ID',
    projLocation: 'Project Location',
    projBudget: 'Contractual Budget (BDT)',
    btnCancel: 'Cancel',
    btnCreate: 'Create Project',
    modalInvitePm: 'Invite Field PM / Assign Projects',
    pmEmail: 'Manager Email',
    pmName: 'Full Name',
    pmRole: 'Role Designation',
    assignProjects: 'Assign to Projects (Select Multiple)',
    pmMobile: 'Mobile Number',
    btnInvite: 'Invite Manager',
    modalSendCash: 'Allocate Project Funds / Site Cash',
    allocPm: 'Select Recipient PM',
    allocProj: 'Select Project Destination',
    allocAmount: 'Amount (BDT)',
    allocMethod: 'Transfer Method',
    allocNotes: 'Transaction Notes / Reference',
    btnConfirm: 'Confirm Transfer',
    catMaterials: 'Materials',
    catLabor: 'Labor Wages',
    catTransport: 'Transport',
    catFood: 'Staff Food',
    catEquipment: 'Equipment Rent',
    catUtilities: 'Utilities',
    catOthers: 'Others',
    resetAlert: 'Are you sure you want to reset all project ledger data to default demo states?',
    btnSettleDues: 'Settle Dues',
    modalSettleDuesTitle: 'Outstanding Bills & Settlement Portal',
    processDirect: 'Direct Vendor',
    processPm: 'To the PM',
    btnSettle: 'Settle',
    noDuesMsg: 'All outstanding project dues have been settled!',
    colProcess: 'Process',
    voidAlert: 'Voiding this transaction will permanently delete this expenditure entry. Proceed?',
    cashWarning: 'Warning: The PM cash balance is lower than this cash expense. Do you want to submit anyway?',
    successCashMsg: 'Nagad expense of BDT {amount} logged for Project {code}!',
    successBakiMsg: 'Baki/Due of BDT {amount} logged to {vendor} for Project {code}!'
  }
};

export function ProjectLedgerPage({
  lang: propLang = 'bn',
  onLangChange,
  isStandaloneMobileApp = false,
  onLogout,
  user,
}: {
  lang?: string;
  onLangChange?: (lang: string) => void;
  isStandaloneMobileApp?: boolean;
  onLogout?: () => void;
  user?: { name: string; phone: string; email: string; role?: string } | null;
} = {}) {
  const lang = propLang === 'en' ? 'en' : 'bn';

  // Translation helper
  const t = (key: keyof typeof TRANSLATIONS.bn) => {
    return TRANSLATIONS[lang][key] || TRANSLATIONS.en[key] || key;
  };

  // --- DATABASE STATES ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const fetchLedgerData = async () => {
    try {
      const email = user?.email || '';
      const role = user?.role || '';
      
      const projRes = await fetch(`${getApiUrl(3001)}/api/ledger/projects?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
      const teamRes = await fetch(`${getApiUrl(3001)}/api/ledger/team`);
      const allocRes = await fetch(`${getApiUrl(3001)}/api/ledger/allocations?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
      const expRes = await fetch(`${getApiUrl(3001)}/api/ledger/expenses?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`);
      
      if (projRes.ok) setProjects(await projRes.json());
      if (teamRes.ok) setTeam(await teamRes.json());
      if (allocRes.ok) setAllocations(await allocRes.json());
      if (expRes.ok) setExpenses(await expRes.json());
    } catch (err) {
      console.error("Failed to fetch ledger data", err);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, [user]);

  // --- UI STATES ---
  const [activeTab, setActiveTab] = useState<'desktop' | 'mobile'>(
    isStandaloneMobileApp ? 'mobile' : 'desktop'
  );
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [dateFilterType, setDateFilterType] = useState<string>('ALL'); // 'ALL', 'TODAY', 'YESTERDAY', 'LAST_7', 'LAST_30', 'THIS_MONTH', 'LAST_MONTH', 'CUSTOM'
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [showSettleDuesModal, setShowSettleDuesModal] = useState(false);
  const [settleProcesses, setSettleProcesses] = useState<Record<string, 'direct' | 'pm'>>({});
  const [inlineSettleProcess, setInlineSettleProcess] = useState<'direct' | 'pm'>('direct');
  const [settleConfirmExpense, setSettleConfirmExpense] = useState<Expense | null>(null);
  const [settleAmountInput, setSettleAmountInput] = useState<string>('');
  const [bulkSettleAmounts, setBulkSettleAmounts] = useState<Record<string, string>>({});

  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const manageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setIsDateDropdownOpen(false);
      }
      if (manageMenuRef.current && !manageMenuRef.current.contains(event.target as Node)) {
        setIsManageMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals state
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showInviteMemberModal, setShowInviteMemberModal] = useState(false);
  const [showAllocateCashModal, setShowAllocateCashModal] = useState(false);
  const [inviteStatusModal, setInviteStatusModal] = useState<{
    show: boolean;
    loading?: boolean;
    success?: boolean;
    title: string;
    message: string;
    link?: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // New forms states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [newProjectBudget, setNewProjectBudget] = useState('');

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Project Manager' | 'Site Engineer' | 'Supervisor' | 'Accountant'>('Project Manager');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberProjectCodes, setNewMemberProjectCodes] = useState<string[]>([]);

  const [allocAmount, setAllocAmount] = useState('');
  const [allocEmail, setAllocEmail] = useState('');
  const [allocProjectCode, setAllocProjectCode] = useState('');
  const [allocMethod, setAllocMethod] = useState<'bKash' | 'Nagad' | 'Bank Transfer' | 'Cash Handover'>('Bank Transfer');
  const [allocNotes, setAllocNotes] = useState('');

  // Owner/Admin Log Expense Modal states
  const [showAdminExpenseModal, setShowAdminExpenseModal] = useState(false);
  const [adminExpenseProjectCode, setAdminExpenseProjectCode] = useState('');
  const [adminExpenseTitle, setAdminExpenseTitle] = useState('');
  const [adminExpenseAmount, setAdminExpenseAmount] = useState('');
  const [adminExpenseType, setAdminExpenseType] = useState<'cash' | 'baki'>('cash');
  const [adminExpenseVendor, setAdminExpenseVendor] = useState('');
  const [adminExpenseNotes, setAdminExpenseNotes] = useState('');

  const handleAdminSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminExpenseProjectCode || !adminExpenseTitle || !adminExpenseAmount) return;

    try {
      const res = await fetch(`${getApiUrl(3001)}/api/ledger/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode: adminExpenseProjectCode,
          teamEmail: user?.email || 'admin@otmbangla.com',
          title: adminExpenseTitle,
          amount: parseFloat(adminExpenseAmount),
          category: 'Others',
          date: new Date().toISOString().split('T')[0],
          type: adminExpenseType,
          vendor: adminExpenseType === 'baki' ? adminExpenseVendor : undefined,
          notes: adminExpenseNotes || undefined
        })
      });
      if (res.ok) {
        await fetchLedgerData();
        setShowAdminExpenseModal(false);
        setAdminExpenseProjectCode('');
        setAdminExpenseTitle('');
        setAdminExpenseAmount('');
        setAdminExpenseType('cash');
        setAdminExpenseVendor('');
        setAdminExpenseNotes('');
        alert(lang === 'bn' ? 'খরচ সফলভাবে লোগ করা হয়েছে!' : 'Expense logged successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit expense');
      }
    } catch (err) {
      console.error("Error submitting expense:", err);
    }
  };

  // Mobile App Simulator Form states
  const [simActivePmEmail, setSimActivePmEmail] = useState<string>(() => {
    if (isStandaloneMobileApp && user?.email) {
      return user.email;
    }
    return DEFAULT_TEAM[0].email;
  });
  const [simActiveProjectCode, setSimActiveProjectCode] = useState<string>('');
  
  const [simExpenseTitle, setSimExpenseTitle] = useState('');
  const [simExpenseAmount, setSimExpenseAmount] = useState('');
  const [simExpenseCategory, setSimExpenseCategory] = useState<'Materials' | 'Labor' | 'Transport' | 'Food' | 'Equipment' | 'Utilities' | 'Others'>('Materials');
  const [simExpenseType, setSimExpenseType] = useState<'cash' | 'baki'>('cash');
  const [simExpenseVendor, setSimExpenseVendor] = useState('');
  const [simExpenseNotes, setSimExpenseNotes] = useState('');
  const [simExpenseReceiptIdx, setSimExpenseReceiptIdx] = useState<number | null>(null);
  const [simNotifyMsg, setSimNotifyMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  
  // Interactive Demo Sandbox States
  const [demoNotice, setDemoNotice] = useState<{ type: 'scenario-a' | 'over-budget'; messageBn: string; messageEn: string } | null>(null);

  // Programmatic trigger for Scenario A Demo
  const handleTriggerScenarioADemo = () => {
    const projCode = 'LBC-TG';
    const email = 'subrata@project.com';
    
    const newExp: Expense = {
      id: 'demo-baki-' + Date.now(),
      projectCode: projCode,
      teamEmail: email,
      title: lang === 'bn' ? '৬ টন রড সরবরাহ (সিনারিও A ডেমো)' : '6 Tons Steel Rods (Scenario A Demo)',
      amount: 540000,
      category: 'Materials',
      date: new Date().toISOString().split('T')[0],
      type: 'baki',
      vendor: lang === 'bn' ? 'মেসার্স তিতাস স্টিল' : 'Messrs Titas Steel',
      notes: lang === 'bn' ? 'ওনারের অ্যাকাউন্ট থেকে সরাসরি পরিশোধের জন্য প্রস্তুত বকেয়া বিল।' : 'Outstanding bill ready to be settled directly from Owner account.',
      isSettled: false
    };

    setExpenses(prev => [newExp, ...prev.filter(e => !e.id.startsWith('demo-'))]);
    setSelectedProjectCode('ALL'); 
    setDemoNotice({
      type: 'scenario-a',
      messageBn: '১. নিচে "সাধারণ ক্যাশ ফ্লো ও খরচ লেজার" টেবিলে নতুন লেনদেনটি দেখুন।\n২. টেবিলের ডান পাশে সবুজ "পরিশোধ করুন (Scenario A)" বাটনে ক্লিক করুন।\n৩. পরিশোধের পর লক্ষ্য করুন: "বকেয়া পাওনা" কমে গেছে কিন্তু সুব্রতর সাইটের নগদ তহবিল কমেনি!',
      messageEn: '1. Scroll down to the "General Cash Flow & Expense Ledger" table.\n2. Click the green "Settle Due (Scenario A)" button on the right side of the row.\n3. Observe: Supplier Dues decreases but Subrata\'s Site Cash wallet is NOT deducted!'
    });
  };

  // Programmatic trigger for Budget Overrun Demo
  const handleTriggerOverBudgetDemo = () => {
    const projCode = 'LBC-TG';
    const email = 'subrata@project.com';

    const newExp: Expense = {
      id: 'demo-overbudget-' + Date.now(),
      projectCode: projCode,
      teamEmail: email,
      title: lang === 'bn' ? 'ভেকু/এক্সক্যাভেটর ক্রয় (বাজেট ওভাররান ডেমো)' : 'Excavator Purchase (Budget Overrun Demo)',
      amount: 400000,
      category: 'Equipment',
      date: new Date().toISOString().split('T')[0],
      type: 'cash',
      notes: lang === 'bn' ? 'বাজেট সীমা অতিক্রম দেখতে এই বড় নগদ খরচটি যোগ করা হয়েছে।' : 'Large cash expenditure added to demonstrate budget limit exceedance.',
    };

    setExpenses(prev => [newExp, ...prev.filter(e => !e.id.startsWith('demo-'))]);
    setSelectedProjectCode('ALL');
    setDemoNotice({
      type: 'over-budget',
      messageBn: '১. প্রজেক্ট বাজেট ও খরচের তুলনা চার্টে "LBC-TG" প্রজেক্টটি দেখুন।\n২. বাজেট অতিরিক্ত হওয়ায় প্রজেক্টের রানিং খরচ বারটি এখন লাল-হলুদ স্ট্রাইপ অ্যানিমেশনসহ জ্বলছে!\n৩. "⚠️ বাজেট অতিরিক্ত!" লাল সতর্কবার্তা প্রদর্শন করছে।',
      messageEn: '1. Look at project "LBC-TG" in the Budget vs Expenditure comparison section.\n2. Since the budget is exceeded, the progress bar now flashes with red-amber candy stripes!\n3. A red "⚠️ Over Budget!" warning badge is now active.'
    });
  };

  // Reset function to default mock state
  const handleResetData = () => {
    if (window.confirm(t('resetAlert'))) {
      setProjects(DEFAULT_PROJECTS);
      setTeam(DEFAULT_TEAM);
      setAllocations(DEFAULT_ALLOCATIONS);
      setExpenses(DEFAULT_EXPENSES);
      setSimActivePmEmail(DEFAULT_TEAM[0].email);
      setSimActiveProjectCode(DEFAULT_PROJECTS[0].code);
      setDemoNotice(null);
      alert(lang === 'bn' ? 'ডেটা সফলভাবে রিসেট হয়েছে!' : 'Data reset successfully!');
    }
  };

  // --- DYNAMIC BALANCE CALCULATIONS ---
  const getPmProjectBalance = (email: string, projectCode: string) => {
    const pmAllocations = allocations.filter(a => a.teamEmail === email && a.projectCode === projectCode);
    const pmExpenses = expenses.filter(e => e.teamEmail === email && e.projectCode === projectCode);
    const totalAllocated = pmAllocations.reduce((sum, a) => sum + a.amount, 0);
    const totalSpent = pmExpenses.reduce((sum, e) => {
      if (e.type === 'cash') {
        return sum + e.amount;
      }
      if (e.type === 'baki') {
        const pmPaymentsSum = (e.payments || [])
          .filter(p => p.method === 'pm')
          .reduce((s, p) => s + p.amount, 0);
        return sum + pmPaymentsSum;
      }
      return sum;
    }, 0);
    return totalAllocated - totalSpent;
  };

  const getPmOverallBalance = (email: string) => {
    const pmAllocations = allocations.filter(a => a.teamEmail === email);
    const pmExpenses = expenses.filter(e => e.teamEmail === email);
    const totalAllocated = pmAllocations.reduce((sum, a) => sum + a.amount, 0);
    const totalSpent = pmExpenses.reduce((sum, e) => {
      if (e.type === 'cash') {
        return sum + e.amount;
      }
      if (e.type === 'baki') {
        const pmPaymentsSum = (e.payments || [])
          .filter(p => p.method === 'pm')
          .reduce((s, p) => s + p.amount, 0);
        return sum + pmPaymentsSum;
      }
      return sum;
    }, 0);
    return totalAllocated - totalSpent;
  };

  // --- DYNAMIC PROJECT-SPECIFIC FILTERING FOR ADMIN ---
  const activeProjectsList = useMemo(() => {
    return selectedProjectCode === 'ALL' 
      ? projects 
      : projects.filter(p => p.code === selectedProjectCode);
  }, [projects, selectedProjectCode]);

  // Date Range and Preset matching function
  const matchDateRange = (itemDate: string) => {
    if (!filterStartDate && !filterEndDate) return true;
    if (filterStartDate && !filterEndDate) return itemDate === filterStartDate;
    if (!filterStartDate && filterEndDate) return itemDate === filterEndDate;
    
    const dateVal = new Date(itemDate).getTime();
    const startVal = new Date(filterStartDate).getTime();
    const endVal = new Date(filterEndDate).getTime();
    return dateVal >= startVal && dateVal <= endVal;
  };

  const applyDatePreset = (preset: string) => {
    const today = new Date('2026-06-03'); // Enforce current local time as standard reference
    let start = '';
    let end = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      start = end;
    } else if (preset === 'YESTERDAY') {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      start = yesterday.toISOString().split('T')[0];
      end = start;
    } else if (preset === 'LAST_7') {
      const past7 = new Date(today);
      past7.setDate(today.getDate() - 6);
      start = past7.toISOString().split('T')[0];
    } else if (preset === 'LAST_30') {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 29);
      start = past30.toISOString().split('T')[0];
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().split('T')[0];
    } else if (preset === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      start = firstDayLastMonth.toISOString().split('T')[0];
      end = lastDayLastMonth.toISOString().split('T')[0];
    } else if (preset === 'ALL') {
      start = '';
      end = '';
    }

    setFilterStartDate(start);
    setFilterEndDate(end);
    setDateFilterType(preset);
    if (preset !== 'CUSTOM') {
      setIsDateDropdownOpen(false);
    }
  };

  const getDateFilterLabel = () => {
    if (dateFilterType === 'ALL') return lang === 'bn' ? 'সব সময় (All Time)' : 'All Time';
    if (dateFilterType === 'TODAY') return lang === 'bn' ? 'আজ (Today)' : 'Today';
    if (dateFilterType === 'YESTERDAY') return lang === 'bn' ? 'গতকাল (Yesterday)' : 'Yesterday';
    if (dateFilterType === 'LAST_7') return lang === 'bn' ? 'গত ৭ দিন (Last 7 Days)' : 'Last 7 Days';
    if (dateFilterType === 'LAST_30') return lang === 'bn' ? 'গত ৩০ দিন (Last 30 Days)' : 'Last 30 Days';
    if (dateFilterType === 'THIS_MONTH') return lang === 'bn' ? 'এই মাস (This Month)' : 'This Month';
    if (dateFilterType === 'LAST_MONTH') return lang === 'bn' ? 'গত মাস (Last Month)' : 'Last Month';
    
    if (filterStartDate && filterEndDate) {
      return `${filterStartDate} ~ ${filterEndDate}`;
    } else if (filterStartDate) {
      return `${filterStartDate} ~`;
    } else if (filterEndDate) {
      return `~ ${filterEndDate}`;
    }
    return lang === 'bn' ? 'কাস্টম রেঞ্জ' : 'Custom Range';
  };

  const metrics = useMemo(() => {
    const filteredAllocations = allocations.filter(a => {
      const matchProject = selectedProjectCode === 'ALL' || a.projectCode === selectedProjectCode;
      return matchProject && matchDateRange(a.date);
    });

    const filteredExpenses = expenses.filter(e => {
      const matchProject = selectedProjectCode === 'ALL' || e.projectCode === selectedProjectCode;
      return matchProject && matchDateRange(e.date);
    });

    const totalBudget = activeProjectsList.reduce((acc, curr) => acc + curr.budget, 0);
    const totalAdvanced = filteredAllocations.reduce((acc, curr) => acc + curr.amount, 0);
    
    const totalCashSpent = filteredExpenses
      .filter(e => e.type === 'cash')
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Baki outstanding only counts outstanding remaining dues
    const totalBakiOutstanding = filteredExpenses
      .filter(e => e.type === 'baki')
      .reduce((acc, curr) => {
        const paidAmount = (curr.payments || []).reduce((sum, p) => sum + p.amount, 0);
        return acc + Math.max(0, curr.amount - paidAmount);
      }, 0);

    const currentSiteCashBalance = totalAdvanced - totalCashSpent;

    return {
      totalBudget,
      totalAdvanced,
      totalCashSpent,
      totalBakiOutstanding,
      currentSiteCashBalance
    };
  }, [allocations, expenses, activeProjectsList, selectedProjectCode, filterStartDate, filterEndDate]);

  // Computed general ledger items
  const ledgerItems = useMemo(() => {
    const rawAllocations = allocations.map(a => ({
      ...a,
      ledgerType: 'allocation' as const,
      title: lang === 'bn' 
        ? `${team.find(t => t.email === a.teamEmail)?.name || a.teamEmail}-কে নগদ তহবিল প্রদান`
        : `Cash Allocation to ${team.find(t => t.email === a.teamEmail)?.name || a.teamEmail}`,
      category: 'Allocation',
      type: 'cash',
      isSettled: false,
      payments: [] as DuePayment[]
    }));

    const rawExpenses = expenses.map(e => {
      const paid = (e.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
      return {
        ...e,
        ledgerType: 'expense' as const,
        method: e.type === 'baki' 
          ? (paid >= e.amount 
            ? (lang === 'bn' ? 'বকেয়া পরিশোধিত' : 'Due Settled') 
            : (paid > 0 
              ? (lang === 'bn' ? `আংশিক পরিশোধিত (বাকী ৳${(e.amount - paid).toLocaleString()})` : `Partially Settled (Remaining ৳${(e.amount - paid).toLocaleString()})`)
              : (lang === 'bn' ? 'বকেয়া খতিয়ান' : 'Credit Ledger'))) 
          : (lang === 'bn' ? 'নগদ খতিয়ান' : 'Cash Deduct')
      };
    });

    return [...rawAllocations, ...rawExpenses]
      .filter(t => {
        const matchProject = selectedProjectCode === 'ALL' || t.projectCode === selectedProjectCode;
        return matchProject && matchDateRange(t.date);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allocations, expenses, team, selectedProjectCode, filterStartDate, filterEndDate, lang]);


  // --- HANDLERS ---
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectCode || !newProjectBudget) return;

    try {
      const res = await fetch(`${getApiUrl(3001)}/api/ledger/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          code: newProjectCode.trim().toUpperCase(),
          location: newProjectLocation,
          budget: parseFloat(newProjectBudget),
          ownerEmail: user?.email || 'admin@otmbangla.com',
          teamEmails: []
        })
      });
      if (res.ok) {
        await fetchLedgerData();
        setShowAddProjectModal(false);
        setNewProjectName('');
        setNewProjectCode('');
        setNewProjectLocation('');
        setNewProjectBudget('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add project');
      }
    } catch (err) {
      console.error("Error adding project:", err);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail || !newMemberName || newMemberProjectCodes.length === 0 || !newMemberPhone) {
      alert(lang === 'bn' ? 'সবগুলো ঘর পূরণ করুন এবং অন্তত একটি প্রজেক্ট সিলেক্ট করুন।' : 'Please fill in all fields and select at least one project.');
      return;
    }

    // Reset copy state
    setLinkCopied(false);

    // Show loading modal immediately
    setInviteStatusModal({
      show: true,
      loading: true,
      title: lang === 'bn' ? 'আমন্ত্রণ পাঠানো হচ্ছে...' : 'Sending Invitation...',
      message: lang === 'bn' 
        ? 'দয়া করে অপেক্ষা করুন, ব্যাকএন্ড সার্ভার আমন্ত্রণ প্রক্রিয়া সম্পন্ন করছে।' 
        : 'Please wait while the server processes the invitation.'
    });

    try {
      const res = await fetch(`${getApiUrl(3001)}/api/auth/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMemberName,
          email: newMemberEmail.trim().toLowerCase(),
          role: newMemberRole,
          phone: newMemberPhone,
          projectCodes: newMemberProjectCodes,
          ownerEmail: user?.email || 'admin@otmbangla.com',
          app: 'pmapp'
        })
      });

      const data = await res.json();
      if (res.ok) {
        setInviteStatusModal({
          show: true,
          success: true,
          title: lang === 'bn' ? 'আমন্ত্রণ সফল' : 'Invitation Successful',
          message: lang === 'bn' 
            ? 'টিম মেম্বার সফলভাবে যুক্ত হয়েছে। প্রজেক্ট ম্যানেজার (PM) অ্যাকাউন্টটি চালু করতে নিচের লিঙ্কটি কপি করে তাকে পাঠান (যেমন: WhatsApp বা ইমেলের মাধ্যমে):'
            : 'Team member added successfully. Please copy the set-password link below and send it to the Project Manager (PM) to activate their account:',
          link: data.fallbackUrl || ''
        });
        await fetchLedgerData();
        setShowInviteMemberModal(false);
        setNewMemberEmail('');
        setNewMemberName('');
        setNewMemberRole('Project Manager');
        setNewMemberPhone('');
        setNewMemberProjectCodes([]);
      } else {
        let errMsg = data.error || '';
        if (lang === 'bn') {
          if (data.error === 'A team member with this email address already exists.') {
            errMsg = 'এই ইমেইল এড্রেস দিয়ে ইতিমধ্যেই একজন টিম মেম্বার যুক্ত আছেন।';
          } else if (data.error === 'A team member with this phone number already exists.') {
            errMsg = 'এই ফোন নম্বর দিয়ে ইতিমধ্যেই একজন টিম মেম্বার যুক্ত আছেন।';
          } else if (data.error === 'Missing required fields: email, name, role, phone are all required.') {
            errMsg = 'সবগুলো তথ্য প্রদান করা আবশ্যক (ইমেল, নাম, রোল, ফোন)।';
          } else {
            errMsg = data.error || 'আমন্ত্রণ পাঠানো যায়নি।';
          }
        }
        setInviteStatusModal({
          show: true,
          success: false,
          title: lang === 'bn' ? 'আমন্ত্রণ ব্যর্থ' : 'Invitation Failed',
          message: errMsg || (lang === 'bn' ? 'আমন্ত্রণ পাঠানো যায়নি।' : 'Failed to send invitation.')
        });
      }
    } catch (err) {
      console.error("Error inviting member:", err);
      setInviteStatusModal({
        show: true,
        success: false,
        title: lang === 'bn' ? 'আমন্ত্রণ ত্রুটি' : 'Invitation Error',
        message: lang === 'bn' ? 'নেটওয়ার্ক বা সার্ভার সমস্যা।' : 'Network or server communication error.'
      });
    }
  };

  const handleToggleProjectSelection = (code: string) => {
    if (newMemberProjectCodes.includes(code)) {
      setNewMemberProjectCodes(newMemberProjectCodes.filter(c => c !== code));
    } else {
      setNewMemberProjectCodes([...newMemberProjectCodes, code]);
    }
  };

  const handleAllocateCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocAmount || !allocEmail || !allocProjectCode) return;

    try {
      const res = await fetch(`${getApiUrl(3001)}/api/ledger/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode: allocProjectCode,
          teamEmail: allocEmail,
          amount: parseFloat(allocAmount),
          date: new Date().toISOString().split('T')[0],
          method: allocMethod,
          notes: allocNotes
        })
      });
      if (res.ok) {
        await fetchLedgerData();
        setShowAllocateCashModal(false);
        setAllocAmount('');
        setAllocEmail('');
        setAllocProjectCode('');
        setAllocNotes('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to allocate cash');
      }
    } catch (err) {
      console.error("Error allocating cash:", err);
    }
  };

  const handleVoidExpense = async (expenseId: string) => {
    if (window.confirm(t('voidAlert'))) {
      try {
         const res = await fetch(`${getApiUrl(3001)}/api/ledger/void-expense`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ expenseId })
         });
         if (res.ok) {
           await fetchLedgerData();
         } else {
           const data = await res.json();
           alert(data.error || 'Failed to void expense');
         }
      } catch (err) {
        console.error("Error voiding expense:", err);
      }
    }
  };

  // Scenario A Settle Due handler
  const handleSettleDueDirectly = async (expenseId: string) => {
    const exp = expenses.find(e => e.id === expenseId);
    if (!exp) return;

    if (window.confirm(lang === 'bn' 
      ? `সিনারিও A: মেসার্স ${exp.vendor || 'সরবরাহকারী'}-এর বকেয়া ৳${exp.amount.toLocaleString()} কি সরাসরি ওনার ব্যাংক অ্যাকাউন্ট থেকে পরিশোধ করা হয়েছে?`
      : `Scenario A: Settle Baki due of BDT ${exp.amount.toLocaleString()} to vendor ${exp.vendor || 'Supplier'} directly from Owner account?`
    )) {
      try {
        const res = await fetch(`${getApiUrl(3001)}/api/ledger/settle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expenseId,
            amount: exp.amount,
            method: 'direct',
            notes: 'Direct settlement by Owner'
          })
        });
        if (res.ok) {
          await fetchLedgerData();
        } else {
          const data = await res.json();
          alert(data.error || 'Failed to settle due');
        }
      } catch (err) {
        console.error("Error settling due:", err);
      }
    }
  };

  // --- MOBILE SIMULATOR HANDLERS ---
  const activePm = useMemo(() => {
    return team.find(t => t.email === simActivePmEmail) || team[0];
  }, [team, simActivePmEmail]);

  const activePmProjectsList = useMemo(() => {
    if (!activePm) return [];
    return projects.filter(p => p.teamEmails.includes(activePm.email));
  }, [projects, activePm]);

  useEffect(() => {
    if (activePmProjectsList.length > 0) {
      if (!activePmProjectsList.some(p => p.code === simActiveProjectCode)) {
        setSimActiveProjectCode(activePmProjectsList[0].code);
      }
    } else {
      setSimActiveProjectCode('');
    }
  }, [activePmProjectsList, activePm, simActiveProjectCode]);

  const activePmProject = useMemo(() => {
    return projects.find(p => p.code === simActiveProjectCode);
  }, [projects, simActiveProjectCode]);

  const activePmProjectBalance = useMemo(() => {
    if (!activePm || !simActiveProjectCode) return 0;
    return getPmProjectBalance(activePm.email, simActiveProjectCode);
  }, [activePm, simActiveProjectCode, allocations, expenses]);

  const handleMobileSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simExpenseTitle || !simExpenseAmount || !activePm || !simActiveProjectCode) return;

    const amountNum = parseFloat(simExpenseAmount);

    if (simExpenseType === 'cash' && activePmProjectBalance < amountNum) {
      if (!window.confirm(t('cashWarning'))) {
        return;
      }
    }

    try {
      const res = await fetch(`${getApiUrl(3001)}/api/ledger/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode: simActiveProjectCode,
          teamEmail: activePm.email,
          title: simExpenseTitle,
          amount: amountNum,
          category: simExpenseCategory,
          date: new Date().toISOString().split('T')[0],
          type: simExpenseType,
          vendor: simExpenseType === 'baki' ? simExpenseVendor : undefined,
          notes: simExpenseNotes || undefined,
          receiptMockIdx: simExpenseReceiptIdx !== null ? simExpenseReceiptIdx : undefined
        })
      });
      if (res.ok) {
        await fetchLedgerData();
        const rawMsg = simExpenseType === 'cash' ? t('successCashMsg') : t('successBakiMsg');
        const msg = rawMsg
          .replace('{code}', simActiveProjectCode)
          .replace('{amount}', amountNum.toLocaleString())
          .replace('{vendor}', simExpenseVendor);

        setSimNotifyMsg({
          text: msg,
          type: 'success'
        });

        setSimExpenseTitle('');
        setSimExpenseAmount('');
        setSimExpenseVendor('');
        setSimExpenseNotes('');
        setSimExpenseReceiptIdx(null);

        setTimeout(() => {
          setSimNotifyMsg(null);
        }, 4000);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit mobile expense');
      }
    } catch (err) {
      console.error("Error submitting mobile expense:", err);
    }
  };

  const pmExpensesList = useMemo(() => {
    if (!activePm || !simActiveProjectCode) return [];
    return expenses.filter(e => e.teamEmail === activePm.email && e.projectCode === simActiveProjectCode);
  }, [expenses, activePm, simActiveProjectCode]);

  const allocEmailProjects = useMemo(() => {
    if (!allocEmail) return [];
    return projects.filter(p => p.teamEmails.includes(allocEmail));
  }, [projects, allocEmail]);

  useEffect(() => {
    if (allocEmailProjects.length > 0) {
      setAllocProjectCode(allocEmailProjects[0].code);
    } else {
      setAllocProjectCode('');
    }
  }, [allocEmailProjects, allocEmail]);

  // Translate categories
  const getCategoryLabel = (category: string) => {
    switch(category) {
      case 'Materials': return t('catMaterials');
      case 'Labor': return t('catLabor');
      case 'Transport': return t('catTransport');
      case 'Food': return t('catFood');
      case 'Equipment': return t('catEquipment');
      case 'Utilities': return t('catUtilities');
      case 'Others': return t('catOthers');
      default: return category;
    }
  };

  if (isStandaloneMobileApp) {
    return (
      <div className="w-full h-full min-h-screen bg-[#121318] flex flex-col relative text-white text-xs select-none font-bengali">
        {/* Style tag for styling */}
        <style dangerouslySetInnerHTML={{ __html: `
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}} />
        
        {/* Standalone Mobile Header with Logout and Language Toggle */}
        <div className="h-14 bg-[#1B1D24] px-4 flex justify-between items-center border-b border-white/5 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#5E6AD2] flex items-center justify-center font-extrabold text-xs text-white">
              {activePm?.name ? activePm.name[0] : '?'}
            </div>
            <div>
              <h4 className="font-bold text-white/95">{activePm?.name || 'Manager'}</h4>
              <p className="text-[9px] text-white/60">{activePm?.role || 'Project Manager'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language switch */}
            <div className="inline-flex rounded-lg bg-neutral-900/60 p-0.5 border border-white/5">
              <button
                type="button"
                onClick={() => onLangChange?.('bn')}
                className={`px-2 py-1 text-[9px] font-extrabold rounded-md transition-all cursor-pointer ${
                  lang === 'bn'
                    ? 'bg-[#5E6AD2] text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                বাংলা
              </button>
              <button
                type="button"
                onClick={() => onLangChange?.('en')}
                className={`px-2 py-1 text-[9px] font-extrabold rounded-md transition-all cursor-pointer ${
                  lang === 'en'
                    ? 'bg-[#5E6AD2] text-white'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
            
            {/* Logout button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-red-950/20 hover:text-red-400 hover:border-red-900/30 transition-all cursor-pointer"
                title={lang === 'bn' ? 'লগ আউট' : 'Log Out'}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Live simulator feedback banner */}
        {simNotifyMsg && (
          <div className="absolute top-16 left-4 right-4 z-40 p-2.5 rounded-xl text-[10px] font-bold shadow-md animate-slideDown flex items-center gap-1.5 bg-emerald-600 text-white">
            <Check className="h-3.5 w-3.5" />
            <span className="flex-1 text-[10px]">{simNotifyMsg.text}</span>
          </div>
        )}

        {/* Phone Main Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 select-none custom-scrollbar space-y-4">
          
          {/* PROJECT SELECTOR INSIDE MOBILE APP */}
          <div className="space-y-1.5 bg-white/[0.03] border border-white/5 p-3 rounded-2xl">
            <label className="block text-[10px] font-bold text-white/50 uppercase">
              {t('labelSelectProjectMobile')}
            </label>
            {activePmProjectsList.length === 0 ? (
              <div className="text-red-400 text-xs py-1">No projects assigned to this manager.</div>
            ) : (
              <select
                value={simActiveProjectCode}
                onChange={(e) => setSimActiveProjectCode(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 px-3 text-xs font-bold text-white outline-none focus:border-[#717CFF]"
              >
                {activePmProjectsList.map(p => (
                  <option key={p.code} value={p.code}>{p.code} - {p.name.slice(0, 18)}...</option>
                ))}
              </select>
            )}
          </div>

          {/* Mobile Quick KPI Summary Frame */}
          <div className="bg-gradient-to-br from-[#1F2128] to-[#17181D] border border-white/5 p-4 rounded-2xl space-y-3 shadow-md">
            <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold flex items-center justify-between">
              <span>{t('simBalanceTitle')} ({simActiveProjectCode})</span>
              <span className="text-[8px] text-[#717CFF] font-extrabold">{activePmProject?.location}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <div className="text-[9px] text-white/50 font-medium">{t('simCashFunds')}</div>
                <div className="text-sm font-extrabold text-emerald-400">
                  ৳{activePmProjectBalance.toLocaleString()}
                </div>
              </div>
              <div className="space-y-0.5">
                <div className="text-[9px] text-white/50 font-medium">{t('simBakiOutstanding')}</div>
                <div className="text-sm font-extrabold text-red-400">
                  ৳{expenses
                    .filter(e => e.teamEmail === activePm?.email && e.projectCode === simActiveProjectCode && e.type === 'baki')
                    .reduce((acc, curr) => {
                      const paidAmount = (curr.payments || []).reduce((sum, p) => sum + p.amount, 0);
                      return acc + Math.max(0, curr.amount - paidAmount);
                    }, 0)
                    .toLocaleString()
                  }
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-white/40 font-semibold">
              <span className="truncate">Active Project: {activePmProject?.name}</span>
            </div>
          </div>

          {/* Form header */}
          <div className="space-y-1">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/80">
              {t('simTitle')}: {t('typeCash')} / {t('typeBaki')}
            </h3>
            <p className="text-[10px] text-white/50">
              {lang === 'bn' ? 'মাঠের খরচ সাথে সাথে সাধারণ খতিয়ানে যুক্ত হবে।' : 'Submit local expenditures instantly into the owner general ledger.'}
            </p>
          </div>

          {/* Mobile Daily Expense Form */}
          <form onSubmit={handleMobileSubmitExpense} className="space-y-3 bg-[#1B1D24] p-4 rounded-2xl border border-white/5">
            
            {/* Expense Title */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-white/50 uppercase">
                {t('labelMobileTitle')}
              </label>
              <input
                type="text"
                required
                value={simExpenseTitle}
                onChange={(e) => setSimExpenseTitle(e.target.value)}
                placeholder={t('placeholderMobileTitle')}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 px-3 text-xs text-white outline-none focus:border-[#717CFF]"
              />
            </div>

            {/* Expense Amount */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-white/50 uppercase">
                {t('labelMobileAmount')}
              </label>
              <input
                type="number"
                required
                value={simExpenseAmount}
                onChange={(e) => setSimExpenseAmount(e.target.value)}
                placeholder="BDT"
                className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 px-3 text-xs text-white outline-none focus:border-[#717CFF]"
              />
            </div>

            {/* Expense Category */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-white/50 uppercase">
                {t('labelMobileCategory')}
              </label>
              <select
                value={simExpenseCategory}
                onChange={(e) => setSimExpenseCategory(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 px-3 text-xs text-white outline-none focus:border-[#717CFF] cursor-pointer"
              >
                <option value="Materials">{t('catMaterials')}</option>
                <option value="Labor">{t('catLabor')}</option>
                <option value="Transport">{t('catTransport')}</option>
                <option value="Food">{t('catFood')}</option>
                <option value="Equipment">{t('catEquipment')}</option>
                <option value="Utilities">{t('catUtilities')}</option>
                <option value="Others">{t('catOthers')}</option>
              </select>
            </div>

            {/* Expense Type Buttons (Tabs style) */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-white/50 uppercase">
                {t('labelMobilePaymentType')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimExpenseType('cash')}
                  className={`py-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    simExpenseType === 'cash'
                      ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                      : 'bg-neutral-950 text-white/50 border border-white/5 hover:text-white'
                  }`}
                >
                  {lang === 'bn' ? '🟢 নগদ' : 'Cash'}
                </button>
                <button
                  type="button"
                  onClick={() => setSimExpenseType('baki')}
                  className={`py-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    simExpenseType === 'baki'
                      ? 'bg-red-600/20 text-red-400 border border-red-500/50'
                      : 'bg-neutral-950 text-white/50 border border-white/5 hover:text-white'
                  }`}
                >
                  {lang === 'bn' ? '🔴 বাকী/বকেয়া' : 'Baki (Due)'}
                </button>
              </div>
            </div>

            {/* Conditional Vendor Input for Baki items */}
            {simExpenseType === 'baki' && (
              <div className="space-y-1 animate-fadeIn">
                <label className="block text-[10px] font-bold text-white/50 uppercase">
                  {t('labelVendor')}
                </label>
                <input
                  type="text"
                  required
                  value={simExpenseVendor}
                  onChange={(e) => setSimExpenseVendor(e.target.value)}
                  placeholder={t('placeholderVendor')}
                  className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 px-3 text-xs text-white outline-none focus:border-[#717CFF]"
                />
              </div>
            )}

            {/* Voucher slip Camera Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[10px] font-bold text-white/50 uppercase">
                {t('labelVoucher')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MOCK_RECEIPT_FILES.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSimExpenseReceiptIdx(simExpenseReceiptIdx === idx ? null : idx)}
                    className={`h-16 rounded-xl overflow-hidden border relative transition-all cursor-pointer ${
                      simExpenseReceiptIdx === idx
                        ? 'border-[#717CFF] ring-2 ring-[#717CFF]/50 scale-95'
                        : 'border-white/5 hover:border-white/20'
                    }`}
                  >
                    <img src={url} alt={`Receipt ${idx + 1}`} className="w-full h-full object-cover" />
                    {simExpenseReceiptIdx === idx && (
                      <div className="absolute inset-0 bg-[#5E6AD2]/40 flex items-center justify-center">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-white/50 uppercase">
                {t('labelNotes')}
              </label>
              <textarea
                value={simExpenseNotes}
                onChange={(e) => setSimExpenseNotes(e.target.value)}
                placeholder={t('placeholderNotes')}
                rows={2}
                className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 px-3 text-xs text-white outline-none focus:border-[#717CFF] resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-[#5E6AD2] hover:bg-[#4d59c2] text-white font-extrabold text-xs py-3 mt-3 shadow-md hover:scale-101 active:scale-99 transition-all cursor-pointer uppercase tracking-wider"
            >
              {t('btnSubmitExpense')}
            </button>

          </form>

          {/* SIMULATED LOGGED LIST FOR MANAGER SCREEN */}
          <div className="space-y-2.5 pt-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/80">
              {t('simLoggedTitle')} ({simActiveProjectCode})
            </h3>
            
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1 select-none custom-scrollbar">
              {expenses.filter(e => e.teamEmail === activePm?.email && e.projectCode === simActiveProjectCode).length === 0 ? (
                <div className="text-[10px] text-white/40 italic py-2">{t('noSimExpenses')}</div>
              ) : (
                expenses
                  .filter(e => e.teamEmail === activePm?.email && e.projectCode === simActiveProjectCode)
                  .map((item) => {
                    const isBaki = item.type === 'baki';
                    const paidAmount = (item.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    const remainingDue = item.amount - paidAmount;
                    const isFullySettled = isBaki && remainingDue <= 0;
                    
                    return (
                      <div
                        key={item.id}
                        className="bg-[#1B1D24] p-3 rounded-xl border border-white/5 flex items-start justify-between gap-3 text-[10px]"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="font-bold text-white/90 truncate">{item.title}</div>
                          <div className="text-[9px] text-white/40 font-medium flex items-center gap-1.5">
                            <span>{item.date}</span>
                            <span>•</span>
                            <span>{getCategoryLabel(item.category)}</span>
                          </div>
                          {isBaki && (
                            <div className="flex flex-col gap-1 pt-0.5">
                              <span className="text-[9px] font-bold text-white/40 truncate">
                                {lang === 'bn' ? `বিক্রেতা: ${item.vendor}` : `Vendor: ${item.vendor}`}
                              </span>
                              <div className="flex items-center gap-2 text-[8px] font-extrabold">
                                {isFullySettled ? (
                                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                    {lang === 'bn' ? 'পরিশোধিত' : 'Settled'}
                                  </span>
                                ) : (
                                  <>
                                    <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-sm uppercase tracking-wider animate-pulse">
                                      {lang === 'bn' ? 'বকেয়া' : 'Baki'}
                                    </span>
                                    <span className="text-white/60">
                                      {lang === 'bn' ? `অবশিষ্ট: ৳${remainingDue.toLocaleString()}` : `Due: ৳${remainingDue.toLocaleString()}`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                          <span className={`font-extrabold ${isBaki ? 'text-red-400' : 'text-emerald-400'}`}>
                            ৳{item.amount.toLocaleString()}
                          </span>
                          {!isBaki && (
                            <span className="bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-sm text-[8px] font-extrabold uppercase tracking-wider">
                              {lang === 'bn' ? 'নগদ' : 'Cash'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-bengali">
      
      {/* Dynamic Hazard Stripe style definition for over budget warning */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes moving-stripes {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        .hazard-stripes {
          background-image: linear-gradient(
            45deg,
            #ef4444 25%,
            #f59e0b 25%,
            #f59e0b 50%,
            #ef4444 50%,
            #ef4444 75%,
            #f59e0b 75%,
            #f59e0b
          );
          background-size: 40px 40px;
          animation: moving-stripes 1.2s linear infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Top Banner & Control Board */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E5E5E6] pb-5 dark:border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full border border-[#E5E5E6] bg-[#F3F4F6] px-2.5 py-1 text-xs font-semibold text-[#62666D] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300">
              {t('contractorModule')}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('autoApproveActive')}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#08090A] dark:text-white">
            {t('pageTitle')}
          </h1>
          <p className="hidden md:block text-sm text-[#62666D] dark:text-neutral-400">
            {t('pageSubtitle')}
          </p>
        </div>


      </div>

      {/* --- DESKTOP VIEW --- */}
      {activeTab === 'desktop' && (
        <div className="space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#08090A] dark:text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#5E6AD2]"></span>
                {lang === 'bn' ? 'কার্যপ্রণালী (Quick Actions)' : 'Quick Actions'}
              </h3>
              <p className="text-[11px] text-[#62666D] dark:text-neutral-400">
                {lang === 'bn' ? 'তহবিল ও খরচ সংক্রান্ত লেনদেন পরিচালনা করুন।' : 'Manage fund transfers and expense logging operations.'}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Primary Action: Send Cash */}
              <button
                type="button"
                onClick={() => setShowAllocateCashModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-white dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 py-2.5 px-4 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                <span>{t('sendCash')}</span>
              </button>

              {/* Primary Action: Add Expense */}
              <button
                type="button"
                onClick={() => {
                  if (projects.length > 0) {
                    setAdminExpenseProjectCode(projects[0].code);
                  }
                  setShowAdminExpenseModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{lang === 'bn' ? 'খরচ লোগ করুন' : 'Log Expense'}</span>
              </button>

              {/* Primary Action: Settle Dues */}
              <button
                type="button"
                onClick={() => {
                  const initialAmounts: Record<string, string> = {};
                  expenses.forEach(e => {
                    if (e.type === 'baki') {
                      const paid = (e.payments || []).reduce((sum, p) => sum + p.amount, 0);
                      const remaining = Math.max(0, e.amount - paid);
                      initialAmounts[e.id] = remaining.toString();
                    }
                  });
                  setBulkSettleAmounts(initialAmounts);
                  setShowSettleDuesModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 text-xs font-extrabold shadow-sm transition-all cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{t('btnSettleDues')}</span>
              </button>

              {/* Divider (only visible on md and up) */}
              <div className="hidden md:block h-6 w-px bg-neutral-200 dark:bg-neutral-800 mx-1"></div>

              {/* Secondary/Setup actions grouped in a dropdown */}
              <div className="relative" ref={manageMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-[#08090A] hover:bg-[#F9FAFB] dark:border-white/10 dark:bg-white/[0.02] dark:text-white dark:hover:bg-white/[0.05] py-2.5 px-4 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                >
                  <Building className="h-4 w-4 text-neutral-400" />
                  <span>{lang === 'bn' ? 'লেজার ম্যানেজ' : 'Manage Ledger'}</span>
                  <span className="text-[10px] text-neutral-400">▼</span>
                </button>

                {isManageMenuOpen && (
                  <div className="absolute right-0 top-full z-45 mt-2 w-52 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-neutral-900 animate-fadeIn space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddProjectModal(true);
                        setIsManageMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/[0.03] transition-all text-left cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-neutral-400" />
                      <span>{t('newProject')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInviteMemberModal(true);
                        setIsManageMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-white/[0.03] transition-all text-left cursor-pointer"
                    >
                      <UserPlus className="h-4 w-4 text-neutral-400" />
                      <span>{t('invitePm')}</span>
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Unified Filter Toolbar */}
          <div className="bg-[#F9FAFB] dark:bg-neutral-900/40 p-3 rounded-2xl border border-[#E5E5E6] dark:border-white/5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full min-w-0">
              
              {/* Date Filter Tag */}
              <div className="relative shrink-0" ref={dateDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                  className={`flex h-9 px-3 items-center justify-center rounded-xl text-xs font-extrabold transition-all border cursor-pointer whitespace-nowrap shadow-xs ${
                    dateFilterType !== 'ALL'
                      ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] border-[#5E6AD2]/30 dark:bg-[#717CFF]/15 dark:text-[#717CFF] dark:border-[#717CFF]/30'
                      : 'bg-white text-neutral-500 border-[#E5E5E6] hover:bg-neutral-50 dark:bg-neutral-950 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <Calendar className={`h-3.5 w-3.5 mr-1.5 shrink-0 ${dateFilterType !== 'ALL' ? 'text-[#5E6AD2] dark:text-[#717CFF]' : 'text-neutral-400'}`} />
                  <span>{getDateFilterLabel()}</span>
                  <span className="text-[8px] select-none ml-1 opacity-70">▼</span>
                </button>

                {/* Date Dropdown Panel */}
                {isDateDropdownOpen && (
                  <div className="absolute top-full left-0 z-35 mt-2 w-72 rounded-2xl border border-[#E5E5E6] bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900 animate-fadeIn space-y-3">
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => applyDatePreset('ALL')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'ALL'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'সব সময় (All Time)' : 'All Time'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('TODAY')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'TODAY'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'আজ (Today)' : 'Today'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('YESTERDAY')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'YESTERDAY'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'গতকাল (Yesterday)' : 'Yesterday'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('LAST_7')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'LAST_7'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'গত ৭ দিন' : 'Last 7 Days'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('LAST_30')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'LAST_30'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'গত ৩০ দিন' : 'Last 30 Days'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('THIS_MONTH')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'THIS_MONTH'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'এই মাস' : 'This Month'}
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDatePreset('LAST_MONTH')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'LAST_MONTH'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'গত মাস' : 'Last Month'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDateFilterType('CUSTOM')}
                        className={`px-3 py-2 text-left font-bold rounded-lg transition-all cursor-pointer ${
                          dateFilterType === 'CUSTOM'
                            ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF]'
                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.02] text-neutral-600 dark:text-neutral-300'
                        }`}
                      >
                        {lang === 'bn' ? 'কাস্টম রেঞ্জ' : 'Custom Range'}
                      </button>
                    </div>

                    {dateFilterType === 'CUSTOM' && (
                      <div className="border-t border-neutral-100 pt-3 dark:border-white/5 space-y-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">
                            {lang === 'bn' ? 'শুরুর তারিখ' : 'Start Date'}
                          </span>
                          <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="rounded-lg border border-[#E5E5E6] bg-[#F9FAFB] py-1 px-2.5 text-xs font-semibold text-[#08090A] outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-white focus:border-[#5E6AD2]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-neutral-400 uppercase">
                            {lang === 'bn' ? 'শেষের তারিখ' : 'End Date'}
                          </span>
                          <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="rounded-lg border border-[#E5E5E6] bg-[#F9FAFB] py-1 px-2.5 text-xs font-semibold text-[#08090A] outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-white focus:border-[#5E6AD2]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsDateDropdownOpen(false)}
                          className="w-full bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 text-white font-bold text-xs py-1.5 rounded-lg shadow-sm cursor-pointer text-center"
                        >
                          {lang === 'bn' ? 'প্রয়োগ করুন' : 'Apply'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vertical Divider */}
              <div className="hidden sm:block h-6 w-px bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>

              {/* Horizontally scrollable project selection pills */}
              <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedProjectCode('ALL')}
                  className={`flex h-9 px-3 items-center justify-center rounded-xl text-xs font-extrabold transition-all border cursor-pointer whitespace-nowrap shadow-xs ${
                    selectedProjectCode === 'ALL'
                      ? 'bg-[#5E6AD2] text-white border-[#5E6AD2] dark:bg-[#717CFF] dark:border-[#717CFF]'
                      : 'bg-white text-neutral-500 border-[#E5E5E6] hover:bg-neutral-50 dark:bg-neutral-950 dark:border-white/10 dark:text-neutral-400 dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <Building className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  <span>{t('allProjects')} ({projects.length})</span>
                </button>
                {projects.map(p => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedProjectCode(p.code)}
                    title={p.name}
                    className={`flex h-9 px-3 items-center justify-center rounded-xl text-xs font-extrabold transition-all border cursor-pointer whitespace-nowrap shadow-xs ${
                      selectedProjectCode === p.code
                        ? 'bg-[#5E6AD2] text-white border-[#5E6AD2] dark:bg-[#717CFF] dark:border-[#717CFF]'
                        : 'bg-white text-[#08090A] border-[#E5E5E6] hover:bg-[#F9FAFB] dark:bg-neutral-950 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <span>{p.code}</span>
                  </button>
                ))}
              </div>

            </div>

            {/* Right side: Clear Filters Trigger */}
            {(selectedProjectCode !== 'ALL' || dateFilterType !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectCode('ALL');
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setDateFilterType('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer bg-transparent border-none shrink-0"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                <span>{lang === 'bn' ? 'মুছুন' : 'Clear'}</span>
              </button>
            )}
          </div>

                    {/* Financial Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-white p-4 rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[#8A8F98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('metricBudget')}</span>
                <DollarSign className="h-3.5 w-3.5 text-neutral-400" />
              </div>
              <div className="text-lg font-extrabold text-[#08090A] dark:text-white">
                ৳{metrics.totalBudget.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#62666D] dark:text-neutral-500 font-semibold truncate">
                {t('descBudget')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[#8A8F98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('metricAdvanced')}</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#5E6AD2]" />
              </div>
              <div className="text-lg font-extrabold text-[#5E6AD2] dark:text-[#717CFF]">
                ৳{metrics.totalAdvanced.toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-500 font-semibold truncate">
                {t('descAdvanced')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[#8A8F98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('metricSpent')}</span>
                <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                ৳{metrics.totalCashSpent.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-500/80 font-bold truncate">
                {t('descSpent')}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[#8A8F98]">
                <span className="text-[10px] font-bold uppercase tracking-wider">{t('metricDues')}</span>
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div className="text-lg font-extrabold text-red-600 dark:text-red-400">
                ৳{metrics.totalBakiOutstanding.toLocaleString()}
              </div>
              <div className="text-[10px] text-red-600 dark:text-red-500/80 font-bold truncate">
                {t('descDues')}
              </div>
            </div>

          </div>

          {/* Project List Progress View */}
          <div className="bg-white rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E6] dark:border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#08090A] dark:text-white">
                {t('projectComparison')}
              </h3>
              <span className="text-[10px] bg-[#F3F4F6] text-[#62666D] px-2 py-0.5 rounded font-bold dark:bg-neutral-800 dark:text-neutral-400">
                {t('activeProjects')} {activeProjectsList.length}
              </span>
            </div>
            <div className="p-4 divide-y divide-[#E5E5E6] dark:divide-white/5">
              {activeProjectsList.map((project) => {
                const projAllocations = allocations.filter(a => a.projectCode === project.code);
                const projExpenses = expenses.filter(e => e.projectCode === project.code);
                
                const allocated = projAllocations.reduce((acc, curr) => acc + curr.amount, 0);
                const spentCash = projExpenses.filter(e => e.type === 'cash').reduce((acc, curr) => acc + curr.amount, 0);
                const spentBaki = projExpenses
                  .filter(e => e.type === 'baki')
                  .reduce((acc, curr) => {
                    const paidAmount = (curr.payments || []).reduce((sum, p) => sum + p.amount, 0);
                    return acc + Math.max(0, curr.amount - paidAmount);
                  }, 0);
                const totalSpent = spentCash + spentBaki;
                const percentOfBudget = Math.round((totalSpent / project.budget) * 100) || 0;
                
                const isOverBudget = percentOfBudget > 100;

                return (
                  <div key={project.id} className="py-3 first:pt-0 last:pb-0">
                    <div className={`p-4 rounded-2xl transition-all duration-300 space-y-3 ${
                      isOverBudget 
                        ? 'bg-red-500/5 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] dark:bg-red-950/10 dark:border-red-500/10' 
                        : 'bg-[#F9FAFB]/30 border border-transparent dark:bg-neutral-900/10'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#08090A] dark:text-white">{project.name}</h4>
                            <span className="text-[9px] bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/10 dark:text-[#717CFF] px-1.5 py-0.5 rounded font-extrabold">
                              {project.code}
                            </span>
                            {isOverBudget && (
                              <span className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border border-red-200 animate-pulse">
                                ⚠️ {lang === 'bn' ? 'বাজেট অতিরিক্ত!' : 'Over Budget!'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-[#8A8F98] dark:text-neutral-500 mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{project.location}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-semibold text-[#8A8F98]">{t('totalSpentLabel')} </span>
                          <span className={`text-sm font-extrabold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-[#08090A] dark:text-white'}`}>
                            ৳{totalSpent.toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-[#62666D] dark:text-neutral-500"> / {t('budgetLabel')} ৳{project.budget.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Progress Bar Stacked (Handles >100% with hazard danger animation) */}
                      <div className="space-y-1">
                        <div className="h-3 w-full bg-[#F3F4F6] rounded-full overflow-hidden flex dark:bg-neutral-800">
                          {isOverBudget ? (
                            // Animated hazard candy stripes for budget overrun
                            <div 
                              title={`Budget Overrun: ৳${totalSpent.toLocaleString()} (${percentOfBudget}%)`}
                              className="hazard-stripes h-full w-full transition-all" 
                            />
                          ) : (
                            <>
                              <div 
                                title={`Cash Spent: ৳${spentCash.toLocaleString()}`}
                                className="bg-emerald-500 h-full transition-all" 
                                style={{ width: `${(spentCash / project.budget) * 100}%` }}
                              />
                              <div 
                                title={`Baki/Dues: ৳${spentBaki.toLocaleString()}`}
                                className="bg-red-500 h-full transition-all" 
                                style={{ width: `${(spentBaki / project.budget) * 100}%` }}
                              />
                              <div 
                                title={`Remaining Cash at Site: ৳${(allocated - spentCash).toLocaleString()}`}
                                className="bg-[#5E6AD2]/40 h-full transition-all" 
                                style={{ width: `${(Math.max(0, allocated - spentCash) / project.budget) * 100}%` }}
                              />
                            </>
                          )}
                        </div>

                        {/* Progress Bar Legend */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 font-medium pt-1">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block"></span>
                              {t('legendCash')}: ৳{spentCash.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-red-500 inline-block"></span>
                              {t('legendBaki')}: ৳{spentBaki.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-[#5E6AD2]/40 inline-block"></span>
                              {t('legendPmCash')}: ৳{Math.max(0, allocated - spentCash).toLocaleString()}
                            </span>
                          </div>
                          <span className={`font-extrabold ${isOverBudget ? 'text-red-600 dark:text-red-400 animate-bounce' : 'text-[#08090A] dark:text-white'}`}>
                            {percentOfBudget}% {t('budgetUsed')} {isOverBudget && (lang === 'bn' ? '(বাজেট ওভাররান!)' : '(Exceeded!)')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* General Ledger Transactions with Project Filter */}
          <div className="bg-white rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E5E5E6] dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-neutral-50/20 dark:bg-neutral-950/20">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#08090A] dark:text-white">
                {t('ledgerTitle')} {selectedProjectCode !== 'ALL' && `(${selectedProjectCode})`}
              </h3>
              <span className="text-[9px] sm:text-[10px] text-neutral-400 font-bold uppercase">
                {t('ledgerSubtitle')}
              </span>
            </div>
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E6] dark:border-white/5 text-[10px] text-neutral-400 font-bold uppercase bg-[#F9FAFB] dark:bg-neutral-950">
                    <th className="p-3.5">{t('colDate')}</th>
                    <th className="p-3.5">{t('colPm')}</th>
                    <th className="p-3.5">{t('colDesc')}</th>
                    <th className="p-3.5">{t('colType')}</th>
                    <th className="p-3.5 text-right">{t('colAmount')}</th>
                    <th className="p-3.5 text-center">{t('colAction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E6] dark:divide-white/5 text-xs">
                  {ledgerItems.map((item, idx) => {
                      const isAlloc = item.ledgerType === 'allocation';
                      const isBaki = item.type === 'baki';
                      const paidAmount = isBaki ? (item.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0) : 0;
                      const remainingDue = isBaki ? Math.max(0, item.amount - paidAmount) : 0;
                      const isFullySettled = isBaki && remainingDue === 0;
                      const isPartiallySettled = isBaki && paidAmount > 0 && remainingDue > 0;
                      const isUnsettledBaki = isBaki && remainingDue > 0;
                      
                      return (
                        <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-white/[0.01]">
                          <td className="p-3.5 text-neutral-400 font-medium whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-[#5E6AD2] dark:text-[#717CFF]">
                                {item.projectCode}
                              </span>
                              <span className="text-neutral-400 text-[10px]">|</span>
                              <span className="text-neutral-500 font-medium">
                                {team.find(t => t.email === item.teamEmail)?.name || item.teamEmail.split('@')[0]}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-[#08090A] dark:text-white">
                            <div className="flex items-center gap-2">
                              <span>{item.title}</span>
                              {isBaki && (() => {
                                if (isFullySettled) {
                                  return (
                                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
                                      {lang === 'bn' ? 'পরিশোধিত বাকি' : 'Settled Due'}
                                    </span>
                                  );
                                } else if (isPartiallySettled) {
                                  return (
                                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                                      {lang === 'bn' ? 'আংশিক পরিশোধিত' : 'Partially Paid'}
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400">
                                      {lang === 'bn' ? 'বাকি' : 'Baki (Due)'}
                                    </span>
                                  );
                                }
                              })()}
                            </div>
                            {item.notes && <p className="text-[10px] text-neutral-400 font-normal mt-0.5">{item.notes}</p>}
                            
                            {/* Outstanding balance breakdown and payment history */}
                            {isBaki && (() => {
                              if (paidAmount > 0) {
                                return (
                                  <div className="mt-1.5 text-[10px] font-semibold text-neutral-500 space-y-0.5">
                                    <p>
                                      {lang === 'bn' ? 'পরিশোধিত: ' : 'Paid: '}
                                      <span className="text-emerald-600 font-extrabold">৳{paidAmount.toLocaleString()}</span>
                                      {remainingDue > 0 && (
                                        <>
                                          {' | '}
                                          {lang === 'bn' ? 'অবशिष्ट বকেয়া: ' : 'Remaining: '}
                                          <span className="text-red-600 font-extrabold">৳{remainingDue.toLocaleString()}</span>
                                        </>
                                      )}
                                    </p>
                                    <div className="pl-2 border-l border-neutral-200 dark:border-white/10 space-y-0.5 mt-1 text-[9px] font-medium text-neutral-400">
                                      {(item.payments || []).map((p: DuePayment, pIdx: number) => (
                                        <div key={p.id || pIdx}>
                                          • {p.date}: ৳{p.amount.toLocaleString()} ({p.method === 'direct' ? (lang === 'bn' ? 'সরাসরি বিক্রেতা' : 'Direct Vendor') : (lang === 'bn' ? 'পিএম ওয়ালেট' : 'PM Wallet')})
                                          {p.notes && ` - ${p.notes}`}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* Inline Settle button next to title: labeled 'পরিশোধ করা হয়েছে?' */}
                            {isUnsettledBaki && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInlineSettleProcess('direct');
                                    setSettleAmountInput(remainingDue.toString());
                                    setSettleConfirmExpense(item as any);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:scale-102 active:scale-98 border border-emerald-500 hover:border-emerald-600 transition-all cursor-pointer inline-flex items-center gap-1.5 animate-pulse"
                                  title="Settle Outstanding Due"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping"></span>
                                  <Check className="h-3 w-3 text-white shrink-0" />
                                  <span>{lang === 'bn' ? 'পরিশোধ করা হয়েছে?' : 'Settled?'}</span>
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-neutral-500 dark:text-neutral-400 font-semibold whitespace-nowrap">
                            {isAlloc ? t('typeAlloc') : item.type === 'baki' ? t('typeBaki') : t('typeCash')}
                          </td>
                          <td className={`p-3.5 text-right font-extrabold text-sm whitespace-nowrap ${
                            isAlloc ? 'text-[#5E6AD2] dark:text-[#717CFF]' : 'text-neutral-900 dark:text-white'
                          }`}>
                            {isAlloc ? '+' : '-'}৳{item.amount.toLocaleString()}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center">
                              {!isAlloc && (
                                <button
                                  type="button"
                                  onClick={() => handleVoidExpense(item.id)}
                                  title="Void Transaction"
                                  className="text-neutral-400 hover:text-red-500 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/25 transition-all cursor-pointer animate-fadeIn"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-Based View (Meta Ads Manager Style) */}
            <div className="block md:hidden p-4 space-y-3.5 bg-[#F9FAFB]/50 dark:bg-neutral-950/10">
              {ledgerItems.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 text-xs">
                  {lang === 'bn' ? 'কোন লেনদেন পাওয়া যায়নি।' : 'No transactions found.'}
                </div>
              ) : (
                ledgerItems.map((item, idx) => {
                  const isAlloc = item.ledgerType === 'allocation';
                  const isBaki = item.type === 'baki';
                  const paidAmount = isBaki ? (item.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0) : 0;
                  const remainingDue = isBaki ? Math.max(0, item.amount - paidAmount) : 0;
                  const isFullySettled = isBaki && remainingDue === 0;
                  const isPartiallySettled = isBaki && paidAmount > 0 && remainingDue > 0;
                  const isUnsettledBaki = isBaki && remainingDue > 0;
                  const pmName = team.find(t => t.email === item.teamEmail)?.name || item.teamEmail.split('@')[0];
                  
                  return (
                    <div 
                      key={idx} 
                      className="bg-white dark:bg-neutral-900 border border-[#E5E5E6] dark:border-white/5 rounded-2xl p-4 shadow-xs hover:border-[#5E6AD2]/30 dark:hover:border-[#717CFF]/30 transition-all duration-300 relative overflow-hidden flex flex-col gap-3"
                    >
                      {/* Top Row: Badges and Date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {/* Indicator Icon */}
                          <div className={`p-1 rounded-md shrink-0 ${
                            isAlloc 
                              ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/15 dark:text-[#717CFF]' 
                              : isBaki 
                                ? (isFullySettled 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' 
                                  : 'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400') 
                                : 'bg-neutral-500/10 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-400'
                          }`}>
                            {isAlloc ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : isBaki ? (
                              isFullySettled ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />
                            ) : (
                              <ArrowDownLeft className="h-3 w-3" />
                            )}
                          </div>

                          {/* Transaction Type Label */}
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                            isAlloc 
                              ? 'bg-[#5E6AD2]/10 text-[#5E6AD2] dark:bg-[#717CFF]/15 dark:text-[#717CFF]' 
                              : isBaki 
                                ? (isFullySettled 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                  : isPartiallySettled
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400'
                                    : 'bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400')
                                : 'bg-neutral-50 text-neutral-600 dark:bg-neutral-950/20 dark:text-neutral-400'
                          }`}>
                            {isAlloc ? t('typeAlloc') : item.type === 'baki' ? t('typeBaki') : t('typeCash')}
                          </span>
                        </div>

                        {/* Date */}
                        <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-extrabold">
                          {item.date}
                        </span>
                      </div>

                      {/* Split Row: Title on Left, Amount on Right */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-[#08090A] dark:text-white leading-tight break-words">
                            {item.title}
                          </h4>
                          
                          {/* Project Code & PM Name */}
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-extrabold text-[#5E6AD2] dark:text-[#717CFF]">
                              {item.projectCode}
                            </span>
                            <span className="text-neutral-300 dark:text-neutral-700 font-normal">&bull;</span>
                            <span className="text-[#62666D] dark:text-neutral-400 font-bold">
                              {pmName}
                            </span>
                          </div>
                        </div>

                        {/* Transaction Amount */}
                        <div className="text-right shrink-0">
                          <span className={`text-base font-extrabold whitespace-nowrap tracking-tight ${
                            isAlloc ? 'text-[#5E6AD2] dark:text-[#717CFF]' : 'text-[#08090A] dark:text-white'
                          }`}>
                            {isAlloc ? '+' : '-'}৳{item.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Description / Notes Section if present */}
                      {item.notes && (
                        <div className="bg-neutral-50 dark:bg-neutral-950/40 p-2.5 rounded-xl border border-neutral-100/60 dark:border-white/5 text-[10px] text-[#62666D] dark:text-neutral-400 font-medium">
                          <span className="font-bold text-neutral-400 uppercase tracking-wider text-[8px] block mb-0.5">
                            {lang === 'bn' ? 'নোট:' : 'Notes:'}
                          </span>
                          {item.notes}
                        </div>
                      )}

                      {/* Outstanding Due Settlement Progress Bar */}
                      {isBaki && (
                        <div className="bg-neutral-50 dark:bg-neutral-950/40 p-3 rounded-xl border border-neutral-100/60 dark:border-white/5 space-y-2 text-[10px]">
                          <div className="flex items-center justify-between font-bold text-neutral-500 dark:text-neutral-400">
                            <span>{lang === 'bn' ? 'পরিশোধিত: ' : 'Paid: '} ৳{paidAmount.toLocaleString()}</span>
                            <span>{lang === 'bn' ? 'অবशिष्ट বকেয়া: ' : 'Remaining: '} ৳{remainingDue.toLocaleString()}</span>
                          </div>
                          
                          {/* Mini Progress Bar Line */}
                          <div className="h-1.5 w-full bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-emerald-500 h-full transition-all duration-300"
                              style={{ width: `${(paidAmount / item.amount) * 100}%` }}
                            />
                            <div 
                              className="bg-red-500 h-full transition-all duration-300"
                              style={{ width: `${(remainingDue / item.amount) * 100}%` }}
                            />
                          </div>

                          {/* Payment History List inside Card if paid amount > 0 */}
                          {paidAmount > 0 && (item.payments || []).length > 0 && (
                            <div className="border-t border-neutral-200/50 dark:border-white/5 pt-2 space-y-1">
                              <span className="font-bold text-neutral-400 uppercase tracking-wider text-[8px] block">
                                {lang === 'bn' ? 'পরিশোধের ইতিহাস' : 'Payment History'}
                              </span>
                              {(item.payments || []).map((p: DuePayment, pIdx: number) => (
                                <div key={p.id || pIdx} className="flex justify-between items-center bg-white dark:bg-neutral-900/50 px-2 py-1 rounded-md border border-neutral-100/60 dark:border-white/5 text-[9px]">
                                  <span>{p.date} ({p.method === 'direct' ? (lang === 'bn' ? 'সরাসরি' : 'Direct') : (lang === 'bn' ? 'পিএম' : 'PM')})</span>
                                  <span className="font-extrabold text-neutral-600 dark:text-neutral-300">৳{p.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Card Actions (If any actions are valid) */}
                      {(!isAlloc || isUnsettledBaki) && (
                        <div className="flex items-center justify-end gap-2 border-t border-[#E5E5E6]/60 dark:border-white/5 pt-2 mt-1">
                          {isUnsettledBaki && (
                            <button
                              type="button"
                              onClick={() => {
                                setInlineSettleProcess('direct');
                                setSettleAmountInput(remainingDue.toString());
                                setSettleConfirmExpense(item as any);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg shadow-sm hover:scale-102 transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Check className="h-3 w-3 text-white shrink-0" />
                              <span>{lang === 'bn' ? 'পরিশোধ করুন' : 'Settle'}</span>
                            </button>
                          )}

                          {!isAlloc && (
                            <button
                              type="button"
                              onClick={() => handleVoidExpense(item.id)}
                              title="Void Transaction"
                              className="text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 p-1.5 rounded-lg border border-neutral-200 dark:border-white/10 dark:bg-neutral-950/20 transition-all cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>          {/* Bottom Left: Launch Mobile Phone Simulator Link */}
          <div className="flex justify-start pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('mobile')}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#5E6AD2] hover:text-[#5e6ad2]/85 dark:text-[#717CFF] dark:hover:text-[#717cff]/85 transition-all cursor-pointer bg-[#5E6AD2]/5 hover:bg-[#5E6AD2]/10 border border-[#5E6AD2]/15 dark:bg-[#717CFF]/5 dark:hover:bg-[#717CFF]/10 dark:border-[#717CFF]/15 px-3 py-2 rounded-xl"
            >
              <Smartphone className="h-4 w-4" />
              <span>{t('launchMobile')}</span>
            </button>
          </div>

        </div>
      )}

      {/* --- VIRTUAL MOBILE APP SIMULATOR VIEW --- */}
      {activeTab === 'mobile' && (
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 py-4">
          
          {/* Left Side: Instructions and State Syncer Panel */}
          <div className="w-full lg:max-w-md space-y-5">
            <div className="bg-white p-5 rounded-2xl border border-[#E5E5E6] dark:bg-neutral-900 dark:border-white/5 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#08090A] dark:text-white flex items-center gap-2">
                <Smartphone className="h-4.5 w-4.5 text-[#5E6AD2] dark:text-[#717CFF]" />
                {t('simTitle')}
              </h3>
              
              <div className="text-xs text-[#62666D] dark:text-neutral-400 space-y-3 leading-relaxed">
                <p>{t('simInstructions')}</p>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 rounded-xl space-y-2 font-medium">
                  <p className="text-amber-800 dark:text-amber-400 font-bold">{t('simNoteHeader')}</p>
                  <ol className="list-decimal pl-4 space-y-1 text-amber-700 dark:text-amber-500">
                    <li>{t('simNoteStep1')}</li>
                    <li>{t('simNoteStep2')}</li>
                    <li>{t('simNoteStep3')}</li>
                    <li>{t('simNoteStep4')}</li>
                  </ol>
                </div>
              </div>

              {/* Simulator Active PM Switcher */}
              <div className="space-y-1.5 border-t border-[#E5E5E6] pt-4 dark:border-white/10">
                <label className="block text-xs font-bold text-[#8A8F98] uppercase">
                  {t('labelSelectPmSim')}
                </label>
                <select
                  value={simActivePmEmail}
                  onChange={(e) => {
                    setSimActivePmEmail(e.target.value);
                    setSimNotifyMsg({
                      text: lang === 'bn' 
                        ? `মোবাইল ডিভাইসটি ${team.find(t => t.email === e.target.value)?.name}-এ পরিবর্তন করা হয়েছে`
                        : `Switched mobile device to ${team.find(t => t.email === e.target.value)?.name}`,
                      type: 'info'
                    });
                    setTimeout(() => setSimNotifyMsg(null), 3000);
                  }}
                  className="w-full rounded-xl border border-[#E5E5E6] bg-white py-2 px-3 text-xs font-bold text-[#08090A] outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-white focus:border-[#5E6AD2]"
                >
                  {team.map(t => (
                    <option key={t.email} value={t.email}>{t.name} ({t.role})</option>
                  ))}
                </select>
              </div>

              {/* Display PM State Details */}
              <div className="rounded-xl bg-[#F9FAFB] p-3 border border-[#E5E5E6] text-xs space-y-1.5 dark:bg-neutral-950 dark:border-white/5">
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">{lang === 'bn' ? 'ম্যানেজারের নাম:' : 'PM Name:'}</span>
                  <span className="font-bold text-[#08090A] dark:text-white">{activePm?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8A8F98]">{t('assignedProjects')}</span>
                  <span className="font-bold text-[#5E6AD2] dark:text-[#717CFF]">
                    {activePmProjectsList.map(p => p.code).join(', ') || 'None'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-dashed border-[#E5E5E6] pt-1.5 mt-1 dark:border-white/5">
                  <span className="text-[#8A8F98]">{t('overallWallet')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">৳{getPmOverallBalance(activePm.email).toLocaleString()}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className="w-full rounded-xl border border-[#E5E5E6] hover:bg-[#F9FAFB] dark:border-white/10 dark:hover:bg-white/[0.05] dark:text-white text-[#08090A] font-bold text-xs py-2.5 text-center transition-colors cursor-pointer"
              >
                {t('btnBackDashboard')}
              </button>
            </div>
          </div>

          {/* Right Side: High-Fidelity Mobile App Shell */}
          <div className="w-[370px] h-[780px] bg-neutral-900 rounded-[50px] p-3.5 border-4 border-neutral-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] flex flex-col relative shrink-0">
            
            {/* Phone Screen Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-neutral-900 rounded-b-2xl z-30 flex items-center justify-center">
              <div className="w-10 h-1 bg-neutral-800 rounded-full mb-1"></div>
              <div className="w-2.5 h-2.5 bg-neutral-950 border border-neutral-800 rounded-full ml-2 mb-1"></div>
            </div>

            {/* Phone Internal screen wrapper */}
            <div className="w-full h-full bg-[#121318] rounded-[38px] overflow-hidden flex flex-col relative text-white text-xs select-none">
              
              {/* Phone Top Header Status Bar */}
              <div className="h-10 pt-2.5 px-6 flex justify-between items-center text-[10px] font-bold text-white/80 z-20 shrink-0">
                <span>14:56</span>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.17 19.66 10.53 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>
                  <span className="text-[9px]">5G</span>
                  <div className="w-5 h-2.5 border border-white/60 rounded-sm p-0.5 flex items-center">
                    <div className="w-full h-full bg-white rounded-2xs"></div>
                  </div>
                </div>
              </div>

              {/* Live simulator feedback banner */}
              {simNotifyMsg && (
                <div className="absolute top-12 left-4 right-4 z-40 p-2.5 rounded-xl text-[10px] font-bold shadow-md animate-slideDown flex items-center gap-1.5 bg-emerald-600 text-white">
                  <Check className="h-3.5 w-3.5" />
                  <span className="flex-1 text-[10px]">{simNotifyMsg.text}</span>
                </div>
              )}

              {/* Phone Main Content Scrollable Area */}
              <div className="flex-1 overflow-y-auto px-4 pb-6 pt-2 select-none custom-scrollbar space-y-4">
                
                <div className="flex items-center justify-between pb-1 pt-1">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-[#5E6AD2] flex items-center justify-center font-extrabold text-xs">
                      {activePm?.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white/95">{activePm?.name}</h4>
                      <p className="text-[9px] text-white/60">{activePm?.role} Companion</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-[#5E6AD2]/30 border border-[#5E6AD2]/50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Site PM App
                  </span>
                </div>

                {/* PROJECT SELECTOR INSIDE MOBILE APP */}
                <div className="space-y-1.5 bg-white/[0.03] border border-white/5 p-3 rounded-2xl">
                  <label className="block text-[10px] font-bold text-white/50 uppercase">
                    {t('labelSelectProjectMobile')}
                  </label>
                  {activePmProjectsList.length === 0 ? (
                    <div className="text-red-400 text-xs py-1">No projects assigned to this manager.</div>
                  ) : (
                    <select
                      value={simActiveProjectCode}
                      onChange={(e) => setSimActiveProjectCode(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-neutral-950 py-2 px-3 text-xs font-bold text-white outline-none focus:border-[#717CFF]"
                    >
                      {activePmProjectsList.map(p => (
                        <option key={p.code} value={p.code}>{p.code} - {p.name.slice(0, 18)}...</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Mobile Quick KPI Summary Frame */}
                <div className="bg-gradient-to-br from-[#1F2128] to-[#17181D] border border-white/5 p-4 rounded-2xl space-y-3 shadow-md">
                  <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold flex items-center justify-between">
                    <span>{t('simBalanceTitle')} ({simActiveProjectCode})</span>
                    <span className="text-[8px] text-[#717CFF] font-extrabold">{activePmProject?.location}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <div className="text-[9px] text-white/50 font-medium">{t('simCashFunds')}</div>
                      <div className="text-sm font-extrabold text-emerald-400">
                        ৳{activePmProjectBalance.toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[9px] text-white/50 font-medium">{t('simBakiOutstanding')}</div>
                      <div className="text-sm font-extrabold text-red-400">
                        ৳{expenses
                          .filter(e => e.teamEmail === activePm?.email && e.projectCode === simActiveProjectCode && e.type === 'baki')
                          .reduce((acc, curr) => {
                            const paidAmount = (curr.payments || []).reduce((sum, p) => sum + p.amount, 0);
                            return acc + Math.max(0, curr.amount - paidAmount);
                          }, 0)
                          .toLocaleString()
                        }
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-white/40 font-semibold">
                    <span className="truncate">Active Project: {activePmProject?.name}</span>
                  </div>
                </div>

                {/* Form header */}
                <div className="space-y-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-white/80">
                    {t('simTitle')}: {t('typeCash')} / {t('typeBaki')}
                  </h3>
                  <p className="text-[10px] text-white/50">
                    {lang === 'bn' ? 'মাঠের খরচ সাথে সাথে সাধারণ খতিয়ানে যুক্ত হবে।' : 'Submit local expenditures instantly into the owner general ledger.'}
                  </p>
                </div>

                {/* Mobile Daily Expense Form */}
                <form onSubmit={handleMobileSubmitExpense} className="space-y-3 bg-[#1B1D24] p-4 rounded-2xl border border-white/5">
                  
                  {/* Expense Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">
                      {t('labelMobileTitle')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t('placeholderMobileTitle')}
                      value={simExpenseTitle}
                      onChange={(e) => setSimExpenseTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 outline-none focus:border-[#717CFF] transition-all"
                    />
                  </div>

                  {/* Expense Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">
                      {t('labelMobileAmount')} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 15000"
                      value={simExpenseAmount}
                      onChange={(e) => setSimExpenseAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-950 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 outline-none focus:border-[#717CFF] transition-all"
                    />
                  </div>

                  {/* Payment Type Switcher (NAGAD vs BAKI) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">
                      {t('labelMobilePaymentType')}
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setSimExpenseType('cash')}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          simExpenseType === 'cash'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                            : 'bg-neutral-950 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {t('btnSimCash')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSimExpenseType('baki')}
                        className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                          simExpenseType === 'baki'
                            ? 'bg-red-500/20 border-red-500 text-red-300'
                            : 'bg-neutral-950 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {t('btnSimBaki')}
                      </button>
                    </div>
                  </div>

                  {/* Vendor / Supplier input (only if BAKI) */}
                  {simExpenseType === 'baki' && (
                    <div className="space-y-1 animate-fadeIn">
                      <label className="text-[10px] font-bold text-red-400">
                        {t('labelVendor')} <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder={t('placeholderVendor')}
                        value={simExpenseVendor}
                        onChange={(e) => setSimExpenseVendor(e.target.value)}
                        className="w-full px-3 py-2 bg-neutral-950 border border-red-500/30 rounded-lg text-xs text-white placeholder-white/30 outline-none focus:border-red-500 transition-all"
                      />
                    </div>
                  )}

                  {/* Mock Receipt Upload */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">
                      {t('labelVoucher')}
                    </label>
                    <div className="mt-1 flex items-center gap-3">
                      {simExpenseReceiptIdx !== null ? (
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-white/20 animate-fadeIn">
                          <img 
                            src={MOCK_RECEIPT_FILES[simExpenseReceiptIdx]} 
                            alt="Receipt thumb" 
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setSimExpenseReceiptIdx(null)}
                            className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5"
                          >
                            <X className="h-2 w-2 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSimExpenseReceiptIdx(Math.floor(Math.random() * MOCK_RECEIPT_FILES.length))}
                          className="h-12 flex-1 border border-dashed border-white/15 bg-neutral-950 hover:bg-neutral-900 rounded-lg flex items-center justify-center gap-1.5 text-white/40 hover:text-white/60 transition-colors cursor-pointer"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          <span className="text-[9px]">{t('btnCamera')}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes / Comments */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">
                      {t('labelNotes')}
                    </label>
                    <textarea
                      placeholder={t('placeholderNotes')}
                      value={simExpenseNotes}
                      onChange={(e) => setSimExpenseNotes(e.target.value)}
                      className="w-full px-3 py-1.5 bg-neutral-950 border border-white/10 rounded-lg text-xs text-white placeholder-white/30 outline-none focus:border-[#717CFF] transition-all min-h-[44px]"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-gradient-to-tr from-[#5E6AD2] to-[#717CFF] hover:opacity-90 font-bold text-[11px] shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                    <span>{t('btnSubmitExpense')}</span>
                  </button>

                </form>

                {/* Mobile Logged Expenses Mini-List */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-extrabold uppercase text-white/60 tracking-wider">
                    {t('simLoggedTitle')} ({simActiveProjectCode})
                  </h4>
                  
                  <div className="space-y-1.5">
                    {pmExpensesList.length === 0 ? (
                      <div className="text-center py-4 text-[10px] text-white/30 italic">
                        {t('noSimExpenses')}
                      </div>
                    ) : (
                      pmExpensesList
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((item) => (
                          <div key={item.id} className="bg-[#17181D] p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2.5 animate-fadeIn">
                            <div className="min-w-0">
                              <h5 className="font-bold text-white/90 truncate">{item.title}</h5>
                              <div className="flex items-center gap-1 text-[8px] text-white/40 mt-0.5 font-bold">
                                <span>{item.date}</span>
                                <span>&bull;</span>
                                <span className={item.type === 'baki' ? 'text-red-400' : 'text-emerald-400'}>
                                  {item.type === 'baki' ? `${lang === 'bn' ? 'বাকি' : 'Due'}: ${item.vendor?.slice(0, 15)}...` : (lang === 'bn' ? 'নগদ' : 'Cash')}
                                </span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="font-extrabold text-white">৳{item.amount.toLocaleString()}</p>
                              <span className="text-[8px] font-extrabold uppercase px-1 rounded bg-emerald-500/20 text-emerald-400">
                                {t('activeLedgerLabel')}
                              </span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

              </div>

              {/* Phone bottom virtual gesture pill bar */}
              <div className="h-6 flex items-center justify-center shrink-0">
                <div className="w-32 h-1 bg-white/30 rounded-full mb-1.5"></div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* --- MODALS SECTION --- */}
      
      {/* 1. Add Project Modal */}
      {showAddProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#18181b] animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E5E6] pb-3 mb-4 dark:border-white/5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#08090A] dark:text-white">
                {t('modalCreateProj')}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAddProjectModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('projName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LGED Road Tangail"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                    {t('projCode')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LBC-TG"
                    value={newProjectCode}
                    onChange={(e) => setNewProjectCode(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                    {t('projLocation')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mirzapur, Tangail"
                    value={newProjectLocation}
                    onChange={(e) => setNewProjectLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('projBudget')}
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 12000000"
                  value={newProjectBudget}
                  onChange={(e) => setNewProjectBudget(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="w-1/2 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-[#5E6AD2] py-2 text-xs font-bold text-white shadow-md hover:bg-[#5E6AD2]/90 dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 transition-all cursor-pointer"
                >
                  {t('btnCreate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Invite PM Modal */}
      {showInviteMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#18181b] animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E5E6] pb-3 mb-4 dark:border-white/5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#08090A] dark:text-white">
                {t('modalInvitePm')}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowInviteMemberModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('pmEmail')}
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. manager@lged.gov.bd"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('pmName')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abul Kashem"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('pmRole')}
                </label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                >
                  <option value="Project Manager">Project Manager</option>
                  <option value="Site Engineer">Site Engineer</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Accountant">Accountant</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('assignProjects')}
                </label>
                <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar border border-[#E5E5E6] dark:border-white/10 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950">
                  {projects.map(p => (
                    <label key={p.code} className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-[#08090A] dark:text-neutral-300">
                      <input
                        type="checkbox"
                        checked={newMemberProjectCodes.includes(p.code)}
                        onChange={() => handleToggleProjectSelection(p.code)}
                        className="rounded text-[#5E6AD2]"
                      />
                      <span>{p.code} - {p.name.slice(0, 24)}...</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('pmMobile')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. +88017xxxxxxxx"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteMemberModal(false)}
                  className="w-1/2 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-[#5E6AD2] py-2 text-xs font-bold text-white shadow-md hover:bg-[#5E6AD2]/90 dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 transition-all cursor-pointer"
                >
                  {t('btnInvite')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Send Cash (Allocate Funds per Project) Modal */}
      {showAllocateCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#18181b] animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E5E6] pb-3 mb-4 dark:border-white/5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#08090A] dark:text-white">
                {t('modalSendCash')}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAllocateCashModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAllocateCash} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('allocPm')}
                </label>
                <select
                  value={allocEmail}
                  onChange={(e) => setAllocEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                >
                  <option value="">Select Recipient PM...</option>
                  {team.map(t => (
                    <option key={t.email} value={t.email}>{t.name} ({t.role}) &bull; {t.email}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('allocProj')}
                </label>
                <select
                  value={allocProjectCode}
                  onChange={(e) => setAllocProjectCode(e.target.value)}
                  required
                  disabled={!allocEmail}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2] disabled:opacity-50"
                >
                  <option value="">Select Target Project...</option>
                  {allocEmailProjects.map(p => (
                    <option key={p.code} value={p.code}>{p.code} - {p.name.slice(0, 24)}...</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                    {t('allocAmount')}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 150000"
                    value={allocAmount}
                    onChange={(e) => setAllocAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                    {t('allocMethod')}
                  </label>
                  <select
                    value={allocMethod}
                    onChange={(e) => setAllocMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Cash Handover">Cash Handover</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {t('allocNotes')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sent to Karim for Tangail concrete mixer rent"
                  value={allocNotes}
                  onChange={(e) => setAllocNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateCashModal(false)}
                  className="w-1/2 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-[#5E6AD2] py-2 text-xs font-bold text-white shadow-md hover:bg-[#5E6AD2]/90 dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 transition-all cursor-pointer"
                >
                  {t('btnConfirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Owner/Admin Log Expense Modal */}
      {showAdminExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#18181b] animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#E5E5E6] pb-3 mb-4 dark:border-white/5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-[#08090A] dark:text-white">
                {lang === 'bn' ? 'খরচ লোগ করুন (Admin)' : 'Log Expense (Admin)'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowAdminExpenseModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAdminSubmitExpense} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {lang === 'bn' ? 'প্রজেক্ট নির্বাচন করুন' : 'Select Project'}
                </label>
                <select
                  value={adminExpenseProjectCode}
                  onChange={(e) => setAdminExpenseProjectCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                >
                  {projects.map(p => (
                    <option key={p.code} value={p.code}>{p.code} - {p.name.slice(0, 24)}...</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {lang === 'bn' ? 'খরচের বিবরণ' : 'Expense Title / Detail'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'bn' ? 'যেমন: বালু ক্রয়, চা-নাস্তা খরচ' : 'e.g. Extra bricks, local steel'}
                  value={adminExpenseTitle}
                  onChange={(e) => setAdminExpenseTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                    {lang === 'bn' ? 'টাকার পরিমাণ (BDT)' : 'Amount (BDT)'}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={adminExpenseAmount}
                    onChange={(e) => setAdminExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                    {lang === 'bn' ? 'পরিশোধের ধরণ' : 'Payment Type'}
                  </label>
                  <select
                    value={adminExpenseType}
                    onChange={(e) => setAdminExpenseType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                  >
                    <option value="cash">{lang === 'bn' ? '🟢 নগদ খরচ' : 'Cash (Nagad)'}</option>
                    <option value="baki">{lang === 'bn' ? '🔴 বাকি খরচ' : 'Baki (Due)'}</option>
                  </select>
                </div>
              </div>

              {adminExpenseType === 'baki' && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="block text-xs font-bold text-red-500 uppercase">
                    {lang === 'bn' ? 'বাকি বিক্রেতার নাম' : 'Vendor / Supplier Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === 'bn' ? 'যেমন: মেসার্স বিসমিল্লাহ স্টিল' : 'e.g. Messrs Bismillah Steel'}
                    value={adminExpenseVendor}
                    onChange={(e) => setAdminExpenseVendor(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-red-500/30 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#62666D] dark:text-neutral-400 uppercase">
                  {lang === 'bn' ? 'লেনদেন রেফারেন্স / নোট' : 'Notes'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'bn' ? 'কোন মন্তব্য থাকলে...' : 'Enter optional notes...'}
                  value={adminExpenseNotes}
                  onChange={(e) => setAdminExpenseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs text-[#08090A] dark:text-white outline-none focus:border-[#5E6AD2]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminExpenseModal(false)}
                  className="w-1/2 rounded-xl border border-neutral-200 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  {t('btnCancel')}
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-red-600 py-2 text-xs font-bold text-white shadow-md hover:bg-red-700 transition-all cursor-pointer"
                >
                  {lang === 'bn' ? 'খরচ যোগ করুন' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Custom Settlement Confirmation Modal (Popup) */}
      {settleConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/20 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#18181b] animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-[#E5E5E6] pb-3 mb-4 dark:border-white/5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="h-4 w-4" />
                <span>{lang === 'bn' ? 'পরিশোধ নিশ্চিতকরণ' : 'Confirm Settlement'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setSettleConfirmExpense(null)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/50 rounded-xl space-y-2 text-xs">
                <p className="text-emerald-800 dark:text-emerald-400 font-extrabold leading-relaxed text-sm">
                  {lang === 'bn'
                    ? `মেসার্স "${settleConfirmExpense.vendor || 'সরবরাহকারী'}"-এর বকেয়া বিল পরিশোধ`
                    : `Settle Due to "${settleConfirmExpense.vendor || 'Vendor'}"`
                  }
                </p>
                <div className="text-neutral-600 dark:text-neutral-300 space-y-1 pt-1">
                  <p>{lang === 'bn' ? `মূল বকেয়া বিল: ৳${settleConfirmExpense.amount.toLocaleString()}` : `Original Bill: BDT ${settleConfirmExpense.amount.toLocaleString()}`}</p>
                  {(() => {
                    const paid = (settleConfirmExpense.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
                    const remaining = Math.max(0, settleConfirmExpense.amount - paid);
                    return (
                      <>
                        {paid > 0 && <p>{lang === 'bn' ? `পূর্বে পরিশোধিত: ৳${paid.toLocaleString()}` : `Previously Paid: BDT ${paid.toLocaleString()}`}</p>}
                        <p className="font-bold text-red-600 dark:text-red-400">{lang === 'bn' ? `চলতি বকেয়া পাওনা: ৳${remaining.toLocaleString()}` : `Current Outstanding Due: BDT ${remaining.toLocaleString()}`}</p>
                      </>
                    );
                  })()}
                </div>
                
                <div className="space-y-3 pt-2 border-t border-emerald-200/30 dark:border-emerald-800/30">
                  {/* Amount Input */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-extrabold uppercase text-[#8A8F98]">
                      {lang === 'bn' ? 'পরিশোধের পরিমাণ (Amount):' : 'Amount to Pay:'}
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 5000"
                      value={settleAmountInput}
                      onChange={(e) => setSettleAmountInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs font-bold text-[#08090A] dark:text-white outline-none focus:border-emerald-500 shadow-xs"
                    />
                  </div>

                  {/* Process Select */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-extrabold uppercase text-[#8A8F98]">
                      {lang === 'bn' ? 'পরিশোধের মাধ্যম (Process):' : 'Settlement Process:'}
                    </span>
                    <select
                      value={inlineSettleProcess}
                      onChange={(e) => setInlineSettleProcess(e.target.value as 'direct' | 'pm')}
                      className="w-full px-3 py-2 bg-white dark:bg-neutral-950 border border-[#E5E5E6] dark:border-white/10 rounded-xl text-xs font-bold text-[#08090A] dark:text-white outline-none focus:border-emerald-500 cursor-pointer shadow-xs"
                    >
                      <option value="direct">{lang === 'bn' ? 'সরাসরি বিক্রেতাকে (Direct Vendor)' : 'Direct to Vendor'}</option>
                      <option value="pm">{lang === 'bn' ? 'ম্যানেজারের মাধ্যমে (To the PM)' : 'Through the PM'}</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-emerald-200/30 dark:border-emerald-800/30 pt-2 text-[#62666D] dark:text-neutral-400 leading-normal">
                  <span className="font-extrabold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    {lang === 'bn' ? '⚠️ অ্যাকাউন্টিং প্রভাব (Accounting Impact):' : '⚠️ Accounting Impact:'}
                  </span>
                  {inlineSettleProcess === 'direct'
                    ? (lang === 'bn' 
                      ? 'প্রজেক্টের মোট বকেয়া কমবে কিন্তু সাইটের দায়িত্বে থাকা ম্যানেজারের নগদ তহবিল (PM Wallet Cash) অপরিবর্তিত থাকবে।'
                      : 'The total project dues will be cleared, but the site manager\'s cash-on-hand wallet balance will remain unaffected.')
                    : (lang === 'bn'
                      ? 'প্রজেক্টের বকেয়া পরিশোধ হবে এবং উক্ত পরিমাণ টাকা পিএম-এর নগদ তহবিল (PM Wallet Cash) থেকে বাদ যাবে।'
                      : 'The project dues will be cleared and the amount will be deducted from the site manager\'s cash-on-hand wallet balance.')
                  }
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSettleConfirmExpense(null)}
                  className="w-1/2 rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const amountToPay = parseFloat(settleAmountInput);
                    const paid = (settleConfirmExpense.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
                    const remaining = Math.max(0, settleConfirmExpense.amount - paid);
                    if (isNaN(amountToPay) || amountToPay <= 0 || amountToPay > remaining) {
                      alert(lang === 'bn'
                        ? `পরিশোধের পরিমাণ অবশ্যই ০ থেকে ৳${remaining.toLocaleString()}-এর মধ্যে হতে হবে।`
                        : `Payment amount must be between 0 and BDT ${remaining.toLocaleString()}.`
                      );
                      return;
                    }
                    const newPayment: DuePayment = {
                      id: 'pay-' + Date.now(),
                      amount: amountToPay,
                      date: new Date().toISOString().split('T')[0],
                      method: inlineSettleProcess
                    };
                    setExpenses(expenses.map(e => {
                      if (e.id === settleConfirmExpense.id) {
                        const newPayments = [...(e.payments || []), newPayment];
                        const totalPaid = newPayments.reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
                        const isFullySettled = totalPaid >= e.amount;
                        return {
                          ...e,
                          payments: newPayments,
                          isSettled: isFullySettled,
                          settleMethod: inlineSettleProcess
                        };
                      }
                      return e;
                    }));
                    setSettleConfirmExpense(null);
                  }}
                  className="w-1/2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer text-center"
                >
                  {lang === 'bn' ? 'হ্যাঁ, পরিশোধ করুন' : 'Confirm Payment'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. Central Dues Settlement Portal Modal (Popup) */}
      {showSettleDuesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-4xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#18181b] animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-[#E5E5E6] pb-3 mb-4 dark:border-white/5">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CreditCard className="h-4.5 w-4.5" />
                <span>{t('modalSettleDuesTitle')}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setShowSettleDuesModal(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {expenses.filter(e => {
                if (e.type !== 'baki') return false;
                const paid = (e.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
                return paid < e.amount;
              }).length === 0 ? (
                <div className="py-8 text-center text-xs font-semibold text-neutral-500 dark:text-neutral-400 space-y-2">
                  <div className="flex items-center justify-center">
                    <Check className="h-10 w-10 text-emerald-500 bg-emerald-100 dark:bg-emerald-950/20 p-2 rounded-full" />
                  </div>
                  <p>{t('noDuesMsg')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96 rounded-xl border border-[#E5E5E6] dark:border-white/5">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E5E5E6] dark:border-white/5 text-[10px] text-neutral-400 font-bold uppercase bg-[#F9FAFB] dark:bg-neutral-950">
                        <th className="p-3">{t('colDate')}</th>
                        <th className="p-3">{lang === 'bn' ? 'প্রজেক্ট ও পিএম' : 'Project & PM'}</th>
                        <th className="p-3">{t('colDesc')}</th>
                        <th className="p-3 text-right">{lang === 'bn' ? 'পরিশোধের পরিমাণ (BDT)' : 'Payment Amount'}</th>
                        <th className="p-3 text-center">{t('colProcess')}</th>
                        <th className="p-3 text-center">{t('colAction')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E6] dark:divide-white/5">
                      {expenses
                        .filter(e => {
                          if (e.type !== 'baki') return false;
                          const paid = (e.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
                          return paid < e.amount;
                        })
                        .map((item) => {
                          const pmName = team.find(t => t.email === item.teamEmail)?.name || item.teamEmail.split('@')[0];
                          const selectedProc = settleProcesses[item.id] || 'direct';
                          const paidAmount = (item.payments || []).reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
                          const remainingDue = Math.max(0, item.amount - paidAmount);
                          const currentInputVal = bulkSettleAmounts[item.id] !== undefined ? bulkSettleAmounts[item.id] : remainingDue.toString();

                          return (
                            <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-white/[0.01]">
                              <td className="p-3 whitespace-nowrap text-neutral-400">{item.date}</td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="font-extrabold text-[#5E6AD2] dark:text-[#717CFF]">{item.projectCode}</div>
                                <div className="text-[10px] text-neutral-400">{pmName}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-[#08090A] dark:text-white">{item.title}</div>
                                <div className="text-[10px] text-neutral-400">{lang === 'bn' ? 'বিক্রেতা: ' : 'Vendor: '} {item.vendor || '-'}</div>
                                <div className="text-[9px] text-neutral-500 font-semibold space-y-0.5 mt-0.5">
                                  <p>{lang === 'bn' ? `মূল: ৳${item.amount.toLocaleString()}` : `Total: BDT ${item.amount.toLocaleString()}`}</p>
                                  {paidAmount > 0 && <p>{lang === 'bn' ? `পরিশোধিত: ৳${paidAmount.toLocaleString()}` : `Paid: BDT ${paidAmount.toLocaleString()}`}</p>}
                                  <p className="text-red-500">{lang === 'bn' ? `বাকী: ৳${remainingDue.toLocaleString()}` : `Due: BDT ${remainingDue.toLocaleString()}`}</p>
                                </div>
                              </td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <input
                                  type="number"
                                  value={currentInputVal}
                                  onChange={(e) => setBulkSettleAmounts({
                                    ...bulkSettleAmounts,
                                    [item.id]: e.target.value
                                  })}
                                  className="w-24 rounded-lg border border-[#E5E5E6] bg-white py-1.5 px-2 text-xs font-bold text-[#08090A] outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-white"
                                />
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <select
                                  value={selectedProc}
                                  onChange={(e) => setSettleProcesses({
                                    ...settleProcesses,
                                    [item.id]: e.target.value as 'direct' | 'pm'
                                  })}
                                  className="rounded-lg border border-[#E5E5E6] bg-white py-1 px-2 text-[11px] font-bold text-[#08090A] outline-none dark:border-white/10 dark:bg-neutral-950 dark:text-white cursor-pointer"
                                >
                                  <option value="direct">{t('processDirect')}</option>
                                  <option value="pm">{t('processPm')}</option>
                                </select>
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const amountVal = parseFloat(currentInputVal);
                                    if (isNaN(amountVal) || amountVal <= 0 || amountVal > remainingDue) {
                                      alert(lang === 'bn'
                                        ? `পরিশোধের পরিমাণ অবশ্যই ০ থেকে ৳${remainingDue.toLocaleString()}-এর মধ্যে হতে হবে।`
                                        : `Payment amount must be between 0 and BDT ${remainingDue.toLocaleString()}.`
                                      );
                                      return;
                                    }
                                    const newPayment: DuePayment = {
                                      id: 'pay-' + Date.now(),
                                      amount: amountVal,
                                      date: new Date().toISOString().split('T')[0],
                                      method: selectedProc
                                    };
                                    setExpenses(expenses.map(e => {
                                      if (e.id === item.id) {
                                        const newPayments = [...(e.payments || []), newPayment];
                                        const totalPaid = newPayments.reduce((sum: number, p: DuePayment) => sum + p.amount, 0);
                                        const isFullySettled = totalPaid >= e.amount;
                                        return {
                                          ...e,
                                          payments: newPayments,
                                          isSettled: isFullySettled,
                                          settleMethod: selectedProc
                                        };
                                      }
                                      return e;
                                    }));

                                    const updatedRemaining = remainingDue - amountVal;
                                    setBulkSettleAmounts({
                                      ...bulkSettleAmounts,
                                      [item.id]: updatedRemaining > 0 ? updatedRemaining.toString() : '0'
                                    });
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                                >
                                  <Check className="h-3.5 w-3.5 shrink-0" />
                                  <span>{t('btnSettle')}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowSettleDuesModal(false)}
                  className="rounded-xl border border-neutral-200 bg-white py-2 px-5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition-all cursor-pointer"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Invite Status Dialog Modal */}
      {inviteStatusModal && inviteStatusModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E5E6] bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900 transition-all">
            {inviteStatusModal.loading ? (
              // Loading/Processing State
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-neutral-100 dark:border-neutral-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-[#5E6AD2] border-r-transparent border-b-transparent border-l-transparent animate-spin dark:border-t-[#717CFF]" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-[#08090A] dark:text-white leading-tight">
                    {inviteStatusModal.title}
                  </h3>
                  <p className="text-xs text-neutral-400 font-semibold leading-relaxed">
                    {inviteStatusModal.message}
                  </p>
                </div>
              </div>
            ) : (
              // Success/Failure State
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${inviteStatusModal.success ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400'}`}>
                    {inviteStatusModal.success ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <X className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-[#08090A] dark:text-white leading-tight">
                      {inviteStatusModal.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider mt-0.5">
                      {inviteStatusModal.success ? (lang === 'bn' ? 'নিরাপদ লেনদেন' : 'Secure operation') : (lang === 'bn' ? 'ত্রুটি বার্তা' : 'Error details')}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed font-semibold">
                    {inviteStatusModal.message}
                  </p>

                  {inviteStatusModal.link && (
                    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-100 dark:border-white/5 p-3.5 space-y-2.5">
                      <span className="block text-[10px] font-extrabold text-[#5E6AD2] dark:text-[#717CFF] uppercase tracking-wider">
                        {lang === 'bn' ? 'সেট-পাসওয়ার্ড লিঙ্ক (Set Password Link)' : 'Set Password Link'}
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={inviteStatusModal.link}
                          className="block flex-1 rounded-lg border border-neutral-200 bg-white dark:bg-neutral-950 py-2.5 px-3 text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(inviteStatusModal.link || '');
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          }}
                          className="rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3.5 py-2.5 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                        >
                          {linkCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>{lang === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span>{lang === 'bn' ? 'কপি করুন' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-neutral-400 font-bold">
                        {lang === 'bn' ? '💡 বাটনে ক্লিক করে লিঙ্কটি কপি করুন এবং পিএম-কে পাঠান।' : '💡 Click the copy button to copy the setup link and send it to the PM.'}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setInviteStatusModal(null)}
                      className="rounded-xl bg-[#5E6AD2] hover:bg-[#5E6AD2]/90 text-white dark:bg-[#717CFF] dark:hover:bg-[#717CFF]/90 px-5 py-3 text-sm font-bold shadow-sm transition-all cursor-pointer"
                    >
                      {lang === 'bn' ? 'ঠিক আছে' : 'OK'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
