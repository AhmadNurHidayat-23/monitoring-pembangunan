import {getStore} from '../../../server/db';
import {handle} from '../../../server/router';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function route(r:Request,c:{params:Promise<{path:string[]}>}){const {path}=await c.params;return handle(getStore(),r,path);}
export const GET=route;export const POST=route;export const PUT=route;export const DELETE=route;
