#!/usr/bin/env node

const { program } = require('commander')
const localCommand = require('../src/local')
const cloudCommand = require('../src/cloud')
const packageJson = require('../package.json')

program
  .name('pocketgrav')
  .description('AntiGravity Mobile Monitor')
  .version(packageJson.version)

program
  .command('local')
  .description('Start a local web server & localtunnel to securely access your logs without cloud accounts')
  .action(() => {
    localCommand()
  })

program
  .command('cloud')
  .description('Push logs directly to your globally hosted PocketGrav SaaS dashboard (Vercel/Supabase)')
  .requiredOption('-e, --email <email>', 'Your Google Email registered on the dashboard')
  .requiredOption('-k, --key <key>', 'Your unique API key from the Dashboard Settings')
  .option('-u, --url <url>', 'The remote dashboard ingest route', 'https://pocket-grav.vercel.app/api/ingest')
  .action((options) => {
    cloudCommand(options)
  })

program.parse()
