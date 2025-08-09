import React from "react";

export const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} type="checkbox" className={className} {...props} />
));

Checkbox.displayName = "Checkbox";
