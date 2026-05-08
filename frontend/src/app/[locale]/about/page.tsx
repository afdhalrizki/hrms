import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">About Us</h1>
        <p className="text-muted-foreground">Information about harikerja HRMS will appear here.</p>
        <a href="/" className="text-primary hover:underline">Back to Home</a>
      </div>
    </div>
  );
}
