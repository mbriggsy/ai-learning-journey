const chalk = require('chalk');

const VERSION = 'v0.3.0';

function showBanner() {
  const dim = chalk.green.dim;
  const green = chalk.green;
  const grey = chalk.grey;
  const white = chalk.white;

  const banner = [
    dim('                                                  H A P P Y   T O Y Z ™'),
    '',
    green(' ██████╗ ██╗   ██╗███████╗██████╗ ██████╗ ██████╗ ██╗██╗   ██╗███████╗'),
    green('██╔═══██╗██║   ██║██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██║   ██║██╔════╝'),
    green('██║   ██║██║   ██║█████╗  ██████╔╝██║  ██║██████╔╝██║██║   ██║█████╗  '),
    green('██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗██║  ██║██╔══██╗██║╚██╗ ██╔╝██╔══╝  '),
    green('╚██████╔╝ ╚████╔╝ ███████╗██║  ██║██████╔╝██║  ██║██║ ╚████╔╝ ███████╗'),
    green(' ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝'),
    grey('  ──────────────────────────────────────────────────────────────────────'),
    white(`  ${VERSION}              NASA-grade rigor. One prompt.`),
  ];

  console.log('');
  banner.forEach(line => console.log(line));
  console.log('');
}

module.exports = { showBanner, VERSION };
