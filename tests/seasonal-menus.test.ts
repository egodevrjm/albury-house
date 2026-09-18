import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {getMenuForDate,getMenuRange,listSpecialMenus} from '../lib/albury-data.js';

test('All seasons and both cycles have three meals, with exact browser/MCP parity',async()=>{
 const context:any={URLSearchParams,location:{search:''}}; context.window=context;
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('site/csv.js','utf8'),context);
 context.ALBURY_CONTENT={'special-menus':JSON.parse(fs.readFileSync('site/data/public/special-menus.json','utf8'))};
 context.AlburyCSV.load=async()=>({text:fs.readFileSync('site/data/menus.csv','utf8'),source:'test'});
 vm.runInContext(fs.readFileSync('site/menu-rotation.js','utf8'),context);
 await context.AlburyMenus.ready;
 assert.equal(context.AlburyMenus.rows.length,168);
 for(const month of ['01','02','03','04','05','06','07','08','09','10','11','12']) {
  for(let day=1;day<=14;day++) {
   const date=`2026-${month}-${String(day).padStart(2,'0')}`;
   const server=getMenuForDate(date), browser=context.AlburyMenus.forDate(date);
   assert.equal(server.meals.length,3);
   assert.equal(server.season,browser.season);
   assert.deepEqual(JSON.parse(JSON.stringify(browser.rows)),server.meals);
  }
 }
 for(const [date,a,b] of [['2026-02-28','winter','spring'],['2026-05-31','spring','summer'],['2025-08-31','summer','autumn'],['2025-11-30','autumn','winter']]) {
  const range=getMenuRange(date,2); assert.deepEqual(range.menus.map(m=>m.season),[a,b]);
 }
 assert.equal(getMenuForDate('2024-02-29').season,'winter');
 const week=context.AlburyMenus.week('2026-06-01');
 assert.equal(week[0][1],getMenuForDate('2026-06-01').theme);
 const cross=context.AlburyMenus.week('2026-03-01');
 assert.equal(cross[0][1],getMenuForDate('2026-02-23').theme);
 assert.equal(cross[6][1],getMenuForDate('2026-03-01').theme);
 for(const special of listSpecialMenus()) {
  const date='2025-12-25',regular=getMenuForDate(date),selected=getMenuForDate(date,special.id);
  assert.equal(selected.meals.length,3);
  for(let i=0;i<3;i++) if(regular.meals[i].meal!==special.meal)assert.deepEqual(selected.meals[i],regular.meals[i]);
  assert.equal(selected.meals.find(m=>m.meal===special.meal)?.main,special.menu.main);
 }
 assert.throws(()=>getMenuForDate('2025-12-25','unknown'));
 assert.equal(getMenuForDate('2025-12-25').specialMenu,null);
});
