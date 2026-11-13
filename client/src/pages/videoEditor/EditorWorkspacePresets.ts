export type WorkspaceMode = 'default' | 'focus-preview' | 'focus-timeline';

export interface WorkspaceDimensions {
  leftWidth: number;
  inspectorWidth: number;
  timelineHeight: number;
}

export const WORKSPACE_PRESETS: Record<WorkspaceMode, WorkspaceDimensions> = {
  default: {
    leftWidth: 380,
    inspectorWidth: 340,
    timelineHeight: 260
  },
  'focus-preview': {
    leftWidth: 320,
    inspectorWidth: 300,
    timelineHeight: 200
  },
  'focus-timeline': {
    leftWidth: 360,
    inspectorWidth: 320,
    timelineHeight: 380
  }
};

export const WORKSPACE_CONSTRAINTS = {
  minLeftWidth: 320,
  maxLeftWidth: 560,
  minInspectorWidth: 280,
  maxInspectorWidth: 500,
  minTimelineHeight: 180,
  maxTimelineHeightRatio: 0.55 // Up to 55% of container height
};

export function clampLeftWidth(w: number | undefined | null): number {
  if (typeof w !== 'number' || isNaN(w) || w <= 0) {
    return WORKSPACE_PRESETS.default.leftWidth;
  }
  return Math.max(WORKSPACE_CONSTRAINTS.minLeftWidth, Math.min(WORKSPACE_CONSTRAINTS.maxLeftWidth, w));
}

export function clampInspectorWidth(w: number | undefined | null): number {
  if (typeof w !== 'number' || isNaN(w) || w <= 0) {
    return WORKSPACE_PRESETS.default.inspectorWidth;
  }
  return Math.max(WORKSPACE_CONSTRAINTS.minInspectorWidth, Math.min(WORKSPACE_CONSTRAINTS.maxInspectorWidth, w));
}

export function clampTimelineHeight(h: number | undefined | null): number {
  if (typeof h !== 'number' || isNaN(h) || h <= 0) {
    return WORKSPACE_PRESETS.default.timelineHeight;
  }
  const maxH = typeof window !== 'undefined' ? window.innerHeight * WORKSPACE_CONSTRAINTS.maxTimelineHeightRatio : 480;
  return Math.max(WORKSPACE_CONSTRAINTS.minTimelineHeight, Math.min(maxH, h));
}
