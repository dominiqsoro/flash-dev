const { parseEnv } = require('../utils/dotenv');

describe('utils/dotenv', () => {
  test('lit une paire simple', () => {
    expect(parseEnv('DB_HOST=localhost')).toEqual({ DB_HOST: 'localhost' });
  });

  test('gère les guillemets doubles et simples', () => {
    expect(parseEnv('A="valeur"\nB=\'autre\'')).toEqual({ A: 'valeur', B: 'autre' });
  });

  test('préserve les caractères spéciaux d\'un mot de passe', () => {
    expect(parseEnv('DB_PASSWORD="p@ss w0rd#!$"')).toEqual({ DB_PASSWORD: 'p@ss w0rd#!$' });
  });

  test('ignore les commentaires et les lignes vides', () => {
    expect(parseEnv('# commentaire\n\nA=1\n')).toEqual({ A: 1 .toString() });
  });

  test('retire un commentaire en fin de ligne non quotée', () => {
    expect(parseEnv('PORT=3000 # le port')).toEqual({ PORT: '3000' });
  });

  test('ne retire pas un # à l\'intérieur de guillemets', () => {
    expect(parseEnv('KEY="abc#def"')).toEqual({ KEY: 'abc#def' });
  });

  test('gère le préfixe export', () => {
    expect(parseEnv('export API_URL=https://x.test')).toEqual({ API_URL: 'https://x.test' });
  });

  test('conserve les = dans la valeur', () => {
    expect(parseEnv('TOKEN=abc=def=ghi')).toEqual({ TOKEN: 'abc=def=ghi' });
  });

  test('interprète \\n dans une valeur entre guillemets doubles', () => {
    expect(parseEnv('KEY="ligne1\\nligne2"').KEY).toBe('ligne1\nligne2');
  });

  test('ignore une clé invalide', () => {
    expect(parseEnv('123=x\nbad key=y\nOK=z')).toEqual({ OK: 'z' });
  });

  test.each([[''], [null], [undefined]])('gère une entrée vide (%p)', (input) => {
    expect(parseEnv(input)).toEqual({});
  });
});
