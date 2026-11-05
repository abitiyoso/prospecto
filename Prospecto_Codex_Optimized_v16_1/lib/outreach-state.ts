import {z} from 'zod';
export const replyEventTypes=['replied','positive_reply'] as const;
export function launchRecipient(launch:{sender_email?:string;snapshot:{audience:{contact:{id:string;email:string}}[]}},contactId:string){
 const contact=launch.snapshot.audience.find(a=>a.contact.id===contactId)?.contact;
 if(!contact||!z.email().safeParse(launch.sender_email).success)throw new Error('Identitas pengirim atau penerima pada peluncuran belum tersedia.');
 return {email:z.email().parse(contact.email).toLowerCase(),senderEmail:launch.sender_email!.toLowerCase()};
}
