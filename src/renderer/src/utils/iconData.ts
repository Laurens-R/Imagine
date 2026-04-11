export interface IconDef {
  id: string;
  label: string;
  category: string;
  /** SVG path d-attribute strings, all in viewBox "0 0 24 24". */
  paths: string[];
}

// ── Categories ────────────────────────────────────────────────────────────────

export const ICON_CATEGORIES = [
  'Arrows',
  'Symbols',
  'Communication',
  'Objects',
  'Nature',
  'Tech',
] as const;

export type IconCategory = (typeof ICON_CATEGORIES)[number];

// ── Icon definitions ──────────────────────────────────────────────────────────

export const ICON_DEFS: IconDef[] = [
  // ── Arrows ────────────────────────────────────────────────────────────────
  {
    id: 'arrow-right', label: 'Arrow Right', category: 'Arrows',
    paths: ['M5 12h14', 'M12 5l7 7-7 7'],
  },
  {
    id: 'arrow-left', label: 'Arrow Left', category: 'Arrows',
    paths: ['M19 12H5', 'M12 19l-7-7 7-7'],
  },
  {
    id: 'arrow-up', label: 'Arrow Up', category: 'Arrows',
    paths: ['M12 19V5', 'M5 12l7-7 7 7'],
  },
  {
    id: 'arrow-down', label: 'Arrow Down', category: 'Arrows',
    paths: ['M12 5v14', 'M5 12l7 7 7-7'],
  },
  {
    id: 'arrow-up-right', label: 'Arrow Up-Right', category: 'Arrows',
    paths: ['M7 17L17 7', 'M7 7h10v10'],
  },
  {
    id: 'arrow-down-left', label: 'Arrow Down-Left', category: 'Arrows',
    paths: ['M17 7L7 17', 'M17 17H7V7'],
  },
  {
    id: 'chevron-right', label: 'Chevron Right', category: 'Arrows',
    paths: ['M9 18l6-6-6-6'],
  },
  {
    id: 'chevron-left', label: 'Chevron Left', category: 'Arrows',
    paths: ['M15 18l-6-6 6-6'],
  },
  {
    id: 'chevron-up', label: 'Chevron Up', category: 'Arrows',
    paths: ['M18 15l-6-6-6 6'],
  },
  {
    id: 'chevron-down', label: 'Chevron Down', category: 'Arrows',
    paths: ['M6 9l6 6 6-6'],
  },
  {
    id: 'refresh-cw', label: 'Refresh', category: 'Arrows',
    paths: [
      'M21 2v6h-6',
      'M3 12a9 9 0 0115-6.7L21 8',
      'M3 22v-6h6',
      'M21 12a9 9 0 01-15 6.7L3 16',
    ],
  },
  {
    id: 'repeat', label: 'Repeat', category: 'Arrows',
    paths: ['M17 1l4 4-4 4', 'M3 11V9a4 4 0 014-4h14', 'M7 23l-4-4 4-4', 'M21 13v2a4 4 0 01-4 4H3'],
  },

  // ── Symbols ───────────────────────────────────────────────────────────────
  {
    id: 'check', label: 'Check', category: 'Symbols',
    paths: ['M20 6L9 17l-5-5'],
  },
  {
    id: 'x', label: 'X / Close', category: 'Symbols',
    paths: ['M18 6L6 18', 'M6 6l12 12'],
  },
  {
    id: 'plus', label: 'Plus', category: 'Symbols',
    paths: ['M12 5v14', 'M5 12h14'],
  },
  {
    id: 'minus', label: 'Minus', category: 'Symbols',
    paths: ['M5 12h14'],
  },
  {
    id: 'star', label: 'Star', category: 'Symbols',
    paths: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'],
  },
  {
    id: 'heart', label: 'Heart', category: 'Symbols',
    paths: ['M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z'],
  },
  {
    id: 'thumbs-up', label: 'Thumbs Up', category: 'Symbols',
    paths: ['M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z', 'M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3'],
  },
  {
    id: 'thumbs-down', label: 'Thumbs Down', category: 'Symbols',
    paths: ['M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z', 'M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17'],
  },
  {
    id: 'exclamation', label: 'Alert', category: 'Symbols',
    paths: ['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  },
  {
    id: 'circle-check', label: 'Circle Check', category: 'Symbols',
    paths: ['M22 11.08V12a10 10 0 11-5.93-9.14', 'M22 4L12 14.01l-3-3'],
  },
  {
    id: 'circle-x', label: 'Circle X', category: 'Symbols',
    paths: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M15 9l-6 6', 'M9 9l6 6'],
  },
  {
    id: 'ban', label: 'Ban', category: 'Symbols',
    paths: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M4.93 4.93l14.14 14.14'],
  },
  {
    id: 'question', label: 'Question', category: 'Symbols',
    paths: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  },
  {
    id: 'info', label: 'Info', category: 'Symbols',
    paths: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 8h.01', 'M12 12v4'],
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: 'message-circle', label: 'Chat', category: 'Communication',
    paths: ['M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z'],
  },
  {
    id: 'message-square', label: 'Message', category: 'Communication',
    paths: ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'],
  },
  {
    id: 'mail', label: 'Mail', category: 'Communication',
    paths: ['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M22 6l-10 7L2 6'],
  },
  {
    id: 'phone', label: 'Phone', category: 'Communication',
    paths: ['M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.63A2 2 0 012 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z'],
  },
  {
    id: 'bell', label: 'Bell', category: 'Communication',
    paths: ['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0'],
  },
  {
    id: 'user', label: 'User', category: 'Communication',
    paths: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'],
  },
  {
    id: 'users', label: 'Users', category: 'Communication',
    paths: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8z', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
  },
  {
    id: 'share', label: 'Share', category: 'Communication',
    paths: ['M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8', 'M16 6l-4-4-4 4', 'M12 2v13'],
  },
  {
    id: 'send', label: 'Send', category: 'Communication',
    paths: ['M22 2L11 13', 'M22 2L15 22 11 13 2 9l20-7z'],
  },
  {
    id: 'link', label: 'Link', category: 'Communication',
    paths: ['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71'],
  },
  {
    id: 'globe', label: 'Globe', category: 'Communication',
    paths: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M2 12h20', 'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z'],
  },
  {
    id: 'broadcast', label: 'Broadcast', category: 'Communication',
    paths: ['M6.39 17.747A9.98 9.98 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10a9.98 9.98 0 01-4.39 8.247M12 22a2 2 0 100-4 2 2 0 000 4z', 'M8.465 14.535A5 5 0 0112 13a5 5 0 013.536 1.465'],
  },

  // ── Objects ───────────────────────────────────────────────────────────────
  {
    id: 'home', label: 'Home', category: 'Objects',
    paths: ['M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10'],
  },
  {
    id: 'search', label: 'Search', category: 'Objects',
    paths: ['M11 19a8 8 0 100-16 8 8 0 000 16z', 'M21 21l-4.35-4.35'],
  },
  {
    id: 'settings', label: 'Settings', category: 'Objects',
    paths: ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'],
  },
  {
    id: 'book', label: 'Book', category: 'Objects',
    paths: ['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z'],
  },
  {
    id: 'calendar', label: 'Calendar', category: 'Objects',
    paths: ['M3 4h18v18H3z', 'M16 2v4', 'M8 2v4', 'M3 10h18'],
  },
  {
    id: 'clock', label: 'Clock', category: 'Objects',
    paths: ['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 6v6l4 2'],
  },
  {
    id: 'lock', label: 'Lock', category: 'Objects',
    paths: ['M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z', 'M7 11V7a5 5 0 0110 0v4'],
  },
  {
    id: 'key', label: 'Key', category: 'Objects',
    paths: ['M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.778-7.778zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4'],
  },
  {
    id: 'pencil', label: 'Pencil', category: 'Objects',
    paths: ['M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z'],
  },
  {
    id: 'trash', label: 'Trash', category: 'Objects',
    paths: ['M3 6h18', 'M19 6l-1 14H6L5 6', 'M10 11v6', 'M14 11v6', 'M9 6V4h6v2'],
  },
  {
    id: 'eye', label: 'Eye', category: 'Objects',
    paths: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', 'M12 15a3 3 0 100-6 3 3 0 000 6z'],
  },
  {
    id: 'flag', label: 'Flag', category: 'Objects',
    paths: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  },
  {
    id: 'tag', label: 'Tag', category: 'Objects',
    paths: ['M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z', 'M7 7h.01'],
  },
  {
    id: 'folder', label: 'Folder', category: 'Objects',
    paths: ['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z'],
  },

  // ── Nature ────────────────────────────────────────────────────────────────
  {
    id: 'sun', label: 'Sun', category: 'Nature',
    paths: [
      'M12 17a5 5 0 100-10 5 5 0 000 10z',
      'M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42',
      'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42',
    ],
  },
  {
    id: 'moon', label: 'Moon', category: 'Nature',
    paths: ['M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z'],
  },
  {
    id: 'cloud', label: 'Cloud', category: 'Nature',
    paths: ['M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z'],
  },
  {
    id: 'cloud-rain', label: 'Rain', category: 'Nature',
    paths: ['M16 13v8', 'M8 13v8', 'M12 15v8', 'M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25'],
  },
  {
    id: 'wind', label: 'Wind', category: 'Nature',
    paths: ['M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2'],
  },
  {
    id: 'snowflake', label: 'Snowflake', category: 'Nature',
    paths: ['M2 12h20', 'M12 2v20', 'M20 16l-4-4 4-4', 'M4 8l4 4-4 4', 'M16 4l-4 4-4-4', 'M8 20l4-4 4 4'],
  },
  {
    id: 'flame', label: 'Flame', category: 'Nature',
    paths: ['M8.5 14.5A2.5 2.5 0 0011 17c0 1.657-1.343 3-3 3-1.38 0-2.548-.93-2.894-2.188M12 3c0 0-4 4-4 9a4 4 0 008 0c0-1.957-.75-4.165-2.107-6.052a1 1 0 00-1.786 0C10.75 7.835 10 10 10 12a2 2 0 004 0'],
  },
  {
    id: 'leaf', label: 'Leaf', category: 'Nature',
    paths: ['M17 8C8 10 5.9 16.17 3.82 19.56A1 1 0 104.8 21C6.62 17.6 9 13 17 8z', 'M17 8L2 22'],
  },
  {
    id: 'droplets', label: 'Water', category: 'Nature',
    paths: ['M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z'],
  },
  {
    id: 'zap', label: 'Lightning', category: 'Nature',
    paths: ['M13 2L3 14h9l-1 8 10-12h-9l1-8z'],
  },

  // ── Tech ─────────────────────────────────────────────────────────────────
  {
    id: 'monitor', label: 'Monitor', category: 'Tech',
    paths: ['M2 3h20v13H2z', 'M8 21l8 0', 'M12 17v4'],
  },
  {
    id: 'smartphone', label: 'Phone Screen', category: 'Tech',
    paths: ['M5 2h14a2 2 0 012 2v16a2 2 0 01-2 2H5a2 2 0 01-2-2V4a2 2 0 012-2z', 'M12 18h.01'],
  },
  {
    id: 'tablet', label: 'Tablet', category: 'Tech',
    paths: ['M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z', 'M12 18h.01'],
  },
  {
    id: 'cpu', label: 'CPU', category: 'Tech',
    paths: [
      'M9 3H5a2 2 0 00-2 2v4m6-6h6m-6 0v18m6-18h4a2 2 0 012 2v4m-6-6v18m6-18v18m0 0h-4m4 0a2 2 0 01-2 2h-4m6-2v-4m-6 6H9m0 0H5a2 2 0 01-2-2v-4m6 6v-4m-6 4v-4m0 0h6m-6 0a2 2 0 002 2',
    ],
  },
  {
    id: 'wifi', label: 'WiFi', category: 'Tech',
    paths: ['M5 12.55a11 11 0 0114.08 0', 'M1.42 9a16 16 0 0121.16 0', 'M8.53 16.11a6 6 0 016.95 0', 'M12 20h.01'],
  },
  {
    id: 'bluetooth', label: 'Bluetooth', category: 'Tech',
    paths: ['M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11'],
  },
  {
    id: 'battery', label: 'Battery', category: 'Tech',
    paths: ['M1 6h16v12H1z', 'M23 13v-2', 'M5 10v4', 'M9 10v4', 'M13 10v4'],
  },
  {
    id: 'camera', label: 'Camera', category: 'Tech',
    paths: ['M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z', 'M12 17a4 4 0 100-8 4 4 0 000 8z'],
  },
  {
    id: 'mic', label: 'Mic', category: 'Tech',
    paths: ['M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z', 'M19 10v2a7 7 0 01-14 0v-2', 'M12 19v4', 'M8 23h8'],
  },
  {
    id: 'code', label: 'Code', category: 'Tech',
    paths: ['M16 18l6-6-6-6', 'M8 6l-6 6 6 6'],
  },
  {
    id: 'terminal', label: 'Terminal', category: 'Tech',
    paths: ['M4 17l6-6-6-6', 'M12 19h8'],
  },
  {
    id: 'database', label: 'Database', category: 'Tech',
    paths: ['M12 8c4.42 0 8-1.79 8-4s-3.58-4-8-4-8 1.79-8 4 3.58 4 8 4z', 'M4 12c0 2.21 3.58 4 8 4s8-1.79 8-4', 'M4 20c0 2.21 3.58 4 8 4s8-1.79 8-4', 'M4 4v16', 'M20 4v16'],
  },
  {
    id: 'server', label: 'Server', category: 'Tech',
    paths: ['M2 2h20v8H2z', 'M2 14h20v8H2z', 'M6 6h.01', 'M6 18h.01'],
  },
  {
    id: 'cloud-upload', label: 'Upload', category: 'Tech',
    paths: ['M16 16l-4-4-4 4', 'M12 12v9', 'M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3'],
  },
  {
    id: 'cloud-download', label: 'Download', category: 'Tech',
    paths: ['M8 17l4 4 4-4', 'M12 12v9', 'M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29'],
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export const ICON_DEFS_MAP: Record<string, IconDef> = Object.fromEntries(
  ICON_DEFS.map((d) => [d.id, d])
);

export const ICONS_BY_CATEGORY: Record<string, IconDef[]> = {};
for (const icon of ICON_DEFS) {
  (ICONS_BY_CATEGORY[icon.category] ??= []).push(icon);
}
