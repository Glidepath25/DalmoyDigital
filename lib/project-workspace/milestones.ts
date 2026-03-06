export type DefaultMilestone = {
  key: string;
  name: string;
  sortOrder: number;
};

export const DEFAULT_PROGRAMME_MILESTONES: DefaultMilestone[] = [
  { key: "tender", name: "Tender", sortOrder: 10 },
  { key: "tender_submission", name: "Tender Submission", sortOrder: 20 },
  { key: "contract_award", name: "Contract Award", sortOrder: 30 },
  { key: "mobilisation", name: "Mobilisation", sortOrder: 40 },
  { key: "demolition", name: "Demolition", sortOrder: 50 },
  { key: "structural", name: "Structural", sortOrder: 60 },
  { key: "first_fix", name: "First Fix", sortOrder: 70 },
  { key: "coverings", name: "Coverings", sortOrder: 80 },
  { key: "second_fix", name: "2nd Fix", sortOrder: 90 },
  { key: "furniture", name: "Furniture", sortOrder: 100 },
  { key: "cleaning", name: "Cleaning", sortOrder: 110 },
  { key: "snagging", name: "Snagging", sortOrder: 120 },
  { key: "handover", name: "Handover", sortOrder: 130 }
];

