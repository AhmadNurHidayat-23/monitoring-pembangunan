import {test,expect} from 'vitest';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Store} from '../src/server/db';
import {addUser} from '../src/server/auth';
import {handle} from '../src/server/router';
import {today,days} from '../src/server/repository';
const day=(offset=0)=>new Date(Date.parse(today()+'T00:00:00Z')+offset*86400000).toISOString().slice(0,10);
const project=(extra={})=>({code:'DEMO-01',name:'Pembangunan Contoh',category_id:1,location:'Lokasi demonstrasi',budget:100000000,starts_on:day(-10),target_on:day(10),phase:'Direncanakan',note:'Proyek pengujian',...extra});
async function setup(file=':memory:'){
 const s=new Store(file),password=randomBytes(20).toString('hex');
 for(const [username,role] of [['admin','Admin'],['staff','Petugas']])addUser(s,{username,name:'Penguji '+role,role,password});
 async function request(url:string,method='GET',body?:unknown,headers:Record<string,string>={}){return handle(s,new Request('http://127.0.0.1/api/'+url,{method,headers:{'Content-Type':'application/json',...headers},body:method==='GET'?undefined:JSON.stringify(body||{})}),url.split('?')[0].split('/'));}
 async function login(username:string){const r=await request('login','POST',{username,password}),d=await r.json();return {cookie:r.headers.get('set-cookie')!.split(';')[0],'x-csrf-token':d.csrf};}
 const admin=await login('admin'),staff=await login('staff');
 const call=(url:string,method='GET',body?:unknown,headers:Record<string,string>=admin)=>request(url,method,body,headers);
 await call('categories','POST',{name:'Kategori Contoh'});await call('projects','POST',project());
 return {s,call,request,admin,staff};
}
test('CRUD kategori/proyek, arsip dan pemulihan menjaga riwayat',async()=>{const t=await setup();try{
 expect((await t.call('categories/1','PUT',{name:'Kategori Diperbarui'})).status).toBe(200);
 expect((await t.call('projects/1','PUT',project({name:'Proyek Diubah',budget:120000000}))).status).toBe(200);
 expect((await t.call('categories/1','DELETE')).status).toBe(409);
 expect((await t.call('projects/1','DELETE')).status).toBe(200);
 expect((await (await t.call('state')).json()).projects).toHaveLength(0);
 expect((await (await t.call('state?archived=1')).json()).projects).toHaveLength(1);
 expect((await t.call('projects/1/restore','POST')).status).toBe(200);
 expect((await t.call('categories','POST',{name:'Hapus uji'})).status).toBe(200);
 expect((await t.call('categories/2','DELETE')).status).toBe(200);
}finally{t.s.close();}});
test('progres hanya dari catatan, grafik terbaru menurut tanggal dan urutan',async()=>{const t=await setup();try{
 expect((await (await t.call('state')).json()).projects[0].percent).toBeNull();
 for(const [on,percent] of [[day(),60],[day(-2),10],[day(),65]])expect((await t.call('progress','POST',{project_id:1,on_date:on,percent,note:'Pekerjaan aktual uji'},t.staff)).status).toBe(200);
 const p=(await (await t.call('state')).json()).projects[0];expect(p.percent).toBe(65);expect(p.reported_on).toBe(today());
 const h=await (await t.call('projects/1/history')).json();expect(h.map((r:{percent:number})=>r.percent)).toEqual([65,60,10]);expect(h[0].actor).toBe('Penguji Petugas');
 expect((await t.call('progress/1','DELETE')).status).toBe(404);
 expect((await t.call('projects/1','PUT',project({starts_on:day(-9)}))).status).toBe(409);
}finally{t.s.close();}});
test('terlambat berasal dari target dan selesai dari laporan100',async()=>{const t=await setup();try{
 await t.call('projects/1','PUT',project({target_on:day(-2)}));
 let p=(await (await t.call('state')).json()).projects[0];expect(p.late).toBe(true);expect(p.lateDays).toBe(2);expect(days(day(-2),today())).toBe(2);
 await t.call('progress','POST',{project_id:1,on_date:today(),percent:100,note:'Selesai sesuai catatan uji'},t.staff);
 p=(await (await t.call('state')).json()).projects[0];expect(p.status).toBe('Selesai');expect(p.late).toBe(false);
 expect((await (await t.call('state?status=Selesai')).json()).projects).toHaveLength(1);
 expect((await t.call('projects/1','PUT',project({phase:'Selesai'}))).status).toBe(400);
}finally{t.s.close();}});
test('proyek dibatalkan tidak terlambat dan tidak menerima laporan',async()=>{const t=await setup();try{
 await t.call('projects/1','PUT',project({target_on:day(-1),phase:'Dibatalkan'}));
 expect((await (await t.call('state')).json()).projects[0].late).toBe(false);
 expect((await t.call('progress','POST',{project_id:1,on_date:today(),percent:10,note:'Uji'})).status).toBe(409);
 await t.call('projects/1','PUT',project());await t.call('projects/1','DELETE');
 expect((await t.call('progress','POST',{project_id:1,on_date:today(),percent:10,note:'Uji'})).status).toBe(409);
}finally{t.s.close();}});
test('rupiah bulat, rentang tanggal, FK dan batas progres divalidasi',async()=>{const t=await setup();try{
 for(const b of [{budget:0.5},{budget:-1},{budget:1e12+1},{target_on:day(-11)},{starts_on:'2026-02-30'},{category_id:999},{name:''}])expect([400,404]).toContain((await t.call('projects','POST',project(b))).status);
 for(const b of [{percent:101},{percent:-1},{percent:true},{on_date:day(1)},{on_date:day(-11)}])expect((await t.call('progress','POST',{project_id:1,on_date:today(),percent:50,note:'Uji',...b})).status).toBe(400);
 expect(t.s.get<{n:number}>('SELECT COUNT(*) n FROM progress')!.n).toBe(0);
}finally{t.s.close();}});
test('filter dan CSV berdasarkan data aktual serta tidak mengarang progres nol',async()=>{const t=await setup();try{
 expect((await (await t.call('state?q=pembangunan&category_id=1&status=Direncanakan')).json()).projects).toHaveLength(1);
 expect((await (await t.call('state?q=tidakada')).json()).projects).toHaveLength(0);
 expect((await (await t.call('state?late=1')).json()).projects).toHaveLength(0);
 const r=await t.call('export');expect(r.headers.get('content-disposition')).toContain('.csv');expect(await r.text()).toContain('"Direncanakan","","","0"');
 expect((await (await t.call('state')).json()).summary.budget).toBe(100000000);
}finally{t.s.close();}});
test('akses, CSRF, origin, cookie terpisah dan peran terbaru',async()=>{const t=await setup();try{
 expect((await t.request('state')).status).toBe(401);
 expect((await t.call('projects/1','PUT',project(),t.staff)).status).toBe(403);
 expect((await t.request('progress','POST',{},{cookie:t.admin.cookie})).status).toBe(403);
 expect((await t.call('progress','POST',{},{...t.admin,origin:'https://example.invalid'})).status).toBe(403);
 expect((await t.request('state','GET',undefined,{cookie:t.admin.cookie.replace('monitoring_pembangunan_session','app_session')})).status).toBe(401);
 t.s.run("UPDATE users SET role='Petugas' WHERE username='admin'");expect((await t.call('categories','POST',{name:'Tidak boleh'})).status).toBe(403);
 await t.call('logout','POST');expect((await t.call('state')).status).toBe(401);
}finally{t.s.close();}});
test('login dibatasi, sesi kedaluwarsa dan payload invalid ditolak',async()=>{const t=await setup();try{
 for(let i=0;i<6;i++)expect((await t.request('login','POST',{username:'absent',password:'salah'})).status).toBe(401);
 expect((await t.request('login','POST',{username:'absent',password:'salah'})).status).toBe(429);
 t.s.run('UPDATE sessions SET expires=0');expect((await t.call('state')).status).toBe(401);
 const r=new Request('http://127.0.0.1/api/login',{method:'POST',headers:{'content-type':'application/json'},body:'[]'});expect((await handle(t.s,r,['login'])).status).toBe(400);
}finally{t.s.close();}});
test('penyimpanan persisten, inisialisasi ulang dan integritas SQLite',async()=>{const folder=fs.mkdtempSync(path.join(os.tmpdir(),'pembangunan-test-')),file=path.join(folder,'test.sqlite'),t=await setup(file);await t.call('progress','POST',{project_id:1,on_date:today(),percent:25,note:'Tersimpan'});t.s.close();const s=new Store(file);try{expect(s.get<{n:number}>('SELECT COUNT(*) n FROM progress')!.n).toBe(1);expect(s.get<{integrity_check:string}>('PRAGMA integrity_check')!.integrity_check).toBe('ok');expect(s.all('PRAGMA foreign_key_check')).toEqual([]);}finally{s.close();expect(path.dirname(path.resolve(folder))).toBe(path.resolve(os.tmpdir()));expect(path.basename(folder).startsWith('pembangunan-test-')).toBe(true);fs.rmSync(folder,{recursive:true});}});
