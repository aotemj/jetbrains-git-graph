import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDraggableDivider } from "./useDraggableDivider";

// Mock requestAnimationFrame/cancelAnimationFrame for synchronous test execution
let rafCallback: FrameRequestCallback | null = null;

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCallback = cb;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  rafCallback = null;
  vi.restoreAllMocks();
});

function flushRaf() {
  if (rafCallback) {
    rafCallback(performance.now());
    rafCallback = null;
  }
}

function createMockContainerRef(width = 800, left = 0) {
  const container = {
    getBoundingClientRect: () => ({
      width,
      left,
      top: 0,
      right: left + width,
      bottom: 600,
      height: 600,
      x: left,
      y: 0,
      toJSON() {},
    }),
  } as HTMLElement;

  return { current: container } as React.RefObject<HTMLElement>;
}

describe("useDraggableDivider", () => {
  it("should default to 40% left width", () => {
    const containerRef = createMockContainerRef();
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    expect(result.current.leftWidthPercent).toBe(40);
  });

  it("should accept a custom default percent", () => {
    const containerRef = createMockContainerRef();
    const { result } = renderHook(() =>
      useDraggableDivider(containerRef, { defaultPercent: 60 }),
    );

    expect(result.current.leftWidthPercent).toBe(60);
  });

  it("should not be dragging initially", () => {
    const containerRef = createMockContainerRef();
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    expect(result.current.isDragging).toBe(false);
  });

  it("should have col-resize cursor style in dividerProps", () => {
    const containerRef = createMockContainerRef();
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    expect(result.current.dividerProps.style.cursor).toBe("col-resize");
  });

  it("should have hit area width of 4px in dividerProps style", () => {
    const containerRef = createMockContainerRef();
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    expect(result.current.dividerProps.style.width).toBe("4px");
  });

  it("should set isDragging to true on pointer down", () => {
    const containerRef = createMockContainerRef();
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    const mockElement = {
      setPointerCapture: vi.fn(),
      addEventListener: vi.fn(),
    };

    act(() => {
      result.current.dividerProps.onPointerDown({
        preventDefault: vi.fn(),
        currentTarget: mockElement,
        pointerId: 1,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.isDragging).toBe(true);
    expect(mockElement.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("should update leftWidthPercent during drag via pointermove", () => {
    const containerRef = createMockContainerRef(800, 0);
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    const listeners: Record<string, EventListener> = {};
    const mockElement = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = listener;
      }),
      removeEventListener: vi.fn(),
    };

    // Start drag
    act(() => {
      result.current.dividerProps.onPointerDown({
        preventDefault: vi.fn(),
        currentTarget: mockElement,
        pointerId: 1,
      } as unknown as React.PointerEvent);
    });

    // Simulate pointermove at 400px (50% of 800)
    act(() => {
      listeners.pointermove?.({
        clientX: 400,
        target: mockElement,
      } as unknown as Event);
      flushRaf();
    });

    expect(result.current.leftWidthPercent).toBe(50);
  });

  it("should clamp left width to minimum 150px", () => {
    const containerRef = createMockContainerRef(800, 0);
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    const listeners: Record<string, EventListener> = {};
    const mockElement = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = listener;
      }),
      removeEventListener: vi.fn(),
    };

    act(() => {
      result.current.dividerProps.onPointerDown({
        preventDefault: vi.fn(),
        currentTarget: mockElement,
        pointerId: 1,
      } as unknown as React.PointerEvent);
    });

    // Drag far to the left (below min)
    act(() => {
      listeners.pointermove?.({
        clientX: 10,
        target: mockElement,
      } as unknown as Event);
      flushRaf();
    });

    // 150/800 = 18.75%
    expect(result.current.leftWidthPercent).toBe(18.75);
  });

  it("should clamp right width to minimum 150px", () => {
    const containerRef = createMockContainerRef(800, 0);
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    const listeners: Record<string, EventListener> = {};
    const mockElement = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = listener;
      }),
      removeEventListener: vi.fn(),
    };

    act(() => {
      result.current.dividerProps.onPointerDown({
        preventDefault: vi.fn(),
        currentTarget: mockElement,
        pointerId: 1,
      } as unknown as React.PointerEvent);
    });

    // Drag far to the right (exceeds max left)
    act(() => {
      listeners.pointermove?.({
        clientX: 750,
        target: mockElement,
      } as unknown as Event);
      flushRaf();
    });

    // maxLeft = 800 - 150 = 650, percent = 650/800 = 81.25%
    expect(result.current.leftWidthPercent).toBe(81.25);
  });

  it("should set isDragging to false on pointer up", () => {
    const containerRef = createMockContainerRef(800, 0);
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    const listeners: Record<string, EventListener> = {};
    const mockElement = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = listener;
      }),
      removeEventListener: vi.fn(),
    };

    // Start drag
    act(() => {
      result.current.dividerProps.onPointerDown({
        preventDefault: vi.fn(),
        currentTarget: mockElement,
        pointerId: 1,
      } as unknown as React.PointerEvent);
    });

    expect(result.current.isDragging).toBe(true);

    // Release
    act(() => {
      listeners.pointerup?.({
        target: mockElement,
        pointerId: 1,
      } as unknown as Event);
    });

    expect(result.current.isDragging).toBe(false);
    expect(mockElement.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it("should retain position after drag ends (session persistence)", () => {
    const containerRef = createMockContainerRef(800, 0);
    const { result } = renderHook(() => useDraggableDivider(containerRef));

    const listeners: Record<string, EventListener> = {};
    const mockElement = {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
      addEventListener: vi.fn((type: string, listener: EventListener) => {
        listeners[type] = listener;
      }),
      removeEventListener: vi.fn(),
    };

    // Start drag
    act(() => {
      result.current.dividerProps.onPointerDown({
        preventDefault: vi.fn(),
        currentTarget: mockElement,
        pointerId: 1,
      } as unknown as React.PointerEvent);
    });

    // Move to 60%
    act(() => {
      listeners.pointermove?.({
        clientX: 480,
        target: mockElement,
      } as unknown as Event);
      flushRaf();
    });

    // Release
    act(() => {
      listeners.pointerup?.({
        target: mockElement,
        pointerId: 1,
      } as unknown as Event);
    });

    // Position should persist at 60%
    expect(result.current.leftWidthPercent).toBe(60);
    expect(result.current.isDragging).toBe(false);
  });
});
