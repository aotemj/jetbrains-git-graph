import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  text: string;
  children: ReactNode;
  delay?: number;
  position?: "top" | "bottom";
}

export function Tooltip({
  text,
  children,
  delay = 300,
  position = "top",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const [actualPosition, setActualPosition] = useState(position);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
    setCoords(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Position the tooltip using fixed positioning relative to viewport
  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const gap = 4;

    let top: number;
    let actualPosition = position;

    // If position is "top" but there's not enough space above, flip to bottom
    if (position === "top" && rect.top < 30) {
      actualPosition = "bottom";
    }

    if (actualPosition === "top") {
      top = rect.top - gap;
    } else {
      top = rect.bottom + gap;
    }

    // Center horizontally on the trigger element
    const left = rect.left + rect.width / 2;

    setCoords({ top, left });
    setActualPosition(actualPosition);
  }, [visible, position]);

  // Adjust if tooltip overflows viewport
  useEffect(() => {
    if (!visible || !coords || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Check right overflow
    if (tooltipRect.right > viewportWidth - 4) {
      const overflow = tooltipRect.right - viewportWidth + 8;
      setCoords((prev) =>
        prev ? { ...prev, left: prev.left - overflow } : prev,
      );
    }

    // Check left overflow
    if (tooltipRect.left < 4) {
      const overflow = 4 - tooltipRect.left;
      setCoords((prev) =>
        prev ? { ...prev, left: prev.left + overflow } : prev,
      );
    }
  }, [visible, coords]);

  return (
    <div
      ref={containerRef}
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible &&
        coords &&
        createPortal(
          <div
            ref={tooltipRef}
            className="tooltip-popup"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform:
                actualPosition === "top"
                  ? "translate(-50%, -100%)"
                  : "translateX(-50%)",
              zIndex: 99999,
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </div>
  );
}
