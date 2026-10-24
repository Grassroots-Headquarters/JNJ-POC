import * as React from "react";
import { cn } from "cn";

/** Demo `.note` (amber) and `.toast` (green) feedback blocks. */
function Alert({
  className,
  tone = "warning",
  ...props
}: React.ComponentProps<"div"> & { tone?: "warning" | "success" }) {
  return (
    <div
      role={tone === "warning" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-3 py-2.5 text-[13px]",
        tone === "warning" && "border-[#F59E0B]/45 bg-[#F59E0B]/12 text-foreground",
        tone === "success" && "border-[#10B981]/45 bg-[#10B981]/14 text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Alert };
