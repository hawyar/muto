var M=(i,t,e)=>{if(!t.has(i))throw TypeError("Cannot "+e)};var p=(i,t,e)=>{if(t.has(i))throw TypeError("Cannot add the same private member more than once");t instanceof WeakSet?t.add(i):t.set(i,e)};var y=(i,t,e)=>(M(i,t,"access private method"),e);var v=(i,t,e)=>new Promise((n,s)=>{var r=o=>{try{c(e.next(o))}catch(d){s(d)}},a=o=>{try{c(e.throw(o))}catch(d){s(d)}},c=o=>o.done?n(o.value):Promise.resolve(o.value).then(r,a);c((e=e.apply(i,t)).next())});import*as u from"fs";import*as O from"os";import{createInterface as N}from"readline";import{spawn as T}from"child_process";import{fromIni as z}from"@aws-sdk/credential-providers";import*as q from"fastq";import b from"path";import{readFileSync as g,writeFileSync as w}from"atomically";import{S3Client as x,GetObjectCommand as P,CreateMultipartUploadCommand as R}from"@aws-sdk/client-s3";var A=i=>z({profile:i,mfaCodeProvider:t=>v(void 0,null,function*(){return t})});var U=function(){let i;function t(e){return v(this,null,function*(){console.log(e)})}return{getInstance:()=>(i||(i=q.promise(t,10)),i)}}(),j=function(){let i;function t(){let e=b.join(process.cwd(),".muto-cache");return u.existsSync(e)||w(e,JSON.stringify({})),{init:new Date,path:e,get:n=>{let s=g(e),r=JSON.parse(s.toString());if(r[n]!==n)throw new Error("Cache key does not match");return r[n]},set:(n,s)=>{let r=g(e),a=JSON.parse(r.toString());return a[n]=s,w(e,JSON.stringify(a)),n},has:n=>{let s=g(e);return JSON.parse(s.toString())[n]===n},delete:n=>{let s=g(b.join(process.cwd(),".muto-cache")),r=JSON.parse(s.toString());delete r[n],w(e,JSON.stringify(r))},clear:()=>{let n=g(b.join(process.cwd(),".muto-cache"));w(e,JSON.stringify({}))},size:()=>{let n=g(e),s=JSON.parse(n.toString());return Object.keys(s).length},keys:()=>{let n=g(e),s=JSON.parse(n.toString());return Object.keys(s)}}}return{getInstance:()=>(i||(i=t()),i)}}(),C,X,D,Y,m,E,I,Z,k,ee,S,W,$=class{constructor(t){p(this,C);p(this,D);p(this,m);p(this,I);p(this,k);p(this,S);this.name=t,this.datasets=new Map,this.createdAt=new Date,this.env="local",this.queue=U.getInstance(),this.cache=j.getInstance()}list(){return Array.from(this.datasets.values())}remove(t){this.datasets.delete(t.source)}add(t,e){return new Promise((n,s)=>{this.queue.push({source:t,options:e}),console.log("added to queue, curr len: ",this.queue.length())})}checkFileSize(t){let e=1024*1024*50;if(!u.existsSync(t))throw new Error(`${t} does not exist, provide a valid path to a CSV file`);let n=u.statSync(t);return n.blocks=Math.ceil(n.size/512),u.statSync(t).size}};C=new WeakSet,X=function(t){let{data:e,err:n}=y(this,S,W).call(this,t,{file:!0});if(n||!e.file)return console.error(`Invalid S3 URI: ${t}, URI must point to a file`),!1;let s=y(this,m,E).call(this,{credentials:A("default"),region:"us-east-2"}),r=new P({Bucket:e.bucket,Key:e.file});return s.send(r).then(a=>a.$metadata.httpStatusCode===200&&a.ContentType==="text/csv").catch(a=>(console.error(a),!1)),!1},D=new WeakSet,Y=function(t){return u.createReadStream(t)},m=new WeakSet,E=function(t){return t.region||(t.region="us-east-2"),new x(t)},I=new WeakSet,Z=function(t){let e={type:"",columns:[""],header:!1,encoding:"utf-8",bom:!1,spanMultipleLines:!1,quotes:!1,delimiter:",",errors:{},warnings:{},preview:[[""]]};if(!u.existsSync(t))throw new Error(`${t} does not exist, provide a valid path to a CSV file`);if(O.platform()==="win32")return console.error("handle windows later"),e;let n=T("file",[t,"--mime-type"]);n.stdout.on("data",f=>{let l=f.toString().split(":")[1].trim();l==="text/csv"||l==="text/plain"?e.type=l:e.errors.incorrectType=`${t} is not a CSV file`}),n.on("close",f=>{(f!==0||e.type==="")&&console.warn("unable to use file() cmd")});let s=N({input:u.createReadStream(t),crlfDelay:1/0}),r=0,a=20,c={row:[""],del:""},o="",d=[",",";","	","|",":"," ","|"];return s.on("line",f=>{if(r===0){d.forEach(h=>{f.split(h).length>1&&(c.row=f.split(h),c.del=h)}),(c.del===""||c.row.length<=1)&&(e.errors.unrecognizedDelimiter=`${t} does not have a recognized delimiter`,e.header=!1);let l=/\d+/;if(c.row.some(h=>l.test(h))){e.header=!1,e.warnings.noHeader="no header found",r++;return}e.header=!0,e.delimiter=c.del,e.columns=c.row}if(r>0&&r<a){let l=f.split('"').length-1;if(o&&l%2!==0&&(e.spanMultipleLines=!0),l%2!==0&&f.split('""').length-1!==1&&(o=f),f.split(c.del).length!==c.row.length){e.errors.rowWidthMismatch="row width mismatch";return}e.preview.push(f.split(c.del))}r++}),e},k=new WeakSet,ee=function(t,e,n){return new Promise((s,r)=>{try{let a=y(this,m,E).call(this,{credentials:A("default"),region:"us-east-2"});if(!(a instanceof x))throw new Error(`Invalid operation for ${t.source}`);let c=new R({Bucket:e,ContentEncoding:"utf8",ContentType:"text/csv",Key:n});a.send(c).then(o=>{o.UploadId&&s(o.UploadId),r(new Error("noop"))}).catch(o=>{r(o)}).finally(()=>{console.log("init multipart upload")})}catch(a){r(a)}})},S=new WeakSet,W=function(t,e){let n={file:e&&e.file?e.file:!1};if(!t.startsWith("s3://")||t.split(":/")[0]!=="s3")throw new Error("Invalid S3 URI");let s="",r={bucket:"",key:"",file:""},a=t.split(":/")[1],[c,...o]=a.split("/").splice(1);return r.bucket=c,r.key=o.join("/"),o.forEach((d,f)=>{if(f===o.length-1){let l=d.split(".").length;if(n.file&&l===1&&(s=`uri should be a given, given: ${t}`),!n.file&&l===1)return;if(!n.file&&l>1){s=`Invalid S3 uri, ${t} should not end with a file name`;return}!n.file&&d.split(".")[1]!==""&&l>1&&(s=`${t} should not be a file endpoint: ${d}`),l>1&&d.split(".")[1]!==""&&(r.file=d)}}),{data:r,err:s}};function F(i){return new $(i)}export{F as createWorkflow};
//# sourceMappingURL=muto.js.map
