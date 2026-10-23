import * as React from "react";
import { cn } from "cn";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("grid gap-1.5 text-[13px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Label };
