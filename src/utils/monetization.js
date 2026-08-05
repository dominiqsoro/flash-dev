const pc = require('picocolors');

const SPONSOR_MESSAGES = [
  "Soutenez le développeur sur Buy Me a Coffee : https://www.buymeacoffee.com/dominiqsoro",
  "Vous aimez cet outil ? Laissez-nous une étoile sur GitHub : https://github.com/dominiqsoro/flash-dev",
  "flash-dev est 100% gratuit. Soutenez le projet sur GitHub Sponsors : https://github.com/dominiqsoro"
];

const ADS_MESSAGES = [
  "[Sponsor] Hébergez vos applications Node.js en 1 clic sur Hostinger - Code promo: 1BY1403",
];

function displayEthicalMonetization() {
  const random = Math.random();

  console.log("");

  if (random <= 0.20) {
    const randomIndex = Math.floor(Math.random() * SPONSOR_MESSAGES.length);
    console.log(pc.gray(SPONSOR_MESSAGES[randomIndex]));
  } 
  else if (random > 0.20 && random <= 0.30) {
    const randomIndex = Math.floor(Math.random() * ADS_MESSAGES.length);
    console.log(pc.gray(ADS_MESSAGES[randomIndex]));
  }
}

module.exports = {
  displayEthicalMonetization
};
