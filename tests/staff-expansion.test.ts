import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {getStaffMember,listStaff} from '../lib/albury-data.js';
test('The 48 permanent staff form nine departments and twelve distinct new colleagues',()=>{
 const staff=JSON.parse(fs.readFileSync('site/data/public/staff.json','utf8'));
 const permanent=staff.people.filter((p:any)=>p.employmentType==='permanent');
 assert.equal(permanent.length,48);
 assert.equal(new Set(staff.people.map((p:any)=>p.id)).size,53);
 const counts:Record<string,number>={};for(const p of permanent)counts[p.department]=(counts[p.department]||0)+1;
 assert.deepEqual(Object.values(counts).sort((a,b)=>a-b),[2,2,2,3,5,7,8,9,10]);
 for(const id of ['jamie-fletcher','peter-collins','kerry-saunders','ana-ribeiro','susan-parker','daniel-moss','rebecca-ellis','michael-osei','paul-abbott','farah-hussain','stephen-doyle','hannah-webb']){const p=permanent.find((p:any)=>p.id===id);assert.ok(p);assert.ok(p.career.length>100);assert.ok(p.remit);assert.ok(p.ageAtStoryOpen);}
 assert.equal(listStaff({department:'Kitchen',employmentType:'permanent'}).total,9);
 assert.equal(getStaffMember('jamie-fletcher')?.ageAtStoryOpen,26);
 assert.match(String(getStaffMember('jamie-fletcher')?.career),/apprenticeship/);
 assert.match(String(getStaffMember('tolly-venn')?.career),/River Cafe/);
 const culinary=JSON.parse(fs.readFileSync('site/data/public/culinary.json','utf8'));
 assert.equal(new Set(culinary.serviceRoster).size,culinary.serviceRoster.length);
 for(const id of culinary.serviceRoster)assert.ok(getStaffMember(id));
});
