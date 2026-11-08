export type WorkspaceMode = 'default' | 'focus-preview' | 'focus-timeline';

export interface WorkspaceDimensions {
  leftWidth: number;
  inspectorWidth: number;
  timelineHeight: number;
}

export const WORKSPACE_PRESETS: Record<WorkspaceMode, WorkspaceDimensions> = {
  default: {
    leftWidth: 420,
    inspectorWidth: 360,
    timelineHeight: 280
  },
  'focus-preview': {
    leftWidth: 320,
    inspectorWidth: 310,
    timelineHeight: 210
  },
  'focus-timeline': {
    leftWidth: 380,
    inspectorWidth: 340,
    timelineHeight: 400
  }
};

export const WORKSPACE_CONSTRAINTS = {
  minLeftWidth: 260,
  maxLeftWidth: 640,
  minInspectorWidth: 280,
  maxInspectorWidth: 520,
  minTimelineHeight: 180,
  maxTimelineHeightRatio: 0.55 // Up to 55% of container height
};

