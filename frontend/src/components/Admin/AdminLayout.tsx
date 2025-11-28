import React from 'react';
import AdminNavbar from './AdminNavbar';
import AdminFooter from './AdminFooter';

type Props = {
  children: React.ReactNode;
};

export default function AdminLayout({ children }: Props) {

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AdminNavbar />

      <main>
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
          {children}
        </div>
      </main>

      <AdminFooter />
    </div>
  );
}
