import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1 },
};

function getCenter(el) {
  const { x, y, width, height } = el.getBoundingClientRect();
  return { x: x + width / 2, y: y + height / 2 };
}

export default function StaggeredGrid({
  cols = 10,
  rows = 10,
  size = 400,
  baseDelay = 0.0015,
  noise = 0.1,
}) {
  const ref = useRef(null);
  const [origin, setOrigin] = useState(null);
  const [delays, setDelays] = useState([]);

  const total = cols * rows;

  useEffect(() => {
    const index = Math.floor(Math.random() * total);
    const cells = ref.current?.querySelectorAll(".cell");
    if (!cells) return;
    const originPos = getCenter(cells[index]);
    const ds = [];
    for (let i = 0; i < total; i++) {
      const pos = getCenter(cells[i]);
      const dist = Math.sqrt(
        (pos.x - originPos.x) ** 2 + (pos.y - originPos.y) ** 2
      );
      ds.push(dist * baseDelay + Math.random() * noise);
    }
    setDelays(ds);
    setOrigin(index);
  }, [baseDelay, noise, total]);

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10">
      <motion.div
        ref={ref}
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          width: size,
          height: size,
        }}
        initial="hidden"
        animate={origin !== null ? "visible" : "hidden"}
      >
        {Array.from({ length: total }).map((_, i) => (
          <motion.div
            key={i}
            className={`cell ${i === origin ? "origin" : ""}`}
            variants={variants}
            transition={{
              type: "spring",
              stiffness: 600,
              damping: 20,
              delay: i === origin ? 0 : delays[i],
            }}
          />
        ))}
      </motion.div>
      <style>{`
        .cell {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          width: 100%;
          height: 100%;
        }
        .origin {
          background-color: var(--hue-1, #3b82f6);
        }
      `}</style>
    </div>
  );
}
