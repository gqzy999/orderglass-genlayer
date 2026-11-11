import fs from 'node:fs';import {createHash} from 'node:crypto';
const source=fs.readFileSync('contracts/orderglass.py');fs.writeFileSync('public/source.json',JSON.stringify({protocol:'orderglass-1',sha256:createHash('sha256').update(source).digest('hex')},null,2));fs.copyFileSync('contracts/orderglass.py','public/orderglass.py');
