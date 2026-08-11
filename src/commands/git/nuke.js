const { execSync } = require('child_process');
const pc = require('picocolors');
const prompts = require('prompts');
const { getMainBranch } = require('../../utils/git');


const PROTECTED_BRANCHES = [
  'main',
  'master',
  'dev',
  'develop',
  'staging',
  'production'
];


async function nukeCommand() {
  try {
    console.log(
      pc.cyan('flash-dev nuke - Nettoyage des branches locales fusionnées\n')
    );


    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      console.log(pc.red('Ce dossier n\'est pas un dépôt Git.'));
      console.log(pc.cyan('Initialisez avec: git init\n'));
      process.exit(1);
    }


    const currentBranch = execSync(
      'git rev-parse --abbrev-ref HEAD',
      { encoding: 'utf-8' }
    ).trim();


    const mainBranch = getMainBranch();


    console.log(pc.yellow(`Branche actuelle: ${currentBranch}`));
    console.log(pc.yellow(`Branche principale: ${mainBranch}\n`));


    console.log(pc.yellow('Analyse des branches locales...'));


    const allBranches = execSync(
      'git branch',
      { encoding: 'utf-8' }
    )
    .trim()
    .split('\n');


    const branchNames = allBranches.map(branch =>
      branch.replace(/^\*\s+/, '').trim()
    );


    const mergedBranches = [];


    for (const branch of branchNames) {

      if (
        branch === currentBranch ||
        PROTECTED_BRANCHES.includes(branch)
      ) {
        continue;
      }


      try {
        const merged = execSync(
          `git branch --merged ${mainBranch}`,
          { encoding: 'utf-8' }
        );


        if (merged.includes(branch)) {
          mergedBranches.push(branch);
        }

      } catch {
        continue;
      }
    }


    if (mergedBranches.length === 0) {
      console.log(pc.green('Aucune branche fusionnée à supprimer.\n'));
      return;
    }


    console.log(pc.cyan('Branches trouvées :\n'));

    mergedBranches.forEach(branch => {
      console.log(pc.gray(` - ${branch}`));
    });


    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Supprimer ces branches locales ?',
      initial: false
    });


    if (!confirm) {
      console.log(pc.yellow('\nOpération annulée.\n'));
      return;
    }


    for (const branch of mergedBranches) {

      try {
        execSync(
          `git branch -d ${branch}`,
          { encoding: 'utf-8' }
        );

        console.log(
          pc.green(`Supprimée: ${branch}`)
        );

      } catch(error) {

        console.log(
          pc.red(`Impossible de supprimer ${branch}`)
        );

      }
    }


    console.log(
      pc.green('\nNettoyage terminé.\n')
    );


  } catch(error) {

    console.log(
      pc.red(`\nErreur: ${error.message}\n`)
    );

    process.exit(1);
  }
}module.exports = nukeCommand;