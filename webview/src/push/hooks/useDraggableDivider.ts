import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { computePaneWidths, DIVIDER_DEFAULTS } from "../utils/dividerUtils";

interface UseDraggableDividerOptions {
  minLeftPx?: number;
  minRightPx?: number;
  defaultPercent?: number;
}

interface UseDraggableDividerResult {
  leftWidthPercent: number;
  isDragging: boolean;
  dividerProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    style: React.CSSProperties;
  };
}

/**
 * Hook that provides pointer-capture-based drag logic for a vertical split divider.
 *
 * Uses setPointerCapture to track the pointer even when it leaves the viewport,
 * and requestAnimationFrame for smooth visual updates during drag.
 */
export function useDraggableDivider(
  containerRef: React.RefObject<HTMLElement | null>,
  options?: UseDraggableDividerOptions,
): UseDraggableDividerResult {
  const minLeftPx = options?.minLeftPx ?? DIVIDER_DEFAULTS.minLeftPx;
  const minRightPx = options?.minRightPx ?? DIVIDER_DEFAULTS.minRightPx;
  const defaultPercent =
    options?.defaultPercent ?? DIVIDER_DEFAULTS.defaultPercent;

  const [leftWidthPercent, setLeftWidthPercent] = useState(defaultPercent);
  const [isDragging, setIsDragging] = useState(false);

  // Refs to avoid stale closures in event handlers
  const rafIdRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDraggingRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      // Cancel any pending RAF to avoid queuing multiple updates
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const containerWidth = rect.width;
        if (containerWidth <= 0) return;

        const dragX = e.clientX - rect.left;
        const { leftWidth } = computePaneWidths(
          containerWidth,
          dragX,
          minLeftPx,
          minRightPx,
        );

        const percent = (leftWidth / containerWidth) * 100;
        setLeftWidthPercent(percent);
      });
    },
    [containerRef, minLeftPx, minRightPx],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      target.releasePointerCapture(e.pointerId);

      isDraggingRef.current = false;
      setIsDragging(false);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      target.removeEventListener(
        "pointermove",
        handlePointerMove as EventListener,
      );
      target.removeEventListener("pointerup", handlePointerUp as EventListener);
    },
    [handlePointerMove],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();

      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      isDraggingRef.current = true;
      setIsDragging(true);

      target.addEventListener(
        "pointermove",
        handlePointerMove as EventListener,
      );
      target.addEventListener("pointerup", handlePointerUp as EventListener);
    },
    [handlePointerMove, handlePointerUp],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const dividerProps = {
    onPointerDown,
    style: {
      cursor: "col-resize" as const,
      width: `${DIVIDER_DEFAULTS.hitAreaPx}px`,
      userSelect: "none" as const,
      touchAction: "none" as const,
    },
  };

  return {
    leftWidthPercent,
    isDragging,
    dividerProps,
  };
}
