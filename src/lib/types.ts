export interface TravelRow {
  dateReceived: number | null;
  officerName: string;
  gender: 'M' | 'F' | '';
  positionTitle: string;
  department: string;
  ministry: string;
  typeOfTravel: string;
  travelDate: string;
  returnDate: string;
  destination: string;
  purpose: string;
  fundingSource: string;
  estimatedCost: number | null;
  imprestTotal: string;
  donorName: string;
  approvalStatus: string;
  report: string;
  travelMode: string;
  sheet: 'International' | 'Domestic';
}

export type PageId = 'executive' | 'ministry' | 'tracker';
