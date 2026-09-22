const { classifyLicense, readLicenseField } = require('../commands/licenses');

describe('licenses', () => {
  describe('classifyLicense', () => {
    test.each([
      ['MIT', 'permissive'],
      ['ISC', 'permissive'],
      ['Apache-2.0', 'permissive'],
      ['BSD-3-Clause', 'permissive'],
      ['LGPL-3.0', 'weak'],
      ['MPL-2.0', 'weak'],
      ['GPL-3.0', 'strong'],
      ['AGPL-3.0', 'strong'],
      ['SSPL-1.0', 'strong'],
      ['UNLICENSED', 'proprietary'],
      ['SEE LICENSE IN LICENSE.md', 'proprietary'],
      ['', 'unknown'],
      ['Something-Weird-1.0', 'unknown']
    ])('classe %s comme %s', (license, expected) => {
      expect(classifyLicense(license)).toBe(expected);
    });

    test('retient l\'option la plus permissive d\'une expression OR', () => {
      expect(classifyLicense('(MIT OR GPL-3.0)')).toBe('permissive');
      expect(classifyLicense('(GPL-3.0 OR LGPL-3.0)')).toBe('weak');
    });

    test.each([[null], [undefined]])('gère %p', (value) => {
      expect(classifyLicense(value)).toBe('unknown');
    });
  });

  describe('readLicenseField', () => {
    test('lit la forme chaîne', () => {
      expect(readLicenseField({ license: 'MIT' })).toBe('MIT');
    });

    test('lit la forme objet historique', () => {
      expect(readLicenseField({ license: { type: 'Apache-2.0' } })).toBe('Apache-2.0');
    });

    test('lit le tableau licenses hérité', () => {
      expect(readLicenseField({ licenses: [{ type: 'MIT' }, { type: 'GPL-2.0' }] })).toBe('MIT OR GPL-2.0');
    });

    test('retourne une chaîne vide si absent', () => {
      expect(readLicenseField({})).toBe('');
    });
  });
});
