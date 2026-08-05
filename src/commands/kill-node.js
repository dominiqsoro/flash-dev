const { execSync } = require('child_process');
const pc = require('picocolors');


function killNodeCommand() {
  try {
    console.log(pc.cyan('\n⚙️  Recherche de processus Node.js fantômes...'));
    
    const currentPid = process.pid;
    const parentPid = process.ppid;
    
    console.log(pc.gray(`Processus actuel (PID) : ${currentPid}`));
    if (parentPid) {
      console.log(pc.gray(`Processus parent (PPID) : ${parentPid}`));
    }

    const platform = process.platform;

    if (platform === 'win32') {
      try {
        
        let cmd = `taskkill /F /IM node.exe /FI "PID ne ${currentPid}"`;
        if (parentPid) {
          cmd += ` /FI "PID ne ${parentPid}"`;
        }
        
        
        execSync(cmd, { stdio: 'ignore' });
        console.log(pc.green('✨ Tous les processus Node.js fantômes ont été terminés avec succès.'));
      } catch (err) {
        
      }
    } else {
      
      try {
        const output = execSync('pgrep node', { encoding: 'utf8' });
        const pids = output
          .split('\n')
          .map(p => p.trim())
          .filter(p => p.length > 0)
          .map(p => parseInt(p, 10))
          .filter(pid => pid !== currentPid && pid !== parentPid && !isNaN(pid));

        if (pids.length > 0) {
          console.log(pc.yellow(`Tuer les processus suivants : ${pids.join(', ')}...`));
          execSync(`kill -9 ${pids.join(' ')}`, { stdio: 'ignore' });
          console.log(pc.green(`✨ ${pids.length} processus Node.js fantômes ont été terminés.`));
        } else {
          console.log(pc.green('✨ Aucun processus Node.js fantôme n\'a été détecté.'));
        }
      } catch (err) {
        
        console.log(pc.green('✨ Aucun processus Node.js fantôme n\'a été détecté.'));
      }
    }
    console.log();
  } catch (error) {
    console.log(pc.red(`\n❌ Erreur lors de l'arrêt des processus Node.js : ${error.message}\n`));
  }
}

module.exports = killNodeCommand;
