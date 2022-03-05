var u=(a,t,e)=>new Promise((r,o)=>{var s=n=>{try{l(e.next(n))}catch(d){o(d)}},i=n=>{try{l(e.throw(n))}catch(d){o(d)}},l=n=>n.done?r(n.value):Promise.resolve(n.value).then(s,i);l((e=e.apply(a,t)).next())});import c from"fs";import{spawn as C}from"child_process";import y from"os";import v,{join as E}from"path";import{VFile as x}from"vfile";import{parse as $}from"pgsql-parser";import{createInterface as P}from"readline";import{CreateMultipartUploadCommand as b,PutObjectCommand as O,S3Client as R}from"@aws-sdk/client-s3";import{fromIni as N}from"@aws-sdk/credential-providers";var A=(i=>(i.COMMA=",",i.TAB="	",i.SPACE=" ",i.PIPE="|",i.SEMICOLON=";",i.COLON=":",i))(A||{});const p=E(process.cwd(),"node_modules",".bin","mlr@v6.0.0");function W(a){const t=$(a);c.writeFileSync("temp22.json",JSON.stringify(t,null,2));const e=t[0].RawStmt.stmt.SelectStmt,r={type:"select",distinct:!1,columns:[],from:[],sort:{},where:{},group:[],having:[],order:[],limit:{}},o=e.limitOption;if(o==="LIMIT_OPTION_DEFAULT"&&(r.limit={type:e.limitOption}),o==="LIMIT_OPTION_COUNT"&&e.limitCount&&(r.limit={type:e.limitOption,val:e.limitCount.A_Const.val.Integer.ival}),e.distinctClause&&(r.distinct=!0),e.targetList&&(r.columns=e.targetList.map(s=>{const i=s.ResTarget.val.ColumnRef.fields[0];return i.A_Star?{col:"*"}:s.ResTarget.name?{as:s.ResTarget.name,col:i.String.str}:{col:i.String.str}})),r.from=e.fromClause.map(s=>{const i={schemaname:"",relname:"",inh:""},l=s.RangeVar;return l.schemaname&&(i.schemaname=l.schemaname),l.relname&&(i.relname=l.relname),l.inh&&(i.inh=l.inh),i}),e.whereClause){if(e.whereClause.A_Expr&&e.whereClause.A_Expr.kind==="AEXPR_OP"){const s=e.whereClause.A_Expr,i={operator:"",left:{},right:{}};i.operator=s.name[0].String.str,s.lexpr&&(i.left=s.lexpr.ColumnRef.fields[0].String.str),s.rexpr&&(i.right=s.rexpr.ColumnRef.fields[0].String.str),r.where=i}if(e.whereClause.A_Expr&&e.whereClause.A_Expr.kind==="AEXPR_IN"){const s=e.whereClause.A_Expr}if(e.whereClause.BoolExpr){if(e.whereClause.BoolExpr.boolop==="AND_EXPR"){const s=e.whereClause.BoolExpr.args;console.log(JSON.stringify(s,null,2))}if(e.whereClause.BoolExpr.boolop==="OR_EXPR"){const s=e.whereClause.BoolExpr.args;console.log(JSON.stringify(s,null,2))}}}return r}const g=a=>N({profile:a,mfaCodeProvider:t=>u(void 0,null,function*(){return t})});let S;function w(a){return S||(console.log("setting up s3 client"),S=new R(a)),S}function I(a,t){const e={file:t&&t.file?t.file:!1};if(!a.startsWith("s3://")||a.split(":/")[0]!=="s3")throw new Error(`invalid-s3-uri: ${a}`);let r="";const o={bucket:"",key:"",file:""},s=a.split(":/")[1],[i,...l]=s.split("/").splice(1);return o.bucket=i,o.key=l.join("/"),l.forEach((n,d)=>{if(d===l.length-1){const f=n.split(".").length;if(e.file&&f===1&&(r=`uri should be a given, given: ${a}`),!e.file&&f===1)return;if(!e.file&&f>1){r=`Invalid S3 uri, ${a} should not end with a file name`;return}!e.file&&n.split(".")[1]!==""&&f>1&&(r=`${a} should not be a file endpoint: ${n}`),f>1&&n.split(".")[1]!==""&&(o.file=n)}}),{data:o,err:r}}var k=(t=>(t[t.LIMIT_OPTION_DEFAUL=0]="LIMIT_OPTION_DEFAUL",t))(k||{});class _{constructor(t,e){this.name=e&&e.name?e.name:v.basename(t),this.source=t,this.options=e,this.destination=e.destination,this.env="local",this.init=new Date,this.state="init",this.pcount=0,this.vfile=new x({path:this.source}),this.stmt={type:"",distinct:!1,columns:[],from:[],sort:[],where:{},group:[],having:[],limit:0}}toJson(){return u(this,null,function*(){const t=this.exec(p,["--icsv","--ojson","clean-whitespace",this.source]);if(!t.stdout)throw new Error(`failed to convert ${this.source} from CSV to JSON`);return t})}toCSV(){return u(this,null,function*(){const t=this.exec(p,["--icsv","--ocsv","cat",this.source]);if(!t.stdout)throw new Error(`failed to convert ${this.source} from JSON to CSV`);return t})}rowCount(){return u(this,null,function*(){const t=yield this.exec(p,["--ojson","count",this.source]),e=yield this.promisifyProcessResult(t);if(e.code!==0)throw new Error(`Error while counting rows: ${e.stderr}`);if(e.stderr)throw new Error(e.stderr);const r=JSON.parse(e.stdout);if(r.length===0)throw new Error("No rows found");return r[0].count})}getColumnHeader(){return u(this,null,function*(){const t=yield this.exec(p,["--icsv","--ojson","head","-n","1",this.source]),e=yield this.promisifyProcessResult(t);if(e.code!==0)return null;if(e.stderr)throw new Error(e.stderr);const r=JSON.parse(e.stdout);if(r.length===0)return null;const o=Object.keys(r[0]);return this.vfile.data.columns=o,o})}preview(t=20,e){return u(this,null,function*(){let r;const o=1024*1024*10,i=yield c.promises.stat(this.source);if(e&&e!==this.source&&c.createWriteStream(e)instanceof c.WriteStream||i.size>o){if(e===void 0)throw new Error("stream-destination-undefined");return r=c.createWriteStream(e),(yield this.exec(p,["--icsv","--ojson","head","-n",t.toString(),this.source])).stdout.pipe(r),console.warn(`\u{1F440} Preview saved to: ${e}`),e}const l=yield this.exec(p,["--icsv","--ojson","head","-n",t.toString(),this.source]),n=yield this.promisifyProcessResult(l);if(n.stderr)throw new Error(n.stderr);if(n.code!==0)throw new Error("Error while executing mlr command");return this.vfile.data.preview=JSON.parse(n.stdout),JSON.parse(n.stdout)})}detectShape(){return u(this,null,function*(){const t=this.source,e={type:"",size:0,columns:[],header:!1,encoding:"utf-8",bom:!1,spanMultipleLines:!1,quotes:!1,delimiter:",",errors:{},warnings:{},preview:[]};if(!c.existsSync(t))throw new Error(`path-doesnt-exists: ${t} ,provide a valid path to a CSV file`);if(e.size=c.statSync(t).size,e.size>1024*1024*1024)throw new Error(`file-size-exceeds-limit: ${t} is too large, please limit to under 1GB for now`);if(!c.existsSync(t))throw new Error(`${t} does not exist, provide a valid path to a CSV file`);if(y.platform()==="win32")throw new Error("scream");const r=this.exec("file",[t,"--mime-type"]),o=yield this.promisifyProcessResult(r);if(o.stderr)throw new Error(`failed-to-detect-mime-type: ${o.stderr}`);if(o.code!==0)throw new Error(`failed-to-detect-mime-type: ${o.stderr}`);e.type=o.stdout.split(":")[1].trim();const s=P({input:c.createReadStream(t),crlfDelay:1/0});let i=0;const l=20,n={row:[""],del:""};let d="";const f=[",",";","	","|",":"," ","|"];s.on("line",m=>{if(i===0&&(f.forEach(h=>{m.split(h).length>1&&(n.row=m.split(h),n.del=h)}),(n.del===""||n.row.length<=1)&&(e.errors.unrecognizedDelimiter=`${t} does not have a recognized delimiter`,e.header=!1),n.row.forEach(h=>{isNaN(parseInt(h.substring(0,3)))||(e.header=!1,e.warnings.noHeader="no header found",i++)}),e.header=!0,e.delimiter=n.del,e.columns=n.row),i>0&&i<l){const h=m.split('"').length-1;if(d&&h%2!==0&&(e.spanMultipleLines=!0),h%2!==0&&m.split('""').length-1!==1&&(d=m),m.split(n.del).length!==n.row.length){e.errors.rowWidthMismatch="row width mismatch";return}e.preview.push(m.split(n.del))}i++}),s.on("close",()=>{this.vfile.data.shape=e})})}determineLoader(){if(this.destination.startsWith("s3://")){this.vfile.data.loader=w({credentials:g("default"),region:"us-east-2"});return}(this.source.startsWith("/")||this.source.startsWith("../")||this.source.startsWith("./"))&&(this.vfile.data.loader=c.createReadStream(this.source))}determineConnector(){switch(this.env){case"local":if(!c.existsSync(this.source))throw new Error(`file: ${this.source} not found, please provide a valid file path`);this.vfile.data.connector=c.createReadStream(this.source);break;case"aws":this.vfile.data.connector=w({credentials:g("default"),region:"us-east-2"});break;default:throw new Error(`unsupported-source for: ${this.source}`)}}determineEnv(){if(this.vfile.data.source=this.source,this.source.startsWith("/")||this.source.startsWith("../")||this.source.startsWith("./")){this.env="local";return}if(this.source.startsWith("s3://")){this.env="aws";return}throw new Error(`invalid-source-type: ${this.source}`)}fileSize(){const t=1024*1024*50;if(!c.existsSync(this.source))throw new Error(`path-doesnt-exists: ${this.source} ,provide a valid path to a CSV file`);const e=c.statSync(this.source);if(e.size>t)throw new Error(`file-size-exceeds-limit: ${this.source} is too large, please limit to 50MB`);return e.size}uploadToS3(){return u(this,null,function*(){if(!this.source||!this.destination)throw new Error("source or destination not set. Both must be defined to upload to S3");const t=c.createReadStream(this.source);if(!t.readable)throw new Error("failed-to-read-source: Make sure the provided file is readable");const e=this.fileSize();e>100*1024*1024&&console.warn(`file size ${e} is larger`);const{data:r,err:o}=I(this.destination,{file:!0});if(o.toString().startsWith("invalid-s3-uri"))throw new Error(`failed-to-parse-s3-uri: ${o}`);r.file||(r.file=v.basename(this.source),console.warn("Destination filename not provided. Using source source basename"+r.file)),console.log(`uploading ${this.source} to ${this.destination}`);const i=yield w({region:"us-east-2"}).send(new O({Bucket:r.bucket,Key:r.key+r.file,Body:t})).catch(l=>{throw new Error(`failed-upload-s3: Error while uploading to S3: ${l}`)}).finally(()=>{t.close()});if(i.$metadata.httpStatusCode!==200)throw new Error(`failed-upload-s3: Error while uploading to S3: ${i.$metadata.httpStatusCode}`);if(!i.$metadata.requestId)throw new Error(`failed-upload-s3: Error while uploading to S3: ${i.$metadata.httpStatusCode}`);return i.$metadata.requestId})}initMultipartUpload(t,e){return u(this,null,function*(){const r=w({credentials:g("default"),region:"us-east-2"}),o=new b({Bucket:t,ContentEncoding:"utf8",ContentType:"text/csv",Key:e}),s=yield r.send(o);if(s.$metadata.httpStatusCode!==200)throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${s.UploadId} with status code ${s.$metadata.httpStatusCode}`);if(!s.UploadId)throw new Error(`failed-multipart-upload: Error while creating multipart upload: ${s.UploadId}`);return s.UploadId})}exec(t,e){if(console.log(`exec: ${t} ${e.join(" ")}`),this.pcount>5)throw new Error(`too-many-processes: ${this.pcount}`);return this.pcount++,C(t,e,{})}promisifyProcessResult(t){return u(this,null,function*(){const e={stdout:"",stderr:"",code:0};return yield new Promise((r,o)=>{t.stdout.on("data",s=>{e.stdout+=s}),t.stderr.on("data",s=>{e.stderr+=s}),t.on("close",s=>{e.code=s===0?0:1,r(e)}),t.on("error",s=>{o(s)})})})}}function K(a,t){return u(this,null,function*(){return yield new Promise((e,r)=>{a||r(new Error("failed-to-create-dataset: source is required")),(!t||!t.destination)&&r(new Error("failed-to-create-dataset: destination is required")),a.endsWith(".csv")||r(new Error(`failed to create dataset: ${a}, source must be a csv file`));const o=new _(a,t);Promise.all([o.determineEnv(),o.detectShape(),o.determineConnector(),o.determineLoader()]).then(()=>{console.log(`created catalog for ${a}`),e(o)}).catch(s=>r(s))})})}class z{constructor(t){this.name=t,this.catalogs=new Map,this.createdAt=new Date,this.env="local",this.stmt=""}list(){return Array.from(this.catalogs.values())}remove(t){this.catalogs.delete(t.source)}get(t){if(this.catalogs.get(t)!=null)return this.catalogs.get(t)}add(t){if(Array.isArray(t)){if(t.length===1&&t[0].source){const r=t[0];if(this.catalogs.has(r.source))throw new Error(`duplicate-dataset: ${r.source}`);return this.catalogs.set(r.source,r),r.source}const e=new Set;return t.forEach(r=>{if(this.catalogs.has(r.source))throw new Error(`duplicate-dataset: ${r.source}`);console.log(`added ${r.source} to the workflow`),this.catalogs.set(r.source,r),e.add(r.source)}),Array.from(e)}if(this.catalogs.has(t.source))throw new Error(`duplicate-dataset: ${t.source}`);return this.catalogs.set(t.source,t),console.log(`added ${t.source} to the workflow`),t.source}query(t){const e=W(t);console.log(e)}}function G(a){return new z(a)}export{K as createCatalog,G as createWorkflow};
