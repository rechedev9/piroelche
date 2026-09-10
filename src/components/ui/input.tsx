import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-compact border-[1.5px] border-solid border-input bg-white px-3.5 py-3 text-base font-normal leading-normal disabled:bg-soft aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
