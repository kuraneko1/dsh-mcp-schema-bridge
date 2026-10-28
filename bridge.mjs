#!/usr/bin/env node
import { spawn } from 'node:child_process';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

// Rewriting is safe only when JSON types cannot overlap.
export function adaptSchema(value, warnings = [], path = '$') {
  if (Array.isArray(value)) return value.map((v,i) => adaptSchema(v, warnings, `${path}[${i}]`));
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).map(([k,v]) => [k, adaptSchema(v, warnings, `${path}.${k}`)]));
  if (Array.isArray(result.anyOf)) {
    const types = result.anyOf.map(branch => branch && branch.type);
    const allowed = new Set(['object','array','string','number','integer','boolean','null']);
    const disjoint = types.length >= 2 && types.every(type => allowed.has(type)) && new Set(types).size === types.length && !(types.includes('number') && types.includes('integer'));
    // Sibling assertions would be rejected alongside oneOf by the DSH schema subset.
    const siblings = Object.keys(result).filter(k => k !== 'anyOf');
    const annotations = new Set(['title','description','default','examples','deprecated','$comment']);
    if (disjoint && !Object.hasOwn(result,'oneOf') && siblings.every(k => annotations.has(k))) {
      result.oneOf = result.anyOf; delete result.anyOf;
    } else warnings.push(`${path}: anyOf not safely convertible`);
  }
  if (Array.isArray(result.type)) {
    const types=result.type; const allowed=new Set(['object','array','string','number','integer','boolean','null']);
    const annotations=new Set(['title','description','default','examples','deprecated','$comment']);
    const siblings=Object.keys(result).filter(k=>k!=='type');
    if(types.length>=2 && types.every(t=>allowed.has(t)) && new Set(types).size===types.length && !(types.includes('number')&&types.includes('integer')) && siblings.every(k=>annotations.has(k))) {
      result.oneOf=types.map(type=>({type})); delete result.type;
    } else warnings.push(`${path}: type array not safely convertible`);
  }
  return result;
}
function key(id) { return `${typeof id}:${JSON.stringify(id)}`; }
export function run(command, args) {
  const child=spawn(command,args,{stdio:['pipe','pipe','inherit'],shell:false});
  const pending=new Set();
  const input=readline.createInterface({input:process.stdin,crlfDelay:Infinity});
  const output=readline.createInterface({input:child.stdout,crlfDelay:Infinity});
  let exiting=false;
  const warn = msg => process.stderr.write(`dsh-mcp-schema-bridge: ${msg}\n`);
  function stop(){ if(exiting)return; exiting=true; if(!child.killed)child.kill('SIGTERM'); }
  input.on('line',line=>{
    try {const m=JSON.parse(line); for(const x of Array.isArray(m)?m:[m]) if(x?.method==='tools/list' && Object.hasOwn(x,'id'))pending.add(key(x.id));}
    catch {warn('non-JSON request forwarded unchanged');}
    if(child.stdin.writable)child.stdin.write(line+'\n');
  });
  output.on('line',line=>{
    try {
      const parsed=JSON.parse(line);
      const adaptMessage=m=>{
        if(!m || !Object.hasOwn(m,'id') || !pending.delete(key(m.id)) || !Array.isArray(m.result?.tools))return m;
        return {...m,result:{...m.result,tools:m.result.tools.map(t=>{
          if(!t.inputSchema)return t;
          const warnings=[];const inputSchema=adaptSchema(t.inputSchema,warnings,`tool ${t.name}`);
          for(const warning of warnings)warn(warning);
          return {...t,inputSchema};
        })}};
      };
      process.stdout.write(JSON.stringify(Array.isArray(parsed)?parsed.map(adaptMessage):adaptMessage(parsed))+'\n');
    } catch {warn('non-JSON server output forwarded unchanged');process.stdout.write(line+'\n');}
  });
  child.on('error',e=>{warn(`could not start server: ${e.message}`);process.exitCode=1;input.close();});
  child.on('exit',(code,signal)=>{process.exitCode=signal?1:(code??1);input.close();});
  input.on('close',stop);process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let args=process.argv.slice(2);if(args[0]==='--')args=args.slice(1);
  if(!args.length){process.stderr.write('Usage: node bridge.mjs -- <server-command> [args...]\n');process.exitCode=2;}
  else run(args[0],args.slice(1));
}
