import {send,authConfigured,loginValid,token,cookie,sameOrigin,valid} from '../../_lib/core.js';
export async function onRequestGet({request,env}){return send({authenticated:await valid(request,env),configured:authConfigured(env)})}
export async function onRequestPost({request,env}){
 if(!sameOrigin(request))return send({error:'Invalid request origin'},403);
 if(!authConfigured(env))return send({error:'Cloudflare admin secrets have not been configured'},503);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return send({error:'JSON required'},415);
 let body;try{body=await request.json()}catch{return send({error:'Invalid JSON'},400)}
 if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>120||body.password.length>300)return send({error:'Invalid credentials'},400);
 if(!await loginValid(body.username,body.password,env))return send({error:'Incorrect username or password'},401);
 const response=send({ok:true});response.headers.append('Set-Cookie',cookie(await token(env)));return response;
}
