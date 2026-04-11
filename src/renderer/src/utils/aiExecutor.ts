import { useWhiteboardStore } from '../store/whiteboardStore';
import type { AIResponse } from '../types/aiCommands';
import type { WhiteboardElement } from '../types';

/**
 * Executes the command list returned by the AI against the current store state.
 * All coordinates are absolute canvas coordinates — no translation is applied.
 */
export function executeAIResponse(response: AIResponse): void {
  const store = useWhiteboardStore.getState();

  // Optionally create a new page before applying commands
  if (response.targetPage === 'new') {
    store.addPage();
    if (response.newPageLabel) {
      const newIdx = useWhiteboardStore.getState().currentPageIndex;
      store.renamePage(newIdx, response.newPageLabel);
    }
  }

  // Single undo snapshot so the whole AI operation is one undo step
  store.snapshot();

  for (const cmd of response.commands) {
    const s = useWhiteboardStore.getState();
    switch (cmd.type) {
      case 'move_element':
        s.updateElement(cmd.id, { x: cmd.x, y: cmd.y });
        break;
      case 'update_element':
        s.updateElement(cmd.id, cmd.props as Partial<WhiteboardElement>);
        break;
      case 'delete_element':
        s.removeElement(cmd.id);
        break;
      case 'add_element':
        s.addElement(cmd.element as Omit<WhiteboardElement, 'id' | 'zIndex'>);
        break;
      case 'group_elements':
        s.setSelectedIds(cmd.ids);
        s.groupSelected();
        break;
      case 'ungroup_elements':
        s.setSelectedIds([cmd.groupId]);
        s.ungroupSelected();
        break;
      case 'add_connection':
        s.addConnection(cmd.sourceId, cmd.targetId, cmd.color, cmd.label);
        break;
      case 'delete_connection':
        s.removeConnection(cmd.id);
        break;
    }
  }
}
