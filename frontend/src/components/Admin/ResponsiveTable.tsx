import React from 'react';

type Props = {
  children: React.ReactNode;
  /** Optional mobile view rendering — if provided, this will be shown instead of the table on small screens */
  mobileView?: React.ReactNode;
  className?: string;
};

export default function ResponsiveTable({ children, mobileView, className = '' }: Props) {
  return (
    <div className={`w-full ${className}`}>
      {/* Table visible on md+; small screens get a horizontally-scrollable table only if mobileView is not provided */}
      <div className="hidden md:block overflow-x-auto">{children}</div>

      {/* Mobile view: if provided, show on small screens instead of the table */}
      {mobileView ? (
        <div className="block md:hidden">{mobileView}</div>
      ) : (
        /* Fallback: show the scrollable table on small screens when no mobileView supplied */
        <div className="block md:hidden overflow-x-auto">{children}</div>
      )}
    </div>
  );
}
