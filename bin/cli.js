#!/usr/bin/env node
import arg from 'arg'
import { query } from '../dist/muto.mjs'

const usage = `
Usage: \n
muto [command] [arg] [flags]

commands:
  query    Query data using SQL

flags:
  -v    --version       Print version
  -s    --source        Source path
  -d    --destination   Destination path
  -i    --input         Input format
  -o    --output        Output format
  -n    --name          Name of the query
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
    stdout(usage)
    process.exit(0)
  }

  if (args['--version']) {
    stdout('v1.0.0')
    process.exit(0)
  }

  if (args._.length === 0) {
    stdout(`Missing command \n${usage}`)
    process.exit(1)
  }

  if (args._.length !== 2) {
    stdout(`Missing command ${usage}`)
    process.exit(1)
  }

  if (args._[0] !== 'query') {
    stdout('Invalid command')
  }

  if (!args['--source']) {
    stdout('Missing source')
    process.exit(1)
  }

  if (!args['--destination']) {
    stdout('Missing destination')
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
    stdout('Missing query')
    process.exit(1)
  }

  await query(args._[1], input)
  process.exit(0)
}

function stdout (msg) {
  typeof msg === 'string'
    ? process.stdout.write(`${msg} \n`)
    : process.stdout.write(`${JSON.stringify(msg, null, 2)}\n`)
}

run().catch(console.error)

process.on('unhandledRejection', (reason, promise) => {
  stdout(reason)
  process.exit(1)
})
