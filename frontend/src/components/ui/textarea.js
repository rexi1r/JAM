import React from "react";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={className} {...props} />
));

Textarea.displayName = "Textarea";
