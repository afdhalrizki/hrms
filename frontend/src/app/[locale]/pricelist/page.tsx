import React from 'react';
import { useTranslations } from 'next-intl';

export default function PriceListPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Price List</h1>
        <p className="text-muted-foreground">Detailed pricing plans for harikerja HRMS will appear here.</p>
        <a href="/" className="text-primary hover:underline">Back to Home</a>
      </div>
    </div>
  );
}
