import {send,readDb,failure} from '../../_lib/core.js';
export async function onRequestGet({env}){try{const {db}=await readDb(env);return send({gigs:db.gigs.filter(x=>x.public!==false),albums:db.albums.filter(x=>x.published!==false)})}catch(e){return failure(e)}}
