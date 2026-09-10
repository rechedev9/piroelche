import * as React from "react";
import { cn } from "cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-12 w-full min-w-0 resize-y rounded-compact border-[1.5px] border-solid border-input bg-white px-3.5 py-3 text-base font-normal leading-normal aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
