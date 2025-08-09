import React from "react";

export const Button = React.forwardRef(({ className, ...props }, ref) => (
  <button ref={ref} className={className} {...props} />
));

Button.displayName = "Button";
