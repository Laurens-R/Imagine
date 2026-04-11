import { useWhiteboardStore } from '../store/whiteboardStore';
import type { AIResponse, AICommand } from '../types/aiCommands';
import type { WhiteboardElement } from '../types';

/** Translate an add_element command's x/y (and arrow x2/y2) by the given offset. */
function offsetAddElement(cmd: Extract<AICommand, { type: 'add_element' }>, ox: number, oy: number): Extract<AICommand, { type: 'add_element' }> {
  const el = { ...cmd.element } as Record<string, unknown>;
  el.x = (el.x as number) + ox;
  el.y = (el.y as number) + oy;
  if (typeof el.x2 === 'number') el.x2 = (el.x2 as number) + ox;
  if (typeof el.y2 === 'number') el.y2 = (el.y2 as number) + oy;
  return { ...cmd, element: el };
}

/**
 * Executes the command list returned by the AI against the current store state.
 * @param viewportCentre  When provided, add_element coordinates (which Claude
 *   generates relative to (0,0)) are translated to be centred on this point.
 */
export function executeAIResponse(response: AIResponse, viewportCentre?: { x: number; y: number }): void {
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

  const ox = viewportCentre?.x ?? 0;
  const oy = viewportCentre?.y ?? 0;

  for (let cmd of response.commands) {
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
        if (viewportCentre) cmd = offsetAddElement(cmd, ox, oy);
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
