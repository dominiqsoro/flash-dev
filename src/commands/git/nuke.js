const { execSync } = require('child_process');
const pc = require('picocolors');
const prompts = require('prompts');


const PROTECTED_BRANCHES = ['main', 'master', 'dev', 'develop', 'staging', 'production'];


async function nukeCommand() {
  try {
    console.log(pc.cyan('flash-dev nuke - Nettoyage des branches locales fusionnées\n'));
    
    
      console.log(pc.cyan('Initialisez avec: git init\n'));
      process.exit(1);
    }
    
    
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    const mainBranch = getMainBranch();
    
    console.log(pc.yellow(`Branche actuelle: ${currentBranch}`));
    console.log(pc.yellow(`Branche principale: ${mainBranch}\n`));
    
    
    console.log(pc.yellow('Analyse des branches locales...'));
    const allBranches = execSync('git branch', { encoding: 'utf-8' }).trim().split('\n');
    
    
    const branchNames = allBranches.map(branch => branch.replace(/^\*\s+/, '').trim());
    
    
    const mergedBranches = [];
    
    branchNames.forEach(branch => {
      
      if (branch === currentBranch || PROTECTED_BRANCHES.includes(branch)) {
        return;
      }
      
      try {
        
        execSync(`git branch --merged ${branch}`, { encoding: 'utf-8', stdio: 'pipe' });
        mergedBranches.push(branch);
      } catch (error) {
        
    execSync('git rev-parse --verify main', { encoding: 'utf-8', stdio: 'pipe' });
    return 'main';
  } catch (error) {
    
  }
}

module.exports = nukeCommand;
