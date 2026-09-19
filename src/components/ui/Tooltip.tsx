"use client";

import React, { useState, useRef } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, position = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 400);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-2 py-1 text-[11px] font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none animate-[fadeIn_150ms_ease-out] ${positionClasses[position]}`}
        >
          {content}
          <div className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45 ${
            position === "top" ? "top-full -mt-1 left-1/2 -translate-x-1/2" :
            position === "bottom" ? "bottom-full -mb-1 left-1/2 -translate-x-1/2" :
            position === "left" ? "left-full -ml-1 top-1/2 -translate-y-1/2" :
            "right-full -mr-1 top-1/2 -translate-y-1/2"
          }`} />
        </div>
      )}
    </div>
  );
}
