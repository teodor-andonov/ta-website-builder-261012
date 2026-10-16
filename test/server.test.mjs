import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The browser imports the same ESM renderer that Node uses; exercise the real
// local server's strict static module / SVG path allowlist without mutating JSON.
test('development server serves shared ESM and demo assets but no arbitrary files', {timeout:12000}, async()=>{
  const port=41000+(process.pid%19000);
  const server=spawn(process.execPath,['src/server.mjs'],{
    cwd:fileURLToPath(new URL('..',import.meta.url)),env:{...process.env,PORT:String(port)},stdio:'ignore'
  });
  const url=`http://127.0.0.1:${port}`;
  try {
    let ready=false;
    for(let i=0;i<60;i++){
      if(server.exitCode!==null)throw new Error('Dev server terminated early');
      try {const response=await fetch(`${url}/api/data`);if(response.ok){ready=true;break;}}catch{}
      await delay(80);
    }
    assert.ok(ready,'Dev server did not start');
    const [module,css,svg,deny,missing]=await Promise.all([
      fetch(`${url}/src/render.mjs`),
      fetch(`${url}/src/public.css`),
      fetch(`${url}/assets/demo/house.svg`),
      fetch(`${url}/.env`),
      fetch(`${url}/assets/demo/unknown.svg`),
    ]);
    assert.equal(module.status,200);
    assert.match(module.headers.get('content-type'),/text\/javascript/);
    assert.match(await module.text(),/export function renderBlocks/);
    for(const name of ['model','tree-editor','editor-history','page-assembly','style-system','asset-query','asset-usage']){
      const helper=await fetch(`${url}/src/${name}.mjs`);
      assert.equal(helper.status,200,name+' is a required Studio module');
      assert.match(helper.headers.get('content-type'),/text\/javascript/);
      assert.match(await helper.text(),/export /);
    }
    assert.equal((await fetch(`${url}/src/server.mjs`)).status,404,'server source remains outside the module allowlist');
    assert.equal(css.status,200);
    assert.match(css.headers.get('content-type'),/text\/css/);
    assert.match(await css.text(),/M7 \/ Print-native Card system/);
    assert.equal(svg.status,200);
    assert.match(svg.headers.get('content-type'),/image\/svg\+xml/);
    assert.match(await svg.text(),/<svg/);
    assert.equal(deny.status,404);
    assert.equal(missing.status,404);
    assert.equal((await fetch(`${url}/api/data`)).status,200);
  }finally{
    server.kill('SIGTERM');
    if(server.exitCode===null) await Promise.race([
      new Promise(resolve=>server.once('exit',resolve)),delay(1500)
    ]);
  }
});
