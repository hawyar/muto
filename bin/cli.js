#!/usr/bin/env node
import arg from 'arg'
import { query } from '../dist/muto.mjs'
import pc from "picocolors"
import picocolors from 'picocolors'

const usage = `
${pc.bold('Usage:')}:
    muto [command] [arg] [flags]

${pc.bold(`Commands:`)}: 
    query   Query data using SQL

    Flags:
      -s    --source        Path to the source file ${pc.bold('(required)')}
      -d    --destination   Destination of the processed file ${pc.bold('(required)')}
      -i    --input         Input format ${pc.bold('default: csv')} (csv, json, xml, etc.) 
      -o    --output        Output format ${pc.bold('default: csv')}
      -n    --name          Name of the query ${pc.bold('default: file name')}
      -v    --version       Print version
`

const args = arg({
  '--help': Boolean,
  '--version': Boolean,
  '--source': String,
  '--destination': String,
  '--input': String,
  '--output': String,
  '--name': String,

  '-h': '--help',
  '-v': '--version',
  '-s': '--source',
  '-d': '--destination',
  '-i': '--input',
  '-o': '--output',
  '-n': '--name'
})

async function run () {
  if (args['--help']) {
    print(usage)
    process.exit(0)
  }

  if (args['--version']) {
    print('v1.0.0')
    process.exit(0)
  }

  if (args._.length === 0) {
    print(picocolors.red(`Error: Missing command, see ${pc.bold('muto --help')}`))
    process.exit(1)
  }

  if (args._.length !== 2) {
    print(`Missing command ${usage}`)
    process.exit(1)
  }

  if (args._[0] !== 'query') {
    print('Invalid command')
  }

  if (!args['--source']) {
    print('Missing source')
    process.exit(1)
  }

  if (!args['--destination']) {
    print('Missing destination')
    process.exit(1)
  }

  const input = {
    input: args['--input'] || 'csv',
    output: args['--output'] || 'csv',
    name: args['--name'] || 'first_query',
    source: args['--source'],
    destination: args['--destination']
  }

  if (args._[1] === '') {
    print('Missing query')
    process.exit(1)
  }

  // await query("select * from albums", {
  //   name: 'albums',
  //   input: 'csv',
  //   // source: '/Users/hawyar/Personal/ares/tests/fixtures/albums.csv',
  //   // source: "/Users/hawyar/Downloads/MUP_PHY_R21_P04_V10_D19_Prov.csv",
  //   source: "/Users/hawyar/Downloads/redbull.csv",
  //   output: 'json',
  //   destination: './beep22.json',
  // })

  await query(args._[1], input)
  process.exit(0)
}

function print (msg) {
  typeof msg === 'string'
    ? process.stdout.write(`${msg} \n`)
    : process.stdout.write(`${JSON.stringify(msg, null, 2)}\n`)
}

run().catch(console.error)

process.on('unhandledRejection', (reason, promise) => {
  print(reason)
  process.exit(1)
})
