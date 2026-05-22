import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'id'],

  // Used when no locale matches
  defaultLocale: 'id',

  // Disable prefix for default locale if desired, but for clear multi-tenancy + multi-language,
  // keeping prefixes is often better.
  localePrefix: 'as-needed',

  // Disable automatic locale detection from browser (Accept-Language header)
  // so that URL without prefix (/settings) always uses defaultLocale (id)
  localeDetection: false,
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
