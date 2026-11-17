import {send,protectedRequest,readDb,writeDb,bucket,failure} from '../../_lib/core.js';
export async function onRequestPost(ctx){const deny=await protectedRequest(ctx);if(deny)return deny;
 try{const {id,image}=await ctx.request.json();const {db,etag}=await readDb(ctx.env);const album=db.albums.find(x=>x.id===id);if(!album)return send({error:'Album not found'},404);if(!album.photos.some(p=>p.image===image))return send({error:'Photo not found'},404);
 const base=String(ctx.env.PHOTOS_BASE_URL||'').replace(/\/$/,'')+'/';if(!String(image).startsWith(base))return send({error:'Invalid photo URL'},400);
 const key=decodeURIComponent(String(image).slice(base.length));if(!key.startsWith(`albums/${id}/`)||key.includes('..'))return send({error:'Invalid photo key'},400);
 album.photos=album.photos.filter(p=>p.image!==image);if(album.cover===image)album.cover=album.photos[0]?.image||'';
 await writeDb(ctx.env,db,etag);await bucket(ctx.env).delete(key);return send({item:album});
 }catch(e){return failure(e)}
}
