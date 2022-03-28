#!/usr/bin/env node
import arg from 'arg'
import { query } from '../dist/muto.mjs'
import pc from "picocolors"
import picocolors from 'picocolors'

const usage = `
${pc.bold('Usage:')}
    muto [command] [arg] [flags]

${pc.bold(`Commands:`)}
    query   Query data using SQL

${pc.bold(`Flags:`)}
    -s    --source        Path to the source file ${pc.bold('(required)')}
    -d    --destination   Destination of the processed file ${pc.bold('(required)')}

    -i    --input         Input format ${pc.bold('default: csv')} (csv, json, xml, etc.) 
    -o    --output        Output format ${pc.bold('default: csv')}

    -n    --name          Name of the query ${pc.bold('default: file name')}

    -v    --version       Print version
    -h    --help          Print help (what you are reading now)
  
${pc.bold(`Example:`)} 
    muto query "select id, track from albums" -s /path/to/file.csv -d ./result.json
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
    process.exit(0)
  }

  if (args._.length !== 2) {
    print(picocolors.red(`Error: Missing command argument, see ${pc.bold('muto --help')}`))
    process.exit(0)
  }

  if (args._[0] !== 'query') {
    print(picocolors.red(`Error: Unknown command, see ${pc.bold('muto --help')}`))
    process.exit(0)
  }

  if (!args['--source']) {
    print(picocolors.red(`Error: Missing source, see ${pc.bold('muto --help')}`))
    process.exit(0)
  }

  if (!args['--destination']) {
    print(picocolors.red(`Error: Missing destination, see ${pc.bold('muto --help')}`))
    process.exit(0)
  }

  const input = {
    input: args['--input'] || 'csv',
    output: args['--output'] || 'csv',
    name: args['--name'] || 'first_query',
    source: args['--source'],
    destination: args['--destination']
  }

    if (args._[1] === '') {
    print(picocolors.red(`Error: Missing query, see ${pc.bold('muto --help')}`))
    process.exit(1)
  }

  await query(args._[1], input)
  process.exit(0)
}


run().catch(console.error)


function print (msg) {
  typeof msg === 'string'
    ? process.stdout.write(`${msg} \n`)
    : process.stdout.write(`${JSON.stringify(msg, null, 2)} \n`)
}

process.on('unhandledRejection', (reason, promise) => {
  print(reason)
  process.exit(1)
})
