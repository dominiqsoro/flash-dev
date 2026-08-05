

const pc = require('picocolors');

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.json = options.json || false;
    this.quiet = options.quiet || false;
  }

  static create(options = {}) {
    return new Logger(options);
  }

  info(message, data = null) {
    this._log('info', message, data, pc.cyan);
  }

  success(message, data = null) {
    this._log('success', message, data, pc.green);
  }

  warning(message, data = null) {
    this._log('warning', message, data, pc.yellow);
  }

  error(message, data = null) {
    this._log('error', message, data, pc.red);
  }

  debug(message, data = null) {
    if (this.verbose) {
      this._log('debug', message, data, pc.gray);
    }
  }

  _log(level, message, data, colorFn) {
    if (this.quiet && level !== 'error') return;

    if (this.json) {
      console.log(JSON.stringify({
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    const prefix = colorFn(`[${level.toUpperCase()}]`);
    console.log(`${prefix} ${message}`);
    
    if (data && this.verbose) {
      console.log(pc.gray(JSON.stringify(data, null, 2)));
    }
  }

  table(headers, rows) {
    if (this.json) {
      console.log(JSON.stringify({ headers, rows }));
      return;
    }

    const colWidths = headers.map((h, i) => {
      const maxRowWidth = Math.max(...rows.map(r => String(r[i]).length));
      return Math.max(h.length, maxRowWidth);
    });

    
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i])).join('  ');
    console.log(pc.cyan(headerRow));
    console.log(pc.gray('-'.repeat(headerRow.length)));

    
    rows.forEach(row => {
      const rowStr = row.map((cell, i) => String(cell).padEnd(colWidths[i])).join('  ');
      console.log(rowStr);
    });
  }

  progress(current, total, message = '') {
    if (this.json || this.quiet) return;

    const percentage = Math.round((current / total) * 100);
    const barLength = 20;
    const filled = Math.floor((percentage / 100) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    
    process.stdout.write(`\r${pc.cyan('Progress:')} ${pc.green(bar)} ${percentage}% ${message}`);
    
    if (current === total) {
      process.stdout.write('\n');
    }
  }
}

module.exports = Logger;
