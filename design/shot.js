const {chromium}=require(process.env.PW||'/opt/npm-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch();const f=process.argv[2],out=process.argv[3];
for(const [n,o] of [['desktop',{viewport:{width:1440,height:900},deviceScaleFactor:2}],['phone',{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true}]]){
 const c=await b.newContext(o);const p=await c.newPage();await p.goto('file://'+__dirname+'/'+f);await p.waitForTimeout(500);
 await p.screenshot({path:__dirname+'/out/'+out+'_'+n+'.png',fullPage:true});await c.close()}
await b.close()})();
