#!/usr/bin/env node
import arg from 'arg'
import { query } from '../dist/muto.mjs'
import pc from 'picocolors'

const usage = `
${pc.bold('Usage:')}
    muto [command] [arg] [flags]

${pc.bold('Commands:')}
    select   Query data from specified source (basically SQL's SELECT)

${pc.bold('Flags:')}
    -d    --destination   The destination where the result will be written to ${pc.bold('(required)')}

    -i    --input         Input format, defaults to the extension of the source file
    -o    --output        Output format, defaults to the extension of the destination file

    -v    --version       Print version
    -h    --help          Print help (what you are reading now)
  
${pc.bold('Example:')} 
    muto query "select id, track from albums" -s /path/to/file.csv -d ./result.json
`

async function run () {
  const args = arg({
    '--help': Boolean,
    '--version': Boolean,
    '--destination': String,
    '--input': String,
    '--output': String,

    '-h': '--help',
    '-v': '--version',
    '-d': '--destination',
    '-i': '--input',
    '-o': '--output',
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

  if (!args['--destination']) {
    print(`${pc.red('Error: ')} Missing destination, see ${pc.bold('muto --help')}`)
    process.exit(0)
  }

  if (args._[1] === '') {
    print(`${pc.red('Error: ')} Missing query, see ${pc.bold('muto --help')}`)
    process.exit(1)
  }

  await query(args._[1], {
    destination: args['--destination'],
  }).catch(err => {
    print(`${pc.red('Error: ')} ${err.message}`)
    process.exit(1)
  })
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
