#!/usr/bin/env node
import arg from 'arg'
import { query } from '../dist/muto.js'

const usage = `
Usage: \n
muto [command] [arg] [flags]

commands:
  query    Query data using SQL

flags:
  -v    --version       Print version
  -s    --source        Source path
  -d    --destination   Destination path
  -i    --input        Input format
  -o    --output        Output format
`

const args = arg({
  '--help': Boolean,
  '--version': Boolean,
  '--source': String,
  '--destination': String,
  '--input': String,
  '--output': String,

  '-h': '--help',
  '-v': '--version',
  '-s': '--source',
  '-d': '--destination',
  '-i': '--input',
  '-o': '--output'
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

  if (args["_"].length === 0) {
    stdout(`Missing command \n${usage}`)
    process.exit(1)
  }

  if (args["_"].length !== 2) {
    stdout(`Missing command ${usage}`)
    process.exit(1)
  }

  if (args["_"][0] !== 'query') {
    stdout(`Invalid command ${usage}`)
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
    source: args['--source'],
    destination: args['--destination']
  }
 
  const query = args["_"][1]

  console.log(args)

  const result = await query(query, input)
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
