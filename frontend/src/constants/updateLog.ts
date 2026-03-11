export interface UpdateLogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const APP_VERSION = '1.0.0';

export const UPDATE_LOG: UpdateLogEntry[] = [
  {
    version: '1.0.0-a',
    date: '10/03/2026',
    changes: [
      'Added country and city to user profiles',
      'Country and city can now be edited in settings',
      'Added update log in settings to track app changes',
      'More secure logout process',
    ],
  },
  {
    version: '1.0.0-b',
    date: '11/03/2026',
    changes: [
      'Various bug fixes and performance improvements',
    ],
  },
];
