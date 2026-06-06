export interface TreeNode {
  id: string;
  text: string;
  children?: TreeNode[];
}

export interface TenderNotice {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryId: string;
  organization: string;
  organizationId: string;
  district: string;
  districtId: string;
  budget: string;
  method: 'OTM' | 'LTM' | 'RFP' | 'RFQ' | 'e-GP';
  publishedDate: string;
  closingDate: string;
  status: 'Live' | 'Corrigendum' | 'Evaluation' | 'Closed';
  securityAmount: string;
}
