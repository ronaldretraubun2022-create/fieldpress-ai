import { supabase } from './supabase.js';import { $,toast,setLoading } from './utils.js';

const loginForm=$('#loginForm'), registerForm=$('#registerForm'), logoutBtn=$('#logoutBtn');

loginForm?.addEventListener('submit',async(e)=>{e.preventDefault();const btn=loginForm.querySelector('button');try{setLoading(btn,true,'Login...');const email=$('#email').value.trim(),password=$('#password').value;const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;location.href='dashboard.html'}catch(err){toast(err.message,'error')}finally{setLoading(btn,false)}});

registerForm?.addEventListener('submit',async(e)=>{e.preventDefault();const btn=registerForm.querySelector('button');try{setLoading(btn,true,'Membuat akun...');const full_name=$('#full_name').value.trim(),email=$('#email').value.trim(),password=$('#password').value;const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name}}});if(error)throw error;if(data.user){await supabase.from('profiles').upsert({id:data.user.id,email,full_name,role:'user',plan:'free'});}toast('Akun berhasil dibuat. Silakan login.');setTimeout(()=>location.href='login.html',800)}catch(err){toast(err.message,'error')}finally{setLoading(btn,false)}});

logoutBtn?.addEventListener('click',async()=>{await supabase.auth.signOut();location.href='login.html'});
