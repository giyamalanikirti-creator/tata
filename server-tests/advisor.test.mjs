import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/advisor.mjs';
function response() { return { statusCode: 200, headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.statusCode=code; return this; }, json(data) { this.data=data; return this; } }; }
const body = { mode: 'planning', facts: { farm: { acres: 2, crops: 'Wheat', water: 'Shared borewell', name: 'Private name' }, goal: 'water', upfrontBudget: 10000, selectedAsset: 'drip', options: [{ asset: 'drip', quantity: 2, cost: 105000, subsidy: 57750, upfront: 7100, annualInstalment: 12000 }], workflow: [] } };
test('API validates requests, handles configuration and upstream failures, and strips personal fields', async () => {
  const oldKey = process.env.AI_API_KEY; const oldFetch = globalThis.fetch;
  try {
    let res = response(); await handler({method:'GET'},res); assert.equal(res.statusCode,405);
    res = response(); await handler({method:'POST',body:{mode:'unknown'}},res); assert.equal(res.statusCode,400);
    res = response(); await handler({method:'POST',body:{...body,facts:{...body.facts,options:[null]}}},res); assert.equal(res.statusCode,400);
    delete process.env.AI_API_KEY;
    res = response(); await handler({method:'POST',body},res); assert.equal(res.statusCode,503);
    process.env.AI_API_KEY='test-key';
    let payload;
    globalThis.fetch=async (url, args) => { payload=JSON.parse(args.body); return {ok:true,json:async()=>({choices:[{message:{content:'Confirm water supply before investing.'}}]})}; };
    res=response(); await handler({method:'POST',body},res); assert.equal(res.statusCode,200); assert.equal(res.data.source,'ai'); assert.ok(!JSON.stringify(payload).includes('Private name'));
    globalThis.fetch=async()=>({ok:false}); res=response(); await handler({method:'POST',body},res); assert.equal(res.statusCode,502); assert.ok(!JSON.stringify(res.data).includes('test-key'));
  } finally { globalThis.fetch=oldFetch; if(oldKey===undefined) delete process.env.AI_API_KEY; else process.env.AI_API_KEY=oldKey; }
});
