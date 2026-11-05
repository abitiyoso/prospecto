/** Supabase limits results per request. Read stable pages instead of silently
 * losing contacts after the second CSV import. Every page retains tenant filters. */
export async function collectRows<T>(page:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>,size=500):Promise<T[]> {
 const rows:T[]=[];
 for(let from=0;;from+=size){const result=await page(from,from+size-1);if(result.error||!result.data)throw new Error('Data workspace belum dapat dimuat');rows.push(...result.data);if(result.data.length<size)return rows;}
}
