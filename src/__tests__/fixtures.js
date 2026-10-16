/**
 * Fake credentials for the detection tests.
 *
 * They are assembled at runtime rather than written literally: a structurally
 * valid token committed verbatim trips GitHub push protection and every other
 * repository scanner, even when the value is meaningless. Assembling keeps the
 * fixtures realistic for the detector without planting scanner bait in the
 * source tree.
 */

const FAKE = {
  awsKeyId: ['AK', 'IA', '4TESTQZ7K2LMNP3R'].join(''),
  awsDocSample: ['AK', 'IA', 'IOSFODNN7EXAMPLE'].join(''),
  stripeKey: ['sk', '_live_', '51H8xQqLkd93hsjdALKJ2h4kjh2'].join(''),
  githubToken: ['ghp', '_', '16CharsMinimumTokenValue123456789012'].join(''),
  googleKey: ['AIza', 'SyD-1234567890abcdefghijklmnopqrstu'].join(''),
  pemHeader: ['-----BEGIN ', 'RSA PRIVATE KEY', '-----'].join(''),
  dbUrl: ['postgres://admin:', 'Sup3rS3cret', '@db.internal:5432/app'].join(''),
  genericKey: 'a8Fk29ZqLm03XbVn71Rt',
  buildHash: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij1234'
};

module.exports = { FAKE };
