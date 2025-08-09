import React from "react";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input ref={ref} className={className} {...props} />
));

Input.displayName = "Input";
