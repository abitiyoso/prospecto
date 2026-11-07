'use client';
import {useState,useId} from 'react';
import {Eye,EyeOff} from 'lucide-react';
export default function PasswordField({minLength,autoComplete}:{minLength:number;autoComplete:string}){
 const [visible,setVisible]=useState(false),id=useId();
 return <div className="password-field"><label htmlFor={id}>Kata sandi</label><div className="password-input"><input id={id} name="password" type={visible?'text':'password'} minLength={minLength} maxLength={128} required autoComplete={autoComplete}/><button type="button" className="icon-btn" aria-label={visible?'Sembunyikan kata sandi':'Lihat kata sandi'} aria-pressed={visible} aria-controls={id} onClick={()=>setVisible(!visible)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>;
}
