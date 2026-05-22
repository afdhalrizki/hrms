import { describe, it, expect, vi } from 'vitest';

// We need to directly test the routing source file.
// Since setup.ts mocks @/i18n/routing, we read the source to verify.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const routingSourcePath = resolve(__dirname, '../i18n/routing.ts');
const routingSource = readFileSync(routingSourcePath, 'utf8');

describe('Locale Configuration (routing.ts) - Source Verification', () => {
  it('should have id as default locale in source', () => {
    expect(routingSource).toContain("defaultLocale: 'id'");
  });

  it('should support English and Indonesian locales in source', () => {
    expect(routingSource).toContain("'en'");
    expect(routingSource).toContain("'id'");
    expect(routingSource).toContain("locales: ['en', 'id']");
  });

  it('should use as-needed locale prefix in source', () => {
    expect(routingSource).toContain("localePrefix: 'as-needed'");
  });

  it('should have localeDetection disabled in source', () => {
    expect(routingSource).toContain('localeDetection: false');
  });

  it('should have correct routing configuration combination', () => {
    // Verify that all three settings coexist:
    // - defaultLocale: 'id' ensures Indonesian as default
    // - localePrefix: 'as-needed' allows URL without prefix
    // - localeDetection: false disables browser language negotiation
    expect(routingSource).toContain("defaultLocale: 'id'");
    expect(routingSource).toContain("localePrefix: 'as-needed'");
    expect(routingSource).toContain('localeDetection: false');

    // This combination ensures:
    // - URL /settings -> Indonesian (id) - no browser header interference
    // - URL /en/settings -> English (en)
    // - URL /id/settings -> Indonesian (id)
  });
});

describe('Messages File Consistency', () => {
  it('should have identical top-level keys/namespaces in en.json and id.json', async () => {
    const enMessages = await import('../../messages/en.json');
    const idMessages = await import('../../messages/id.json');

    const enKeys = Object.keys(enMessages.default || enMessages).sort();
    const idKeys = Object.keys(idMessages.default || idMessages).sort();

    // Filter out any keys that might be in one but not the other
    const enOnly = enKeys.filter((k) => !idKeys.includes(k));
    const idOnly = idKeys.filter((k) => !enKeys.includes(k));

    if (enOnly.length > 0 || idOnly.length > 0) {
      console.log('Keys only in en.json:', enOnly);
      console.log('Keys only in id.json:', idOnly);
    }

    expect(enKeys).toEqual(idKeys);
  });

  it('should have non-empty Indonesian translations for Settings namespace', async () => {
    const idMessages = await import('../../messages/id.json');
    const messages = idMessages.default || idMessages;

    // Check that Settings namespace exists with proper Indonesian translations
    expect(messages.Settings).toBeDefined();
    expect(messages.Settings.title).toBe('Pengaturan Perusahaan');
    expect(messages.Settings.subtitle).toContain('Sesuaikan');
    expect(messages.Settings.save_profile).toBe('Simpan Profil');
    expect(messages.Settings.company_branding).toBe('Branding Perusahaan');
    expect(messages.Settings.contact_details).toBe('Detail Kontak');
  });

  it('should have non-empty translations for all keys in id.json', async () => {
    const idMessages = await import('../../messages/id.json');
    const messages = idMessages.default || idMessages;

    function checkEmpty(obj: Record<string, any>, path: string = '') {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          expect(
            value,
            `Translation for "${fullPath}" should not be empty`,
          ).not.toBe('');
        } else if (typeof value === 'object' && value !== null) {
          checkEmpty(value, fullPath);
        }
      }
    }

    checkEmpty(messages);
  });
});
