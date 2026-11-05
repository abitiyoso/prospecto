import {z} from 'zod';
export const emailToken=z.object({token_hash:z.string().regex(/^[a-zA-Z0-9_-]{20,512}$/),type:z.enum(['email','recovery'])});
export const emailDestination=(type:'email'|'recovery')=>type==='recovery'?'/auth/password':'/app';
