import React from "react";

export function Card({ className, ...props }) {
  return <div className={className} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div className={className} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={className} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={className} {...props} />;
}
