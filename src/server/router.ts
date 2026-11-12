import type {Store} from './db.ts';
import {session,guard,login,payload,errorResponse,AccessError} from './auth.ts';
import {integer,csv} from './validate.ts';
import {state,history} from './repository.ts';
import * as service from './service.ts';
export async function handle(s:Store,r:Request,path:string[]){try{const [kind,rawId,action]=path,method=r.method,params=new URL(r.url).searchParams;if(path.length>3)throw new AccessError('Alamat tidak tersedia.',404);
 if(kind==='session'&&method==='GET'){const u=session(s,r);return Response.json({user:u?{id:u.id,name:u.name,username:u.username,role:u.role}:null,csrf:u?.csrf,configured:!!s.get('SELECT id FROM users LIMIT 1')},{headers:{'Cache-Control':'no-store'}});}
 if(method==='GET'){guard(s,r);if(kind==='state'&&path.length===1)return Response.json(state(s,params));if(kind==='projects'&&action==='history'){const id=integer(rawId,'ID',1);service.find(s,'projects',id);return Response.json(history(s,id));}if(kind==='export'){const d=state(s,params);return new Response(csv([['Kode','Proyek','Kategori','Lokasi','Anggaran rupiah','Mulai','Target','Status','Progres tercatat %','Tanggal laporan','Hari terlambat'],...d.projects.map(p=>[p.code,p.name,p.category,p.location,p.budget,p.starts_on,p.target_on,p.status,p.percent??'',p.reported_on||'',p.lateDays])]),{headers:{'Content-Type':'text/csv;charset=utf-8','Content-Disposition':'attachment; filename=realisasi-pembangunan.csv'}});}throw new AccessError('Alamat tidak tersedia.',404);}
 const b=await payload(r);if(kind==='login'&&method==='POST'&&path.length===1)return login(s,r,b);const u=guard(s,r,kind==='progress'||kind==='logout'?['Admin','Petugas']:['Admin']);
 if(kind==='logout'&&method==='POST'){s.run('DELETE FROM sessions WHERE token=?',u.token);return Response.json({message:'Anda telah keluar.'},{headers:{'Set-Cookie':'monitoring_pembangunan_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'}});}
 if(kind==='progress'&&method==='POST'&&path.length===1)service.record(s,b,u.id);
 else if(['projects','categories'].includes(kind)){const id=rawId?integer(rawId,'ID',1):0;if(action==='restore'&&kind==='projects'&&method==='POST')service.restore(s,id);else if(!action&&method==='DELETE'&&id)service.remove(s,kind,id);else if(!action&&(method==='POST'&&!id||method==='PUT'&&id)){if(kind==='projects')service.project(s,b,id);else service.category(s,b,id);}else throw new AccessError('Tindakan tidak tersedia.',405);}
 else throw new AccessError('Alamat tidak tersedia.',404);return Response.json({message:'Catatan pembangunan disimpan.'});
 }catch(e){return errorResponse(e);}}
