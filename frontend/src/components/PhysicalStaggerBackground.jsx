import React, { useEffect, useRef } from "react";

export default function PhysicalStaggerBackground() {
  const gridRef = useRef(null);

  useEffect(() => {
    const SIZE = 44;
    const GAP = 10;

    const cols = Math.ceil(window.innerWidth / (SIZE + GAP)) + 2;
    const rows = Math.ceil(window.innerHeight / (SIZE + GAP)) + 2;

    const grid = gridRef.current;
    if (!grid) return;
    grid.style.setProperty("--cols", cols);
    grid.style.setProperty("--rows", rows);

    const cells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const d = document.createElement("div");
        d.className = "cell";
        d.dataset.r = r;
        d.dataset.c = c;
        grid.appendChild(d);
        cells.push(d);
      }
    }

    let activeIndex = -1;

    function triggerRippleAt(row, col) {
      const idx = row * cols + col;
      if (idx === activeIndex) return;

      if (activeIndex >= 0) cells[activeIndex].classList.remove("active");
      activeIndex = idx;
      cells[activeIndex].classList.add("active");

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const d = Math.abs(r - row) + Math.abs(c - col);
          const delay = d * 26;
          const el = cells[i];
          el.style.animation = "none";
          void el.offsetHeight;
          el.style.animation = `press 520ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`;
        }
      }
    }

    function localCellFromEvent(e) {
      const rect = grid.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      const step = SIZE + GAP;
      let c = Math.round((x - SIZE / 2) / step);
      let r = Math.round((y - SIZE / 2) / step);
      c = Math.max(0, Math.min(cols - 1, c));
      r = Math.max(0, Math.min(rows - 1, r));
      return { r, c };
    }

    const onMove = (e) => {
      const { r, c } = localCellFromEvent(e);
      triggerRippleAt(r, c);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("pointerdown", onMove, { passive: false });
    window.addEventListener("touchstart", onMove, { passive: false });

    triggerRippleAt(rows - 2, cols - 1);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("touchstart", onMove);
    };
  }, []);

  return (
    <div className="physical-stagger-wrap">
      <div className="grid" ref={gridRef} aria-label="Physical Stagger Grid" />
      <style>{`
        :root {
          --rows: 10;
          --cols: 10;
          --size: 44px;
          --gap: 10px;
          --radius: 8px;
          --idle: #3e4547;
          --active: #ff1d89;
        }
        .physical-stagger-wrap {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          overflow: hidden;
        }
        .physical-stagger-wrap .grid {
          display: grid;
          grid-template-columns: repeat(var(--cols), var(--size));
          grid-auto-rows: var(--size);
          gap: var(--gap);
          padding: 24px;
          border-radius: 16px;
          background: rgba(255,255,255,0.03);
          outline: 1px solid rgba(255,255,255,0.05);
          box-shadow: 0 12px 60px rgba(0,0,0,0.35) inset;
          user-select: none;
          touch-action: none;
        }
        .cell {
          width: var(--size);
          height: var(--size);
          border-radius: var(--radius);
          background: var(--idle);
          transition: background-color 160ms linear;
          transform: translateZ(0);
        }
        .cell.active { background: var(--active); }
        @keyframes press {
          0% { transform: translateZ(0) scale(1); }
          22% { transform: translateZ(0) scale(0.9); }
          100% { transform: translateZ(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cell { animation: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}

