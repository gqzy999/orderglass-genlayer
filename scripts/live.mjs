import fs from 'node:fs';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';import {gzipSync} from 'node:zlib';
import {createAccount,createClient,generatePrivateKey,abi} from 'genlayer-js';import {studionet} from 'genlayer-js/chains';import {installTransport,finalized,succeeded,leader} from '../src/transport.js';import {canonical,assertProof} from '../src/proof.js';
installTransport();const checkpoint='.private/live.json';fs.mkdirSync('.private',{recursive:true,mode:0o700});const json=x=>JSON.stringify(x,(_,v)=>typeof v==='bigint'?v.toString():v,2);const sha=x=>createHash('sha256').update(x).digest('hex');const source=fs.readFileSync('contracts/orderglass.py','utf8');
const s=fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint)):{key:generatePrivateKey(),steps:{},records:{},sourceSha256:sha(source)};assert.equal(s.sourceSha256,sha(source),'Frozen source changed');if(s.complete)throw Error('This live run is complete. Use scripts/read.mjs; do not repeat transactions.');
const account=createAccount(s.key),client=createClient({chain:studionet,account});s.owner=account.address.toLowerCase();
function save(){fs.writeFileSync(checkpoint,json(s),{mode:0o600});const {key,...publicData}=s;fs.writeFileSync('evidence/live.json',json({...publicData,network:{chainId:61999,rpc:'https://studio.genlayer.com/api'},fixture:'Synthetic abstract configuration, not observed infrastructure. One disposable SDK signer controlled by the test operator. Zero-value, zero gas price.'}));}
async function read(id,c=client){return JSON.parse(await c.readContract({address:s.address,functionName:'get_case',args:[s.owner,id],transactionHashVariant:'latest-final'}));}
async function step(label,method,args=[],guard='',id=''){
 let p=s.steps[label];if(p?.done)return p;
 if(!p){assert.equal(Number(await client.getChainId()),61999);assert.equal(BigInt(await client.request({method:'eth_gasPrice',params:[]})),0n);p=s.steps[label]={method,args,guard,before:guard?await read(id):null,sendStarted:true};save();
 p.hash=method==='deploy'?await client.deployContract({code:source,args:[],leaderOnly:false}):await client.writeContract({address:s.address,functionName:method,args,value:0n,leaderOnly:false});assert.equal(typeof p.hash,'string');save();console.log(label,p.hash);}
 assert(p.hash,'Ambiguous previous send; inspect manually, never resend automatically.');let tx;
 for(let i=0;i<180;i++){try{tx=await client.getTransaction({hash:p.hash});}catch(e){console.log(label,'receipt transport retry',e.message.slice(0,100));continue;}if(finalized(tx))break;if([8,'CANCELED','UNDETERMINED','LEADER_TIMEOUT','VALIDATORS_TIMEOUT'].includes(tx?.status)){p.receipt=tx;save();throw Error('Unsuccessful consensus '+label);}await new Promise(r=>setTimeout(r,4000));}
 assert(finalized(tx),'Known transaction still pending; resume saved hash only.');p.receipt=tx;save();assert.equal(tx.from_address.toLowerCase(),s.owner);
 if(method!=='deploy'){assert.equal(tx.to_address.toLowerCase(),s.address);const b=typeof tx.data.calldata==='string'?tx.data.calldata:tx.data.calldata.base64;const d=abi.calldata.decode(Uint8Array.from(Buffer.from(b,'base64')));assert.equal(d.get('method'),method);assert.equal(canonical((d.get('args')||[]).map(x=>typeof x==='bigint'?Number(x):x)),canonical(args));}
 if(guard){assert.equal(leader(tx)?.execution_result,'ERROR');p.after=await read(id);assert.equal(canonical(p.before),canonical(p.after));}else assert(succeeded(tx),'Consensus/execution failed '+label);
 if(method==='deploy'){s.address=tx.data.contract_address.toLowerCase();save();assert.equal(await client.getContractCode(s.address),source);assert.equal(await client.readContract({address:s.address,functionName:'get_protocol',args:[],transactionHashVariant:'latest-final'}),'orderglass-1');}
 p.done=true;save();console.log(label,'FINALIZED',guard?'ERROR / unchanged':'SUCCESS');return p;
}
if(!s.schema){s.schema=await client.getContractSchemaForCode(source);save();console.log('Studio schema compiled');}
await step('01-deploy','deploy');
for(const [id,file,want] of [['sensitive','order-sensitive','ORDER_SENSITIVE'],['independent','commuting','COMMUTES'],['incomplete','unclear','REVIEW']]){
 await step(id+'-open','open_case',[id,JSON.stringify(JSON.parse(fs.readFileSync('examples/'+file+'.json')))]);
 await step(id+'-compare','compare',[s.owner,id]);const r=await read(id);assertProof(r);assert.equal(r.state,want);s.records[id]=r;save();
}
await step('blocked-sensitive-rehearsal','rehearse',['sensitive',s.records.sensitive.certificate,2,'AB'],'NOT_COMMUTING','sensitive');
await step('blocked-stale-certificate','rehearse',['independent','0'.repeat(64),2,'AB'],'STALE_CERTIFICATE','independent');
await step('independent-rehearsal','rehearse',['independent',s.records.independent.certificate,2,'BA']);
s.records.independent=await read('independent');assert.equal(s.records.independent.state,'REHEARSED');assert.equal(s.records.independent.rehearsal.end,'1');
const fresh=createClient({chain:studionet});s.independentReadback=[];for(const id of ['sensitive','independent','incomplete']){const r=await read(id,fresh);assert.equal(canonical(r),canonical(s.records[id]));s.independentReadback.push(r);}s.complete=true;save();
const deployment={chainId:61999,rpc:'https://studio.genlayer.com/api',protocol:'orderglass-1',address:s.address,owner:s.owner,sourceSha256:s.sourceSha256,transaction:s.steps['01-deploy'].hash,ids:['sensitive','independent','incomplete']};fs.writeFileSync('public/deployment.json',json(deployment));fs.writeFileSync('evidence/deployment.json',json(deployment));
fs.writeFileSync('evidence/receipts.json.gz',gzipSync(json(Object.fromEntries(Object.entries(s.steps).map(([k,v])=>[k,v.receipt])))));
const {key,...pub}=s;pub.steps=Object.fromEntries(Object.entries(s.steps).map(([k,v])=>{const {receipt,...p}=v;return [k,{...p,receipt:{status:receipt.status,result:receipt.result,hash:receipt.hash,from_address:receipt.from_address,to_address:receipt.to_address,execution_result:leader(receipt)?.execution_result}}]}));fs.writeFileSync('evidence/live.json',json({...pub,network:{chainId:61999,rpc:'https://studio.genlayer.com/api'},fixture:'Synthetic abstract configuration. One disposable SDK signer. Zero-value, zero gas price. Complete raw receipts archived separately.'}));
console.log('COMPLETE',s.address);
