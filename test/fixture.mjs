import readline from 'node:readline';
readline.createInterface({input:process.stdin}).on('line',line=>{const m=JSON.parse(line);const result=m.method==='tools/list'?{tools:[{name:'example',inputSchema:{type:'object',properties:{n:{anyOf:[{type:'string'},{type:'null'}]}}}}]}:{content:[{type:'text',text:'done'}]};process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result})+'\n')});
