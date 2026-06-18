"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

/** 실행·원가 테이블 액션 아이콘 버튼 */
export function ContractDetailIconBtn({
  onClick,
  icon: Icon,
  danger,
  title,
}: {
  onClick: () => void;
  icon: typeof Pencil;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800",
        danger
          ? "hover:text-rose-400"
          : title === "입금 요청"
            ? "hover:text-cyan-400"
            : "hover:text-emerald-400",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
