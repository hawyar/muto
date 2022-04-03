#!/usr/bin/env node
import arg from 'arg'
import { query } from '../dist/muto.mjs'
import pc from 'picocolors'

const usage = `
${pc.bold('Usage:')}
    muto [command] [arg] [flags]

${pc.bold('Commands:')}
    query   Query data using SQL

${pc.bold('Flags:')}
    -s    --source        Path to the source file ${pc.bold('(required)')}
    -d    --destination   The destination where the result will be written to ${pc.bold('(required)')}

    -i    --input         Input format, defaults to the extension of the source file
    -o    --output        Output format, defa

    -n    --name          Name of the query, defaults to the name of the source file

    -v    --version       Print version
    -h    --help          Print help (what you are reading now)
  
${pc.bold('Example:')} 
    muto query "select id, track from albums" -s /path/to/file.csv -d ./result.json
`

async function run () {
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

  if (args['--help']) {
    print(usage)
    process.exit(0)
  }

  if (args['--version']) {
    print('v1.0.0')
    process.exit(0)
  }

  if (args._.length === 0) {
    print(`${pc.red('Error: ')} Missing command argument, did you mean "muto query" ?`)
    process.exit(0)
  }

  if (args._.length !== 2) {
    print(`${pc.red('Error: ')} Missing command argument, see ${pc.bold('muto --help')}`)
    process.exit(0)
  }

  if (args._[0] !== 'query') {
    print(`${pc.red('Error: ')}  Unknown command, see ${pc.bold('muto --help')}`)
    process.exit(0)
  }

  if (!args['--source']) {
    print(`${pc.red('Error: ')} Missing source, see ${pc.bold('muto --help')}`)
    process.exit(0)
  }

  if (!args['--destination']) {
    print(`${pc.red('Error: ')} Missing destination, see ${pc.bold('muto --help')}`)
    process.exit(0)
  }

  const input = {
    input: args['--input'] || '',
    output: args['--output'] || '',
    name: args['--name'] || '',
    source: args['--source'],
    destination: args['--destination']
  }

  if (args._[1] === '') {
    print(`${pc.red('Error: ')} Missing query, see ${pc.bold('muto --help')}`)
    process.exit(1)
  }

  await query(args._[1], input)
  process.exit(0)
}

function print (msg) {
  typeof msg === 'string'
    ? process.stdout.write(`${msg} \n`)
    : process.stdout.write(`${JSON.stringify(msg, null, 2)} \n`)
}

run().catch(err => {
  if (err.code === 'ARG_UNKNOWN_OPTION') {
    const errMsg = err.message.split('\n')
    print(`${pc.red('Error: ')} ${errMsg}, see ${pc.bold('muto --help')}`)
    process.exit(1)
  }
  print(err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  print(reason)
  process.exit(1)
})
