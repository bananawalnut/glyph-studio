'use strict';
const fs=require('node:fs'),path=require('node:path'),D=require('../player/design-system.js'),root=path.join(__dirname,'..');
fs.copyFileSync(path.join(root,'player/design-system.js'),path.join(root,'dist/glyph-design.js'));
fs.copyFileSync(path.join(root,'player/presets.js'),path.join(root,'dist/presets.js'));
fs.writeFileSync(path.join(root,'dist/design-tokens.css'),D.css());
fs.writeFileSync(path.join(root,'dist/design-system.json'),JSON.stringify(D.catalog(),null,2)+'\n');
