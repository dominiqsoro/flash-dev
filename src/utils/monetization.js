const pc = require('picocolors');
const { getMonetizationPrefs, setMonetizationPrefs } = require('./config');

/**
 * Local-only monetization defaults.
 * No network, no telemetry, no project data access.
 */
const monetizationConfig = {
  enabled: true,
  sponsorProbability: 0.10,
  partnerProbability: 0.05,
  cooldownMinutes: 30
};

const SUPPORT_MESSAGES = [
  'Give the project a star on GitHub: https://github.com/dominiqsoro/flash-dev',
  'Support development on Buy Me a Coffee: https://www.buymeacoffee.com/dominiqsoro',
  'Flash-dev is free — sponsor the project on GitHub: https://github.com/sponsors/dominiqsoro'
];

const PARTNER_MESSAGES = [
  'Hostinger — hosting for developers · Code: 1BY1403 · May generate a commission for Flash-dev'
];

function isCoolingDown(prefs) {
  if (!prefs.lastShownAt) return false;
  const elapsedMs = Date.now() - Number(prefs.lastShownAt);
  return elapsedMs < monetizationConfig.cooldownMinutes * 60 * 1000;
}

function pickMessage(messages) {
  return messages[Math.floor(Math.random() * messages.length)];
}

function printSupportMessage(message) {
  console.log(pc.gray('💙 Support Flash-dev'));
  console.log(pc.gray(`   ${message}`));
}

function printPartnerMessage(message) {
  console.log(pc.gray('📢 Sponsorisé'));
  console.log(pc.gray(`   ${message}`));
}

/**
 * Optionally display a local monetization message after a successful command.
 * @returns {'support'|'partner'|null}
 */
function displayMonetizationMessage() {
  const prefs = getMonetizationPrefs();

  if (!prefs.enabled || !monetizationConfig.enabled) {
    return null;
  }

  if (isCoolingDown(prefs)) {
    return null;
  }

  const supportEnabled = prefs.supportMessages !== false;
  const adsEnabled = prefs.partnerAds !== false;

  const random = Math.random();
  const sponsorMax = monetizationConfig.sponsorProbability;
  const partnerMax = sponsorMax + monetizationConfig.partnerProbability;

  let kind = null;

  if (supportEnabled && random < sponsorMax) {
    kind = 'support';
    console.log('');
    printSupportMessage(pickMessage(SUPPORT_MESSAGES));
  } else if (adsEnabled && random >= sponsorMax && random < partnerMax) {
    kind = 'partner';
    console.log('');
    printPartnerMessage(pickMessage(PARTNER_MESSAGES));
  }

  if (kind) {
    setMonetizationPrefs({ lastShownAt: Date.now() });
  }

  return kind;
}

/** @deprecated Use displayMonetizationMessage */
function displayEthicalMonetization() {
  return displayMonetizationMessage();
}

module.exports = {
  monetizationConfig,
  displayMonetizationMessage,
  displayEthicalMonetization,
  SUPPORT_MESSAGES,
  PARTNER_MESSAGES
};
