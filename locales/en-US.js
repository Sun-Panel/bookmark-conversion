/**
 * English translation file
 * Format: { "KEY": "value" }
 */

export default {
  // App basic information
  APP_NAME: 'Bookmark Converter',
  APP_DESCRIPTION: 'Convert browser HTML bookmark files to Sun-Panel v2 importable config files',
  NETWORK_DESCRIPTION: 'Network required for favicon fetching (parses real page icons via the host proxy; remote icon URLs near 100% hit rate, local embedding is best-effort)',

  // Widget
  WIDGET_BM_NAME: 'Bookmark Converter',
  WIDGET_BM_DESCRIPTION: 'Convert browser HTML bookmarks to Sun-Panel config files, click to open',

  // Page title
  BM_TITLE: 'Bookmark Converter',
  BM_SUBTITLE: 'Convert browser HTML bookmark files to Sun-Panel v2 importable config files (config.json + icon folder)',

  // Buttons
  BM_BUTTON_IMPORT: '1. Import HTML Bookmarks',
  BM_BUTTON_CONVERT: '2. Start Conversion',
  BM_BUTTON_EXPORT: '3. Export Config File',
  BM_CONVERTING: 'Converting...',
  BM_EXPORTING: 'Exporting...',
  BM_CONFIRM_EXPORT: 'Confirm Export',
  BM_CANCEL: 'Cancel',
  BM_NO_FILE_SELECTED: 'No file selected',
  BM_DEDUPE: 'Deduplicate',
  BM_DEDUPE_TIP: 'Remove links with identical URL and title (keep the first)',

  // Messages
  BM_NO_FILE: 'Please import an HTML bookmark file first',
  BM_IMPORT_ERROR: 'Failed to read file, please retry',
  BM_PARSE_EMPTY: 'No valid bookmarks found. Please check the file format (Netscape bookmark HTML)',
  BM_PARSE_ERROR: 'Failed to parse bookmark file',
  BM_EXPORT_NONE: 'Please select links to export first',
  BM_EXPORT_SUCCESS: 'Export successful! Generated config for {count} links',
  BM_EXPORT_ERROR: 'Export failed, please retry',
  BM_DEDUPE_DONE: 'Removed {count} duplicate links',
  BM_DEDUPE_NONE: 'No duplicate links found',

  // Stats
  BM_STAT_GROUPS: 'Groups',
  BM_STAT_LINKS: 'Links',
  BM_STAT_CHECKED: 'Selected',
  BM_STAT_ICONS: 'Icons',
  BM_FAVICON_DOWNLOADING: 'Downloading favicons',
  BM_FAVICON_SUCCESS: 'OK',

  // Tree actions
  BM_SELECT_ALL: 'Select All',
  BM_CLEAR_ALL: 'Clear All',
  BM_TREE_EMPTY: 'No links to display',
  BM_TREE_HINT: 'After import and conversion, the checkable bookmark tree will be shown here',

  // Preview tabs
  BM_TAB_PLANS: 'Plan Preview',
  BM_TAB_TREE: 'Original Tree',
  BM_FOLDER_EMPTY: 'Empty',
  BM_PREVIEW_MORE: '{count} more links',

  // Export dialog
  BM_EXPORT_TITLE: 'Choose Grouping Plan',
  BM_PLAN_A_TITLE: 'Plan A: Top-level Groups',
  BM_PLAN_A_DESC: 'Only top-level folders become groups; all nested links are flattened into their top-level group (fewer groups, larger each)',
  BM_PLAN_B_TITLE: 'Plan B: All Folder Groups',
  BM_PLAN_B_DESC: 'Every folder at any level becomes a group; links belong to their direct parent folder (more groups, smaller each)',

  BM_FOOTER_HINT: 'Tip: Icons are fetched automatically (base64 icons 100%; others are parsed via the host network proxy — remote icon URLs are primary with near 100% hit rate, local embedding is best-effort; only very few fall back to text icons). The exported file can be imported directly into Sun-Panel',
};
