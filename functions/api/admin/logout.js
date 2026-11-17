import {send,clearCookie,sameOrigin} from '../../_lib/core.js';
export async function onRequestPost({request}){if(!sameOrigin(request))return send({error:'Invalid origin'},403);const r=send({ok:true});r.headers.append('Set-Cookie',clearCookie());return r}
