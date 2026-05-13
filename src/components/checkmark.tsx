"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export function Checkmark({ show }: { show: boolean }) {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    if (show) {
      setScale(1);
      const timer = setTimeout(() => setScale(0), 800);
      return () => clearTimeout(timer);
    }
  }, [show]);

  return (
    <span
      className="inline-flex items-center justify-center text-green-400"
      style={{
        transform: `scale(${scale})`,
        transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Check size={16} />
    </span>
  );
}
