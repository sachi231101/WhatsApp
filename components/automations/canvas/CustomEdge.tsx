'use client';

import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { WorkflowEdge } from './workflowTypes';

export const BranchingEdge = memo((props: EdgeProps<WorkflowEdge>) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    sourceHandleId,
    selected,
  } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine branch status
  const rawBranch =
    data?.conditionKey ||
    (sourceHandleId?.toLowerCase() === 'yes'
      ? 'YES'
      : sourceHandleId?.toLowerCase() === 'no'
      ? 'NO'
      : null);

  const isYes = rawBranch?.toUpperCase() === 'YES';
  const isNo = rawBranch?.toUpperCase() === 'NO';

  const strokeColor = isYes
    ? '#10b981' // emerald-500
    : isNo
    ? '#f43f5e' // rose-500
    : selected
    ? '#059669' // emerald-600
    : '#94a3b8'; // slate-400

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 2,
          stroke: strokeColor,
          transition: 'stroke 150ms, stroke-width 150ms',
        }}
      />

      {/* Render branch badge pill if this is a condition branch */}
      {(isYes || isNo) && (
        <EdgeLabelRenderer>
          <div
            data-testid={`branch-label-${id}`}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider shadow-2xs border uppercase select-none ${
                isYes
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              {isYes ? 'YES' : 'NO'}
            </span>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

BranchingEdge.displayName = 'BranchingEdge';

export const WORKFLOW_EDGE_TYPES = {
  branchingEdge: BranchingEdge,
};
