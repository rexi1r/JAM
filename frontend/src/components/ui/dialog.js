import React from "react";

export function Dialog({ children }) {
  return <div>{children}</div>;
}

export function DialogTrigger({ children, ...props }) {
  return <div {...props}>{children}</div>;
}

export function DialogContent({ className, ...props }) {
  return <div className={className} {...props} />;
}

export function DialogHeader({ className, ...props }) {
  return <div className={className} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h3 className={className} {...props} />;
}
