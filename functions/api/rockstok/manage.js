import {send,protectedRequest,readDb,writeDb,slug,safeUrl,failure} from '../../_lib/core.js';
export async function onRequestGet(ctx){const deny=await protectedRequest(ctx);if(deny)return deny;try{return send((await readDb(ctx.env)).db)}catch(e){return failure(e)}}
export async function onRequestPost(ctx){const deny=await protectedRequest(ctx);if(deny)return deny;
 try{
  const body=await ctx.request.json(),kind=body.kind;
  if(!['gigs','albums'].includes(kind))return send({error:'Invalid content type'},400);
  const {db,etag}=await readDb(ctx.env);
  if(body.action==='delete'){
   const found=db[kind].some(x=>x.id===body.id);if(!found)return send({error:'Not found'},404);
   db[kind]=db[kind].filter(x=>x.id!==body.id);await writeDb(ctx.env,db,etag);return send({ok:true,note:'R2 photo files remain stored until removed separately.'});
  }
  if(body.action!=='save')return send({error:'Invalid action'},400);
  const value=body.item||{},title=String(value.title||'').trim().slice(0,150);
  if(!title||!/^\d{4}-\d{2}-\d{2}$/.test(String(value.date||'')))return send({error:'Title and valid YYYY-MM-DD date required'},400);
  const id=String(value.id||crypto.randomUUID());
  const old=db[kind].find(x=>x.id===id);
  const common={id,title,date:value.date,venue:String(value.venue||'').slice(0,180),description:String(value.description||'').slice(0,2500)};
  let item;
  if(kind==='gigs')item={...common,time:String(value.time||'').slice(0,60),location:String(value.location||'').slice(0,160),mapAddress:String(value.mapAddress||'').slice(0,300),ticketLink:safeUrl(value.ticketLink||''),public:value.public!==false};
  else{
   const existing=old?.photos||[];const byUrl=new Map(existing.map(p=>[p.image,p]));
   const photos=Array.isArray(value.photos)?value.photos.filter(p=>p&&byUrl.has(p.image)).map(p=>({image:p.image,caption:String(p.caption||'').slice(0,250)})):existing;
   item={...common,category:['Shows','Lighting','Private Events','Other'].includes(value.category)?value.category:'Shows',published:value.published!==false,slug:old?.slug||slug(title)+'-'+id.slice(0,8),photos,cover:photos.some(p=>p.image===value.cover)?value.cover:photos[0]?.image||''};
  }
  db[kind]=old?db[kind].map(x=>x.id===id?item:x):[...db[kind],item];
  await writeDb(ctx.env,db,etag);return send({item});
 }catch(e){return failure(e)}
}
