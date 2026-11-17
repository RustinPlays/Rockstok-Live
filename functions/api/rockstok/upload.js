import {send,protectedRequest,readDb,writeDb,bucket,failure} from '../../_lib/core.js';
const TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
export async function onRequestPost(ctx){const deny=await protectedRequest(ctx);if(deny)return deny;
 try{
  const fd=await ctx.request.formData(),id=String(fd.get('albumId')||''),file=fd.get('file');
  if(!id||!file||typeof file.arrayBuffer!=='function')return send({error:'Choose an album and image'},400);
  if(!TYPES[file.type])return send({error:'Use JPEG, PNG, WebP or AVIF'},415);
  if(file.size>10*1024*1024)return send({error:'Photo copy exceeds 10 MB; browser should optimise it before uploading'},413);
  const {db,etag}=await readDb(ctx.env),album=db.albums.find(x=>x.id===id);
  if(!album)return send({error:'Album not found'},404);
  if(album.photos.length>=2000)return send({error:'Album reached the 2,000 photo application limit'},400);
  const base=String(ctx.env.PHOTOS_BASE_URL||'').replace(/\/$/,'');
  if(!/^https:\/\/[a-z0-9.-]+$/i.test(base))return send({error:'Set PHOTOS_BASE_URL to https://photos.rockstok.live in Pages variables'},503);
  const key=`albums/${id}/${crypto.randomUUID()}.${TYPES[file.type]}`,url=`${base}/${key}`;
  await bucket(ctx.env).put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type,cacheControl:'public,max-age=31536000,immutable'}});
  album.photos.push({image:url,caption:''});if(!album.cover)album.cover=url;
  try{await writeDb(ctx.env,db,etag)}catch(e){return send({error:'File stored but album index was not updated. Please check R2 for an unlisted file.',key},409)}
  return send({item:album});
 }catch(e){return failure(e)}
}
