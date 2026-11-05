const {chromium}=require('playwright');
const U='https://iomastavki-pr-8.onrender.com';
(async()=>{
 for(const p of ['/api/health','/api/me']){const r=await fetch(U+p);console.log(p,r.status,(await r.text()).slice(0,300));}
 const r=await fetch(U+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({login:'admin',password:'wrong-pass'})});console.log('login wrong',r.status,await r.text());
 const r2=await fetch(U+'/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({login:'client@example.com',password:'wrong-pass'})});console.log('login client',r2.status,await r2.text());
 const b=await chromium.launch();const pg=await b.newPage();pg.on('console',m=>console.log('console',m.type(),m.text()));pg.on('pageerror',e=>console.log('PAGEERR',e.message));
 await pg.goto(U,{waitUntil:'networkidle'});
 const btn=await pg.$('.v3-loginbtn');console.log('loginbtn visible',btn&&await btn.isVisible());
 if(btn){await btn.click();await pg.waitForTimeout(800);console.log('loginView visible',await pg.isVisible('#loginView'));
  await pg.fill('#v3loginForm input[name=login]','admin');await pg.fill('#v3loginForm input[name=password]','wrong-pass');await pg.click('#v3loginForm button[type=submit]');await pg.waitForTimeout(1500);console.log('err text',await pg.textContent('#v3loginErr'));}
 console.log('html head', (await pg.content()).match(/theme-v3\.css\?v=[^"]+/)?.[0]);
 await b.close();
})();
