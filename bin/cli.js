#!/usr/bin/env node
import arg from 'arg'
import { query } from '../dist/muto.mjs'
import pc from 'picocolors'

const usage = `
${pc.bold('Usage:')}
    muto [command] [arg] [flags]

${pc.bold('Commands:')}
    query   Query data from specified source (basically SQL's SELECT)

${pc.bold('Flags:')}
    -v    --version       Print version
    -h    --help          Print help (what you are reading now)
  
${pc.bold('Example:')} 
    muto query 'select id, track from "s3://superbucket/somefile.csv" to "result.json"'
`

async function run () {
  const args = arg({
    '--help': Boolean,
    '--version': Boolean,

    '-h': '--help',
    '-v': '--version',
  })

  if (args['--help']) {
    console.log(usage)
    process.exit(0)
  }

  if (args['--version']) {
    console.log('v1.0.0')
    process.exit(0)
  }

  if (args._.length === 0) {
    console.log(`${pc.red('Error: ')} Missing command argument, did you mean "muto query" ?`)
    process.exit(0)
  }

  if (args._.length !== 2) {
    console.log(`${pc.red('Error: ')} Missing command argument, see ${pc.bold('muto --help')}`)
    process.exit(0)
  }

  if (args._[0] !== 'query') {
    console.log(`${pc.red('Error: ')}  Unknown command, see ${pc.bold('muto --help')}`)
    process.exit(0)
  }

  if (args._[1] === '') {
    console.log(`${pc.red('Error: ')} Missing query, see ${pc.bold('muto --help')}`)
    process.exit(1)
  }

  await query(args._[1]).catch(err => {
    console.log(`${pc.red('Error: ')} ${err.message}`)
    process.exit(1)
  })
  process.exit(0)
}

run().catch(err => {
  if (err.code === 'ARG_UNKNOWN_OPTION') {
    const errMsg = err.message.split('\n')
    console.log(`${pc.red('Error: ')} ${errMsg}, see ${pc.bold('muto --help')}`)
    process.exit(1)
  }
  console.log(err)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  print(reason)
  process.exit(1)
})
