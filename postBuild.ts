import { readFileSync, writeFileSync } from 'node:fs';

import pkg from './package.json' with { type: 'json' };

const version = pkg.version;

const singletonPath = './dist/singleton.js';
let content = readFileSync(singletonPath, 'utf-8');

content = content.replace('{{ VERSION }}', version);

writeFileSync(singletonPath, content, 'utf-8');
