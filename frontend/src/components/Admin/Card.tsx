import React from 'react';

type Props = {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function Card({ title, children, className = '' }: Props) {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-4 ${className}`}>
      {title && <div className="mb-3 text-lg font-semibold text-violet-900">{title}</div>}
      <div>{children}</div>
    </div>
  );
}
