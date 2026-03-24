import type { PolicyType } from '../../shared/types';

export interface PolicyCardDef {
  readonly cardId: string;
  readonly name: string;
  readonly type: PolicyType;
}

export const VIRTUOUS_POOL = [
  { cardId: 'school-lunch-program', name: 'School Lunch Program', type: 'good' },
  { cardId: 'public-library-expansion', name: 'Public Library Expansion', type: 'good' },
  { cardId: 'harbor-cleanup-initiative', name: 'Harbor Cleanup Initiative', type: 'good' },
  { cardId: 'veterans-memorial-park', name: 'Veterans Memorial Park', type: 'good' },
  { cardId: 'free-clinic-act', name: 'Free Clinic Act', type: 'good' },
  { cardId: 'streetcar-modernization', name: 'Streetcar Modernization', type: 'good' },
  { cardId: 'fire-brigade-funding', name: 'Fire Brigade Funding', type: 'good' },
  { cardId: 'orphanage-renovation', name: 'Orphanage Renovation', type: 'good' },
  { cardId: 'waterfront-promenade', name: 'Waterfront Promenade', type: 'good' },
  { cardId: 'public-radio-license', name: 'Public Radio License', type: 'good' },
  { cardId: 'bridge-safety-inspection', name: 'Bridge Safety Inspection', type: 'good' },
  { cardId: 'community-garden-act', name: 'Community Garden Act', type: 'good' },
  { cardId: 'school-music-program', name: 'School Music Program', type: 'good' },
  { cardId: 'sidewalk-lamp-project', name: 'Sidewalk Lamp Project', type: 'good' },
  { cardId: 'emergency-relief-fund', name: 'Emergency Relief Fund', type: 'good' },
] as const satisfies readonly PolicyCardDef[];

export const CORRUPT_POOL = [
  { cardId: 'dockside-kickback-scheme', name: 'Dockside Kickback Scheme', type: 'bad' },
  { cardId: 'casino-license-fast-track', name: 'Casino License Fast-Track', type: 'bad' },
  { cardId: 'evidence-locker-purge', name: 'Evidence Locker Purge', type: 'bad' },
  { cardId: 'prohibition-expansion', name: 'Prohibition Expansion', type: 'bad' },
  { cardId: 'union-bust-authorization', name: 'Union Bust Authorization', type: 'bad' },
  { cardId: 'slum-clearance-racket', name: 'Slum Clearance Racket', type: 'bad' },
  { cardId: 'midnight-rezoning-act', name: 'Midnight Rezoning Act', type: 'bad' },
  { cardId: 'witness-relocation-program', name: 'Witness "Relocation" Program', type: 'bad' },
  { cardId: 'police-pension-siphon', name: 'Police Pension Siphon', type: 'bad' },
  { cardId: 'contraband-tariff-exemption', name: 'Contraband Tariff Exemption', type: 'bad' },
  { cardId: 'backroom-bail-reform', name: 'Backroom Bail Reform', type: 'bad' },
  { cardId: 'shadow-budget-directive', name: 'Shadow Budget Directive', type: 'bad' },
  { cardId: 'waterfront-tax-holiday', name: 'Waterfront Tax Holiday', type: 'bad' },
  { cardId: 'ghost-payroll-authorization', name: 'Ghost Payroll Authorization', type: 'bad' },
  { cardId: 'jury-selection-override', name: 'Jury Selection Override', type: 'bad' },
] as const satisfies readonly PolicyCardDef[];
