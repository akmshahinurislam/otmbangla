import type { IconComponent } from '../shared/icons/AppIcons';

export type UserFunctionId =
  | 'dashboard'
  | 'rate-prediction'
  | 'contractor-analysis'
  | 'average-nppi'
  | 'current-slt-less'
  | 'winner-prediction'
  | 'slt-calculator'
  | 'tender-notices'
  | 'download-extension';

export type UserFunction = {
  id: UserFunctionId;
  name: string;
  description: string;
  statusLabel: string;
  accentClassName: string;
  icon: IconComponent;
  Page: () => JSX.Element;
};
