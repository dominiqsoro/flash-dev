const pc = require('picocolors');
const prompts = require('prompts');
const {
  getMonetizationPrefs,
  setMonetizationPrefs
} = require('../utils/config');
const { monetizationConfig } = require('../utils/monetization');

function statusLabel(enabled) {
  return enabled ? pc.green('ON') : pc.yellow('OFF');
}

function printMonetizationStatus() {
  const prefs = getMonetizationPrefs();

  console.log(pc.cyan('\nFlash-dev Monetization\n'));
  console.log(`Status:                 ${statusLabel(prefs.enabled)}`);
  console.log(`Project support messages:${' '} ${statusLabel(prefs.supportMessages !== false)}`);
  console.log(`Sponsored ads:          ${statusLabel(prefs.partnerAds !== false)}`);
  console.log(`Frequency cap:          ${monetizationConfig.cooldownMinutes} min`);
  console.log(`Odds (when enabled):    ~${Math.round(monetizationConfig.sponsorProbability * 100)}% support · ~${Math.round(monetizationConfig.partnerProbability * 100)}% partner`);
  console.log(pc.gray('\nLocal-only · no telemetry · no network · no project data\n'));
}

async function interactiveMonetizationMenu() {
  printMonetizationStatus();

  const { action } = await prompts({
    type: 'select',
    name: 'action',
    message: 'Choose an option',
    choices: [
      { title: 'Disable all monetization messages', value: 'off' },
      { title: 'Enable all monetization messages', value: 'on' },
      { title: 'Disable sponsored ads only', value: 'ads-off' },
      { title: 'Enable sponsored ads only', value: 'ads-on' },
      { title: 'Disable project support messages', value: 'support-off' },
      { title: 'Enable project support messages', value: 'support-on' },
      { title: 'Cancel', value: 'cancel' }
    ]
  });

  if (!action || action === 'cancel') {
    console.log(pc.yellow('Cancelled.\n'));
    return;
  }

  applyMonetizationAction(action);
}

function applyMonetizationAction(action) {
  switch (action) {
    case 'off':
      setMonetizationPrefs({ enabled: false });
      console.log(pc.green('\nMonetization disabled.\n'));
      break;
    case 'on':
      setMonetizationPrefs({ enabled: true, supportMessages: true, partnerAds: true });
      console.log(pc.green('\nMonetization enabled.\n'));
      break;
    case 'ads-off':
      setMonetizationPrefs({ partnerAds: false });
      console.log(pc.green('\nSponsored ads disabled.\n'));
      break;
    case 'ads-on':
      setMonetizationPrefs({ enabled: true, partnerAds: true });
      console.log(pc.green('\nSponsored ads enabled.\n'));
      break;
    case 'support-off':
      setMonetizationPrefs({ supportMessages: false });
      console.log(pc.green('\nProject support messages disabled.\n'));
      break;
    case 'support-on':
      setMonetizationPrefs({ enabled: true, supportMessages: true });
      console.log(pc.green('\nProject support messages enabled.\n'));
      break;
    default:
      console.log(pc.yellow(`Unknown action: ${action}\n`));
  }
}

function printConfigHelp() {
  console.log(pc.cyan('\nflash-dev config\n'));
  console.log('Usage:');
  console.log(pc.white('  flash-dev config monetization'));
  console.log(pc.white('  flash-dev config monetization menu'));
  console.log(pc.white('  flash-dev config monetization on|off'));
  console.log(pc.white('  flash-dev config monetization ads on|off'));
  console.log(pc.white('  flash-dev config monetization support on|off'));
  console.log('');
}

/**
 * flash-dev config [section] [action] [value]
 */
async function configCommand(section, action, value) {
  try {
    if (!section) {
      printConfigHelp();
      printMonetizationStatus();
      return;
    }

    if (section !== 'monetization' && section !== 'ads') {
      console.log(pc.red(`\nUnknown config section: ${section}\n`));
      printConfigHelp();
      process.exitCode = 1;
      return;
    }

    // Alias: flash-dev config ads off
    if (section === 'ads') {
      if (!action || !['on', 'off'].includes(action)) {
        printMonetizationStatus();
        return;
      }
      applyMonetizationAction(action === 'off' ? 'ads-off' : 'ads-on');
      return;
    }

    if (!action) {
      printMonetizationStatus();
      console.log(pc.gray('Tip: flash-dev config monetization menu  → interactive options\n'));
      return;
    }

    if (action === 'menu') {
      await interactiveMonetizationMenu();
      return;
    }

    if (action === 'on' || action === 'off') {
      applyMonetizationAction(action);
      return;
    }

    if (action === 'ads' || action === 'support') {
      const state = value;
      if (!state || !['on', 'off'].includes(state)) {
        console.log(pc.yellow(`\nUsage: flash-dev config monetization ${action} on|off\n`));
        process.exitCode = 1;
        return;
      }
      applyMonetizationAction(`${action}-${state}`);
      return;
    }

    console.log(pc.red(`\nUnknown monetization action: ${action}\n`));
    printConfigHelp();
    process.exitCode = 1;
  } catch (error) {
    console.log(pc.red(`\nConfig error: ${error.message}\n`));
    process.exitCode = 1;
  }
}

module.exports = configCommand;
