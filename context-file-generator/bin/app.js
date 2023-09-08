#!/usr/bin/env node
const swagger = require('./swagger.js');
const yargs = require('yargs')
  .usage('$0 command')
  .command('ngsi', 'output NGSILD context')
  .command('jsonld', 'output JSONLD context with @graph')
  .command('markdown', 'output Markdown')
  .demandCommand(1, 'must provide a valid command')
  .demandOption(['i'])
  .alias('i', 'file')
  .alias('l', 'lang');

const argv = yargs.argv;
const command = argv._[0];

switch (command) {
  case 'markdown':
    swagger.markdown(argv.file, argv.lang || 'en');
    break;
  case 'ngsi':
    swagger.ngsi(argv.file);
    break;
  case 'jsonld':
    swagger.jsonld(argv.file, argv.lang || 'en');
    break;
  default:
    yargs.showHelp();
}
