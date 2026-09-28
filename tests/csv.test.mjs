import test from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,repliesCsv} from '../src/replies-csv.mjs';
test('CSV neutralizes formulas including leading whitespace/control characters',()=>{for(const value of ['=1+1','+SUM(A1)','-1','@SUM(A1)','  =CMD()','\t=1','\n@SUM(A1)'])assert.ok(csvCell(value).startsWith('"\''));});
test('CSV escapes delimiters and quotes while preserving ordinary names',()=>{assert.equal(csvCell('Sara, "A"'),'"Sara, ""A"""');assert.equal(csvCell('احمد'),'"احمد"');const csv=repliesCsv([{name:'Guest',attendance:'yes',partySize:2,meal:'Halal',ceremonyNames:['Nikah'],note:'private, note'}]);assert.ok(csv.includes('"private, note"'));assert.ok(csv.startsWith('\uFEFF'));});
