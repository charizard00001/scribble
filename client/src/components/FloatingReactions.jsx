import { useEffect, useState, useRef } from 'react';

export default function FloatingReactions({ reactions }) {
  const [visible, setVisible] = useState([]);
  const nextIdRef = useRef(0);
  const processedRef = useRef(0);

  useEffect(() => {
    // Process only reactions added since last render
    const newItems = reactions.slice(processedRef.current);
    processedRef.current = reactions.length;

    for (const r of newItems) {
      const id = nextIdRef.current++;
      const entry = { ...r, _id: id };

      setVisible((prev) => [...prev.slice(-40), entry]);

      setTimeout(() => {
        setVisible((prev) => prev.filter((v) => v._id !== id));
      }, 2200);
    }
  }, [reactions]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {visible.map((r) => (
        <span
          key={r._id}
          className="absolute bottom-4 animate-float-up text-2xl select-none"
          style={{ left: `${r.left}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
