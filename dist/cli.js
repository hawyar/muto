#!/usr/bin/env node
var p=(n,i,e)=>new Promise((d,a)=>{var g=t=>{try{c(e.next(t))}catch(u){a(u)}},l=t=>{try{c(e.throw(t))}catch(u){a(u)}},c=t=>t.done?d(t.value):Promise.resolve(t.value).then(g,l);c((e=e.apply(n,i)).next())});import f from"arg";var r=`
Usage: 

muto [command] [arg] [flags]

commands:
  query    Query data using SQL

flags:
  -v    --version       Print version
  -s    --source        Source path
  -d    --destination   Destination path
  -i    --input        Input format
  -o    --output        Output format
`,o=f({"--help":Boolean,"--version":Boolean,"--source":String,"--destination":String,"--input":String,"--output":String,"-h":"--help","-v":"--version","-s":"--source","-d":"--destination","-i":"--input","-o":"--output"});function m(){return p(this,null,function*(){o["--help"]&&(s(r),process.exit(0)),o["--version"]&&(s("v1.0.0"),process.exit(0)),o._.length===0&&(s(`Missing command 
${r}`),process.exit(1)),o._.length!==2&&(s(`Missing command ${r}`),process.exit(1)),o._[0]!=="query"&&s(`Invalid command ${r}`);let n={source:"",destination:""};o["--source"]||(s("Missing source"),process.exit(1)),o["--destination"]||(s("Missing destination"),process.exit(1)),n.source=o["--source"],n.destination=o["--destination"];let i=o._[1];console.log(i),console.log(o),process.exit(0)})}function s(n){typeof n=="string"?process.stdout.write(`${n} 
`):process.stdout.write(`${JSON.stringify(n,null,2)}
`)}m().catch(console.error);process.on("unhandledRejection",(n,i)=>{s(n),process.exit(1)});
