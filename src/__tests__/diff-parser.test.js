const { FAKE } = require('./fixtures');
const { parseAddedLines, parseChangedFiles } = require('../core/diff-parser');

const DIFF = `diff --git a/src/app.js b/src/app.js
index 1111111..2222222 100644
--- a/src/app.js
+++ b/src/app.js
@@ -1,4 +1,6 @@
 const a = 1;
+const added1 = 2;
 const b = 3;
-const removed = 4;
+const added2 = 5;
 const c = 6;
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -10,2 +10,3 @@
 intro
+new doc line
 outro
`;

describe('diff-parser', () => {
  test('ne retourne que les lignes ajoutées', () => {
    const added = parseAddedLines(DIFF);
    expect(added.map((entry) => entry.content)).toEqual([
      'const added1 = 2;',
      'const added2 = 5;',
      'new doc line'
    ]);
  });

  // Regression: secure reported offsets inside the diff instead of file lines
  test('calcule le vrai numéro de ligne dans le nouveau fichier', () => {
    const added = parseAddedLines(DIFF);
    expect(added[0]).toMatchObject({ file: 'src/app.js', line: 2 });
    expect(added[1]).toMatchObject({ file: 'src/app.js', line: 4 });
    expect(added[2]).toMatchObject({ file: 'README.md', line: 11 });
  });

  // Regression: deleting a leaked secret used to be blocked as a new leak
  test('ignore totalement les lignes supprimées', () => {
    const deletion = `--- a/leak.js
+++ b/leak.js
@@ -1,1 +0,0 @@
-const k = "${FAKE.awsKeyId}";
`;
    expect(parseAddedLines(deletion)).toHaveLength(0);
  });

  test('ignore un fichier supprimé (/dev/null)', () => {
    const removal = `diff --git a/gone.js b/gone.js
--- a/gone.js
+++ /dev/null
@@ -1,1 +0,0 @@
-const x = 1;
`;
    expect(parseAddedLines(removal)).toHaveLength(0);
  });

  test('liste les fichiers modifiés', () => {
    expect(parseChangedFiles(DIFF)).toEqual(['src/app.js', 'README.md']);
  });

  test.each([[''], [null], [undefined]])('gère une entrée vide (%p)', (input) => {
    expect(parseAddedLines(input)).toEqual([]);
    expect(parseChangedFiles(input)).toEqual([]);
  });
});
