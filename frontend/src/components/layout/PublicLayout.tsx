import React from 'react';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';

export const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />
      <main className="flex-grow pt-20">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
};
