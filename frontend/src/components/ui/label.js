import React from "react";

export const Label = React.forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={className} {...props} />
));

Label.displayName = "Label";
