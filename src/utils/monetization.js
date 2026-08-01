const pc = require('picocolors');

const SPONSOR_MESSAGES = [
  "💡 flash-dev vous a fait gagner du temps aujourd'hui ? Offrez-nous un café sur Ko-fi : https://ko-fi.com/dominiqsoro",
  "☕ Soutenez le développeur sur Buy Me a Coffee : https://www.buymeacoffee.com/dominiqsoro",
  "⭐ Vous aimez cet outil ? Laissez-nous une étoile sur GitHub : https://github.com/dominiqsoro/flash-dev",
  "💙 flash-dev est 100% gratuit. Soutenez le projet sur GitHub Sponsors : https://github.com/dominiqsoro"
];

const ADS_MESSAGES = [
  "⚡ [Sponsor] Hébergez vos applications Node.js en 1 clic sur Hostinger - Code promo: 1BY1403",
  "🔒 [Sponsor] Sécurisez votre code avec Securify, le scanner de vulnérabilités CLI gratuit.",
  "🚀 [Sponsor] Besoin d'une base de données SQL ultra-rapide ? Essayez NeonDB."
];

/**
 * Affiche un message de monétisation éthique de manière probabiliste
 * 30% de messages de soutien, 20% de publicités natives, 50% de silence total
 */
function displayEthicalMonetization() {
  const random = Math.random(); // Génère un nombre entre 0 et 1

  console.log(""); // Ligne vide pour aérer le terminal après l'action principale

  if (random <= 0.30) {
    // 30% de chance d'afficher un message de soutien communautaire
    const randomIndex = Math.floor(Math.random() * SPONSOR_MESSAGES.length);
    console.log(pc.gray(SPONSOR_MESSAGES[randomIndex]));
  } 
  else if (random > 0.30 && random <= 0.50) {
    // 20% de chance d'afficher une publicité native
    const randomIndex = Math.floor(Math.random() * ADS_MESSAGES.length);
    console.log(pc.gray(ADS_MESSAGES[randomIndex]));
  }
  // Les 50% du temps restants : Rien ne s'affiche, l'UX reste totalement pure.
}

module.exports = {
  displayEthicalMonetization
};
