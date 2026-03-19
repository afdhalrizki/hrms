'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname, routing } from '@/i18n/routing';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLanguage = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as any });
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => toggleLanguage(loc)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
            locale === loc 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
