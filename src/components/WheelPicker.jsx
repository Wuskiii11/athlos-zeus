import React, { useRef, useEffect, useCallback } from "react";

// iOS-style vertical spinner column — native momentum scroll + CSS scroll-snap
// gives the real "sliding" feel; the centered item is highlighted, others fade
// toward the edges. Used by the date-of-birth picker and the height/weight step.
const ITEM_H = 40;
const PAD = 2; // rows above/below center → 5-row visible window

export default function WheelColumn({ items, value, onChange, render, width = 64, C }) {
  const ref = useRef(null);
  const settleTimer = useRef(null);
  const idx = Math.max(0, items.indexOf(value));

  const scrollToIdx = useCallback((i, smooth = true) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: i * ITEM_H, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToIdx(idx, false); }, []); // snap to initial value on mount, no animation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { scrollToIdx(idx); }, [value]); // follow external/controlled changes (e.g. day clamped by month)

  const onScroll = () => {
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.round(el.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(items.length - 1, i));
      scrollToIdx(clamped);
      if (items[clamped] !== value) onChange(items[clamped]);
    }, 90);
  };

  const visibleH = ITEM_H * (PAD * 2 + 1);

  return (
    <div style={{ position: "relative", height: visibleH, width, flexShrink: 0 }}>
      {/* center selection band — engraved bronze rules */}
      <div style={{
        position: "absolute", top: ITEM_H * PAD, left: 0, right: 0, height: ITEM_H,
        borderTop: `1px solid ${C.gold}77`, borderBottom: `1px solid ${C.gold}77`,
        pointerEvents: "none", zIndex: 2,
      }} />
      <div
        ref={ref}
        onScroll={onScroll}
        className="athlos-wheel-scroll"
        style={{
          height: "100%", overflowY: "scroll", scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none",
        }}
      >
        <style>{`.athlos-wheel-scroll::-webkit-scrollbar{display:none}`}</style>
        <div style={{ height: ITEM_H * PAD }} />
        {items.map((it, i) => {
          const active = it === value;
          return (
            <div
              key={i}
              onClick={() => { scrollToIdx(i); onChange(it); }}
              style={{
                height: ITEM_H, scrollSnapAlign: "center",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: C.heading, fontWeight: active ? 800 : 400,
                fontSize: active ? 19 : 15,
                color: active ? C.text : C.muted,
                opacity: active ? 1 : 0.5,
                transition: "font-size 0.15s, color 0.15s, opacity 0.15s, font-weight 0.15s",
                cursor: "pointer", userSelect: "none", WebkitUserSelect: "none",
              }}
            >
              {render ? render(it) : it}
            </div>
          );
        })}
        <div style={{ height: ITEM_H * PAD }} />
      </div>
      {/* top/bottom fade — matches the sheet/screen background it sits on */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: ITEM_H * PAD, background: `linear-gradient(to bottom, ${C.bg}, transparent)`, pointerEvents: "none", zIndex: 3 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: ITEM_H * PAD, background: `linear-gradient(to top, ${C.bg}, transparent)`, pointerEvents: "none", zIndex: 3 }} />
    </div>
  );
}
