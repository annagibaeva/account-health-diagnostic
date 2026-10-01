import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLinks} from './record-links.mjs';
test('source links permit HTTPS and reject executable URLs and embedded credentials',()=>{
 assert.deepEqual(parseLinks('PR | https://example.com/pr/1\njavascript:alert(1)\nhttps://secret@example.com\nnot a url'),[{label:'PR',url:'https://example.com/pr/1'}]);
});
