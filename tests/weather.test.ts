import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getForecast, getDateContext } from '../lib/albury-data.js';

test('weather covers 396 consecutive dates and retains every supplied CSV value',()=>{
  // This supplied CSV contains no quoted commas; assert that before splitting.
  const csv=readFileSync(new URL('../site/data/weather.csv',import.meta.url),'utf8').trim();
  assert.ok(!csv.includes('"'));
  const lines=csv.split(/\r?\n/);
  assert.equal(lines.shift(),'Date,Day,Condition,High_C,Low_C,High_F,Low_F,Precip_mm,Precip_Chance_pct,Wind_mph');
  assert.equal(lines.length,396);
  lines.forEach((line,index)=>{
    const [date,day,condition,...values]=line.split(',');
    assert.equal(date,new Date(Date.UTC(2025,7,1+index)).toISOString().slice(0,10));
    const result=getForecast(date);
    assert.equal(result.day,day);assert.equal(result.condition,condition);
    assert.deepEqual([result.highC,result.lowC,result.highF,result.lowF,result.precipitationMm,result.precipitationChancePct,result.windMph],values.map(Number));
    assert.deepEqual(result.coverage,{start:'2025-08-01',end:'2026-08-31'});
  });
});

test('forecast validates real dates and does not fabricate beyond coverage',()=>{
  for(const date of ['2025-8-11','2025-02-29','2026-02-30','not-a-date'])assert.throws(()=>getForecast(date));
  for(const date of ['2025-07-31','2026-09-01'])assert.throws(()=>getForecast(date),/Available dates: 2025-08-01 through 2026-08-31/);
  assert.equal(getForecast('2025-08-17').precipitationMm,14.2);
  assert.equal(getForecast('2026-07-12').highC,30.8);
});

test('date context includes covered weather without breaking other-date menus',()=>{
  assert.deepEqual(getDateContext('2025-08-11').weather,getForecast('2025-08-11'));
  const outside=getDateContext('2026-09-01');
  assert.equal(outside.weather,null);
  assert.equal(outside.menu.date,'2026-09-01');
});
