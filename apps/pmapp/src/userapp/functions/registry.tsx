import { AnalysisIcon, DashboardIcon, NPPIIcon, PredictionIcon, SLTIcon, WinnerIcon, NoticeIcon, DownloadIcon } from '../shared/icons/AppIcons';
import { Capacitor } from '@capacitor/core';
import { SLTCalculatorPage } from './slt-calculator/SLTCalculatorPage';
import { AverageNPPIPage } from './average-nppi/AverageNPPIPage';
import { ContractorAnalysisPage } from './contractor-analysis/ContractorAnalysisPage';
import { CurrentSLTLessPage } from './current-slt-less/CurrentSLTLessPage';
import { DashboardPage } from './dashboard/DashboardPage';
import { RatePredictionPage } from './rate-prediction/RatePredictionPage';
import type { UserFunction, UserFunctionId } from './types';
import { WinnerPredictionPage } from './winner-prediction/WinnerPredictionPage';
import { TenderNoticesPage } from './tender-notices/TenderNoticesPage';
import { DownloadExtensionPage } from './download-extension/DownloadExtensionPage';
import { ProjectLedgerPage } from './project-ledger/ProjectLedgerPage';
import { Briefcase } from 'lucide-react';

type DashboardPageFactoryProps = {
  getFunctions: () => UserFunction[];
  onOpenFunction: (functionId: UserFunctionId) => void;
};

export function createUserFunctions({ getFunctions, onOpenFunction }: DashboardPageFactoryProps): UserFunction[] {
  const allFunctions: UserFunction[] = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Overview of available functions and workspace status.',
      statusLabel: 'Workspace',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#5E6AD2] group-hover:border-[#5E6AD2] group-hover:bg-[#5E6AD2] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: DashboardIcon,
      Page: () => <DashboardPage functions={getFunctions()} onOpenFunction={onOpenFunction} />,
    },
    {
      id: 'rate-prediction',
      name: 'Rate Prediction',
      description: 'Forecast rates using historical data, deviation, and seasonal patterns.',
      statusLabel: 'Prediction',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#5E6AD2] group-hover:border-[#717CFF] group-hover:bg-[#5E6AD2] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: PredictionIcon,
      Page: RatePredictionPage,
    },
    {
      id: 'contractor-analysis',
      name: 'Contractor Analysis',
      description: 'Evaluate contractor success rates, performance index, and bidding behavior.',
      statusLabel: 'Analysis',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#55CDFF] group-hover:border-[#55CDFF] group-hover:bg-[#55CDFF] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: AnalysisIcon,
      Page: ContractorAnalysisPage,
    },
    {
      id: 'average-nppi',
      name: 'Average NPPI',
      description: 'Measure procurement performance against standard efficiency benchmarks.',
      statusLabel: 'Calculation',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#89D196] group-hover:border-[#89D196] group-hover:bg-[#89D196] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: NPPIIcon,
      Page: AverageNPPIPage,
    },
    {
      id: 'current-slt-less',
      name: 'Current SLT Less',
      description: 'Track SLA and service-level threshold metrics for delivery timelines.',
      statusLabel: 'Operations',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#FFC47C] group-hover:border-[#FFC47C] group-hover:bg-[#FFC47C] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: SLTIcon,
      Page: CurrentSLTLessPage,
    },
    {
      id: 'slt-calculator',
      name: 'SLT Calculator',
      description: 'Calculate SLT thresholds, limits and summaries for a tender.',
      statusLabel: 'Calculator',
      accentClassName: 'border-[#E5E5E6] bg-[#F3F4F6] text-[#FFC47C] group-hover:border-[#FFC47C] group-hover:bg-[#FFC47C] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: SLTIcon,
      Page: SLTCalculatorPage,
    },
    {
      id: 'winner-prediction',
      name: 'Winner Prediction',
      description: 'Score upcoming procurements and estimate probable winning outcomes.',
      statusLabel: 'Scoring',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#F79CE0] group-hover:border-[#F79CE0] group-hover:bg-[#F79CE0] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: WinnerIcon,
      Page: WinnerPredictionPage,
    },
    {
      id: 'tender-notices',
      name: 'Tender Notices',
      description: 'Search, filter, and track live tenders from government, semi-government, and private agencies.',
      statusLabel: 'Notices',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#5E6AD2] group-hover:border-[#5E6AD2] group-hover:bg-[#5E6AD2] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: NoticeIcon,
      Page: TenderNoticesPage,
    },
    {
      id: 'download-extension',
      name: 'Download Extension',
      description: 'Download Chrome Extension companion to chat with any web page content.',
      statusLabel: 'Companion',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#717CFF] group-hover:border-[#717CFF] group-hover:bg-[#717CFF] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: DownloadIcon,
      Page: DownloadExtensionPage,
    },
    {
      id: 'project-ledger',
      name: 'Project & Team Ledger',
      description: 'Manage contractor projects, track budgets, and invite project managers to log cash expenditures & dues.',
      statusLabel: 'Accounting',
      accentClassName:
        'border-[#E5E5E6] bg-[#F3F4F6] text-[#5E6AD2] group-hover:border-[#5E6AD2] group-hover:bg-[#5E6AD2] dark:border-white/10 dark:bg-white/[0.04] dark:text-neutral-300 dark:group-hover:bg-white/[0.08]',
      icon: (props) => <Briefcase {...props} />,
      Page: ProjectLedgerPage,
    },
  ];

  if (Capacitor.isNativePlatform()) {
    return allFunctions.filter(func => 
      func.id === 'dashboard' || 
      func.id === 'tender-notices' || 
      func.id === 'slt-calculator' ||
      func.id === 'project-ledger'
    );
  }

  return allFunctions;
}
