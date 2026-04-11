// ─── AI Command Types ─────────────────────────────────────────────────────────
// The AI returns a list of commands to apply to the whiteboard rather than a
// full replacement state, keeping token usage minimal.

export type AICommand =
  | { type: 'move_element'; id: string; x: number; y: number }
  | { type: 'update_element'; id: string; props: Record<string, unknown> }
  | { type: 'delete_element'; id: string }
  | { type: 'add_element'; element: Record<string, unknown> }
  | { type: 'group_elements'; ids: string[] }
  | { type: 'ungroup_elements'; groupId: string }
  | { type: 'add_connection'; sourceId: string; targetId: string; label?: string; color?: string }
  | { type: 'delete_connection'; id: string };

export interface AIResponse {
  thinking?: string;
  /** Whether to apply to the current page or create a new one first. */
  targetPage: 'current' | 'new';
  newPageLabel?: string;
  commands: AICommand[];
}

export interface AppSettings {
  anthropicApiKey: string;
  aiModel: string;
}
