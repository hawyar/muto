var R=(l,e,t)=>{if(!e.has(l))throw TypeError("Cannot "+t)};var p=(l,e,t)=>{if(e.has(l))throw TypeError("Cannot add the same private member more than once");e instanceof WeakSet?e.add(l):e.set(l,t)};var h=(l,e,t)=>(R(l,e,"access private method"),t);var x=(l,e,t)=>new Promise((r,a)=>{var n=s=>{try{i(t.next(s))}catch(c){a(c)}},o=s=>{try{i(t.throw(s))}catch(c){a(c)}},i=s=>s.done?r(s.value):Promise.resolve(s.value).then(n,o);i((t=t.apply(l,e)).next())});import*as u from"fs";import*as k from"os";import{createInterface as U}from"readline";import{spawn as A}from"child_process";import{fromIni as O}from"@aws-sdk/credential-providers";import{S3Client as E,GetObjectCommand as P,CreateMultipartUploadCommand as H}from"@aws-sdk/client-s3";var D=l=>O({profile:l,mfaCodeProvider:e=>x(void 0,null,function*(){return e})}),w,M,y,L,S,z,m,b,C,J,I,N,$,X,v,V,W=class{constructor(e){p(this,w);p(this,y);p(this,S);p(this,m);p(this,C);p(this,I);p(this,$);p(this,v);this.name=e,this.datasets=new Map,this.createdAt=new Date,this.env="local"}list(){return Array.from(this.datasets.values())}remove(e){this.datasets.delete(e.source)}add(e,t){return new Promise((r,a)=>{if(this.datasets.has(e)&&a(new Error(`Dataset ${t.destination} already exists in the workflow`).message),t.destination===""&&console.warn(`Dataset ${e} does not have a destination`),t.destination&&t.destination.startsWith("s3://")){if(h(this,y,L).call(this,e)){let o=h(this,m,b).call(this,{credentials:D("default"),region:"us-east-2"}),i=h(this,w,M).call(this,e,t,o);this.datasets.set(e,i),r(i)}a(new Error(`Dataset ${e} does not exist in S3`))}if(e.startsWith("/")||e.startsWith("../")||e.startsWith("./")){e.endsWith(".csv")||a(new Error(`${e} is not a CSV file`));let n=h(this,w,M).call(this,e,t,h(this,S,z).call(this,e));this.datasets.set(e,n),r(n)}a(new Error(`Invalid source ${e} type`))})}};w=new WeakSet,M=function(e,t,r){return{source:e,options:t,createdAt:new Date,connector:r}},y=new WeakSet,L=function(e){let{data:t,err:r}=h(this,v,V).call(this,e,{file:!0});if(r||!t.file)return console.error(`Invalid S3 URI: ${e}, URI must point to a file`),!1;let a=h(this,m,b).call(this,{credentials:D("default"),region:"us-east-2"}),n=new P({Bucket:t.bucket,Key:t.file});return a.send(n).then(o=>o.$metadata.httpStatusCode===200&&o.ContentType==="text/csv").catch(o=>(console.error(o),!1)),!1},S=new WeakSet,z=function(e){return u.createReadStream(e)},m=new WeakSet,b=function(e){return e.region||(e.region="us-east-2"),new E(e)},C=new WeakSet,J=function(e){let t={type:"",columns:[""],header:!1,encoding:"utf-8",bom:!1,spanMultipleLines:!1,quotes:!1,delimiter:",",errors:{},warnings:{},preview:[[""]]};if(!u.existsSync(e.source))throw new Error(`${e.source} does not exist, provide a valid path to a CSV file`);if(k.platform()==="win32")return console.error("handle windows later"),t;let r=A("file",[e.source,"--mime-type"]);r.stdout.on("data",f=>{let d=f.toString().split(":")[1].trim();d==="text/csv"||d==="text/plain"?t.type=d:t.errors.incorrectType=`${e.source} is not a CSV file`}),r.on("close",f=>{(f!==0||t.type==="")&&console.warn("unable to use file() cmd")});let a=U({input:u.createReadStream(e.source),crlfDelay:1/0}),n=0,o=20,i={row:[""],del:""},s="",c=[",",";","	","|",":"," ","|"];return a.on("line",f=>{if(n===0){c.forEach(g=>{f.split(g).length>1&&(i.row=f.split(g),i.del=g)}),(i.del===""||i.row.length<=1)&&(t.errors.unrecognizedDelimiter=`${e.source} does not have a recognized delimiter`,t.header=!1);let d=/\d+/;if(i.row.some(g=>d.test(g))){t.header=!1,t.warnings.noHeader="no header found",n++;return}t.header=!0,t.delimiter=i.del,t.columns=i.row}if(n>0&&n<o){let d=f.split('"').length-1;if(s&&d%2!==0&&(t.spanMultipleLines=!0),d%2!==0&&f.split('""').length-1!==1&&(s=f),f.split(i.del).length!==i.row.length){t.errors.rowWidthMismatch="row width mismatch";return}t.preview.push(f.split(i.del))}n++}),t},I=new WeakSet,N=function(e){let t=e.connector},$=new WeakSet,X=function(e,t,r){return new Promise((a,n)=>{try{let o=h(this,m,b).call(this,{credentials:D("default"),region:"us-east-2"});if(!(o instanceof E))throw new Error(`Invalid operation for ${e.source}`);let i=new H({Bucket:t,ContentEncoding:"utf8",ContentType:"text/csv",Key:r});o.send(i).then(s=>{s.UploadId&&a(s.UploadId),n(new Error("noop"))}).catch(s=>{n(s)}).finally(()=>{console.log("init multipart upload")})}catch(o){n(o)}})},v=new WeakSet,V=function(e,t){let r={file:t&&t.file?t.file:!1};if(!e.startsWith("s3://")||e.split(":/")[0]!=="s3")throw new Error("Invalid S3 URI");let a="",n={bucket:"",key:"",file:""},o=e.split(":/")[1],[i,...s]=o.split("/").splice(1);return n.bucket=i,n.key=s.join("/"),s.forEach((c,f)=>{if(f===s.length-1){let d=c.split(".").length;if(r.file&&d===1&&(a=`uri should be a given, given: ${e}`),!r.file&&d===1)return;if(!r.file&&d>1){a=`Invalid S3 uri, ${e} should not end with a file name`;return}!r.file&&c.split(".")[1]!==""&&d>1&&(a=`${e} should not be a file endpoint: ${c}`),d>1&&c.split(".")[1]!==""&&(n.file=c)}}),{data:n,err:a}};function q(l){return new W(l)}export{q as createWorkflow};
//# sourceMappingURL=muto.ts.map
