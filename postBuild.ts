import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';

import pkg from './package.json' with { type: 'json' };

const version = pkg.version;

export function insertVersion(singletonPath = './dist/singleton.js') {
    let content = readFileSync(singletonPath, 'utf-8');
    content = content.replace('{{ VERSION }}', version);
    writeFileSync(singletonPath, content, 'utf-8');
}

export function copyTypes(
    source = './src/types.d.ts',
    destination = './dist/types.d.ts',
) {
    copyFileSync(source, destination);
}

insertVersion();
copyTypes();
