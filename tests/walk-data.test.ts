import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

type Shape = {id: string | null; parentId?: string; x:number;y:number;width:number;height:number;children?:Shape[]};
type Section = {id:string;arrival:string;viewBox:number[];rooms:Shape[];references?:string[]};
const load = (name:string) => JSON.parse(readFileSync(new URL(`../site/data/public/${name}.json`,import.meta.url),'utf8'));
const maps:Section[] = load('walk').sections;
const catalogue = load('rooms').tour as {id:string;kind:string;rooms:{roomId:string;path:string}[]}[];
const flatten = (rooms:Shape[]):Shape[] => rooms.flatMap(r=>[r,...flatten(r.children||[])]);

test('walk maps cover every current room once and keep historical/proposal views separate',()=>{
  assert.equal(maps.length,8);
  let current=0;
  for(const section of catalogue){
    const map=maps.find(m=>m.id===section.id)!;
    assert.ok(map,section.id);
    const mapped=flatten(map.rooms).filter(r=>r.id).map(r=>r.id as string);
    assert.equal(new Set(mapped).size,mapped.length,section.id);
    assert.ok(mapped.includes(map.arrival));
    const all=[...mapped,...(map.references||[])];
    assert.deepEqual(all.sort(),[...new Set(section.rooms.map(r=>r.roomId))].sort());
    assert.equal(new Set(all).size,all.length);
    current+=mapped.length;
  }
  assert.equal(current,96);
  assert.deepEqual(maps.find(m=>m.id==='exterior')!.references,[
    'existing-site-before-landscape-works','the-cedars-future-landscape-proposal'
  ]);
});

test('nested spaces stay inside their parent and the studio void remains unwalkable',()=>{
  for(const map of maps){
    assert.ok(map.viewBox.every(Number.isFinite));
    for(const parent of flatten(map.rooms)){
      assert.ok([parent.x,parent.y,parent.width,parent.height].every(Number.isFinite));
      assert.ok(parent.width>0 && parent.height>0);
      for(const child of parent.children||[]){
        assert.equal(child.parentId,parent.id);
        assert.ok(child.x>=parent.x && child.y>=parent.y);
        assert.ok(child.x+child.width<=parent.x+parent.width);
        assert.ok(child.y+child.height<=parent.y+parent.height);
      }
    }
  }
  const studio=maps.find(m=>m.id==='music-nobile')!;
  const live=studio.rooms.find(r=>r.id==='live-tracking-room')!;
  assert.deepEqual(live.children!.map(r=>r.id),['vocal-booth','instrument-isolation-booth']);
  const guestFloor=maps.find(m=>m.id==='second-floor')!;
  assert.equal(guestFloor.rooms.filter(r=>r.id===null).length,1);
  assert.ok(!flatten(guestFloor.rooms).some(r=>r.id==='live-tracking-room'));
});

test('room keys retain floor identity and every linked photograph exists in the deployment',()=>{
  const keys=maps.flatMap(m=>flatten(m.rooms).filter(r=>r.id).map(r=>`${m.id}/${r.id}`));
  assert.equal(new Set(keys).size,keys.length);
  assert.ok(keys.includes('raised-ground/rear-service-landing'));
  assert.ok(keys.includes('second-floor/rear-service-landing'));
  for(const section of catalogue)for(const room of section.rooms){
    assert.ok(existsSync(new URL(`../${room.path}`,import.meta.url)),room.path);
  }
});
