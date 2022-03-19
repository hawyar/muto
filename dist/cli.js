#!/usr/bin/env node
var p=(o,f,n)=>new Promise((u,c)=>{var d=e=>{try{r(n.next(e))}catch(i){c(i)}},l=e=>{try{r(n.throw(e))}catch(i){c(i)}},r=e=>e.done?u(e.value):Promise.resolve(e.value).then(d,l);r((n=n.apply(o,f)).next())});import m from"arg";var a=`
Usage:
  $muto [options]
  
  commands:
    add    Add new dataset to the workflow

  options:
    -v, --version  current version

    -f --from      Path of the file to source from
    -t --to        Destination path of where to save the output to
`,t=m({"--help":Boolean,"--version":Boolean,"--from":String,"--to":String,"-h":"--help","-v":"--version","-f":"--from","-t":"--to"});t["--help"]&&(s(a),process.exit(0));t["--version"]&&(s("v0.1.0"),process.exit(0));var h=t._;Object.keys(t).length===1&&(s(a),process.exit(0));var v={upload:"UPLOAD"};function g(){return p(this,null,function*(){let o={from:"",to:""};t["--from"]&&(o.from=t["--from"]),t["--to"]&&(o.to=t["--to"]),h.indexOf("upload")===-1&&(o.operation=v.upload),process.exit(0)})}function s(o){typeof o=="string"?process.stdout.write(`${o} 
`):process.stdout.write(`${JSON.stringify(o,null,2)}
`)}g().catch(console.error);process.on("unhandledRejection",(o,f)=>{s(o),process.exit(1)});
