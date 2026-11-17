const te = new TextEncoder();
export const send=(obj,status=200)=>new Response(JSON.stringify(obj),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const from64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const compare=(a,b)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a[i]^b[i];return n===0};
const sha=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(String(s))));
const mac=async(secret,text)=>{let k=await crypto.subtle.importKey('raw',te.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',k,te.encode(text)))};
export const authConfigured=env=>!!(env.ADMIN_USERNAME&&env.ADMIN_PASSWORD&&env.ADMIN_SESSION_SECRET?.length>=32);
export async function loginValid(name,pass,env){if(!authConfigured(env))return false;return compare(await sha(name),await sha(env.ADMIN_USERNAME))&&compare(await sha(pass),await sha(env.ADMIN_PASSWORD))}
const COOKIE='rs_backstage';
export async function token(env){const now=Date.now();const payload=b64(te.encode(JSON.stringify({v:1,u:env.ADMIN_USERNAME,iat:now,exp:now+43200000})));return payload+'.'+b64(await mac(env.ADMIN_SESSION_SECRET,payload))}
export const cookie=value=>`${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
export const clearCookie=()=>`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export async function valid(req,env){if(!authConfigured(env))return false;try{const raw=(req.headers.get('Cookie')||'').split(';').map(s=>s.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';const [a,b]=raw.split('.');if(!a||!b||!compare(from64(b),await mac(env.ADMIN_SESSION_SECRET,a)))return false;const p=JSON.parse(new TextDecoder().decode(from64(a)));return p.v===1&&p.u===env.ADMIN_USERNAME&&p.iat<=Date.now()&&p.exp>Date.now()}catch{return false}}
export const sameOrigin=req=>{const origin=req.headers.get('Origin');return origin===new URL(req.url).origin};
export async function protectedRequest(ctx){if(!await valid(ctx.request,ctx.env))return send({error:'Please sign in to Rockstok Backstage.'},401);if(!['GET','HEAD'].includes(ctx.request.method)&&!sameOrigin(ctx.request))return send({error:'Invalid request origin'},403);return null}
export const bucket=env=>{if(!env.ROCKSTOK_BUCKET)throw Error('Missing ROCKSTOK_BUCKET R2 binding');return env.ROCKSTOK_BUCKET};
const KEY='catalog/rockstok.json';
export async function readDb(env){const o=await bucket(env).get(KEY);if(!o)return {db:{gigs:[],albums:[]},etag:null};const v=await o.json();return {db:{gigs:Array.isArray(v.gigs)?v.gigs:[],albums:Array.isArray(v.albums)?v.albums:[]},etag:o.etag};}
export async function writeDb(env,db,etag){const opt={httpMetadata:{contentType:'application/json'},onlyIf:etag?{etagMatches:etag}:{etagDoesNotMatch:'*'}};const result=await bucket(env).put(KEY,JSON.stringify(db),opt);if(!result)throw Error('Someone else saved changes. Refresh and try again.');}
export const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,65)||'event';
export const safeUrl=s=>{try{const u=new URL(String(s));return u.protocol==='https:'?u.href:''}catch{return ''}};
export const failure=e=>send({error:String(e?.message||'Unexpected server error')},/conflict|refresh/i.test(e?.message||'')?409:500);
