import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
const url=process.env.BRICKVILLE_URL || 'http://127.0.0.1:4187/';
try{
 const page=await browser.newPage({viewport:{width:820,height:1180},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);
 await page.evaluate(()=>{
  const plates=[],bricks=[];
  for(let gz=0;gz<5;gz++)for(let gx=0;gx<5;gx++){
   plates.push({id:`p${gx}-${gz}`,gx,gz,type:'grass'});
   for(let i=0;i<40;i++)bricks.push({id:`b${gx}-${gz}-${i}`,groupId:`g${gx}-${gz}-${i}`,kind:'brick',x:gx*32+2+(i%8)*3,z:gz*32+2+Math.floor(i/8)*4,y:0,w:2,d:2,h:3,color:'red',rot:0});
  }
  localStorage.setItem('brickville-city-v1',JSON.stringify({version:1,plates,bricks,selectedId:'brick-2x2',color:'red',rot:0,mode:'place'}));
 });
 await page.reload();await page.getByRole('button',{name:'Continuer ma ville',exact:true}).click();
 await page.getByText('25 plaques · 1000 éléments',{exact:false}).waitFor();
 await page.getByRole('button',{name:'Agrandir',exact:true}).click();
 await page.touchscreen.tap(410,590);
 await page.waitForTimeout(100);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('brickville-city-v1')).bricks.length),1000);
 await page.screenshot({path:'screenshots/ville-1000-elements.png'});
 assert.deepEqual(errors,[]);
 console.log('OK grande ville: 25 plaques, 1000 éléments, reprise et rendu');
 await page.addInitScript(()=>{localStorage.setItem('brickville-city-v1','{"plates":[null],"bricks":[]}')});
 await page.reload();await page.getByRole('button',{name:'Nouvelle ville',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Continuer ma ville',exact:true}).count(),0);
 console.log('OK sauvegarde corrompue: accueil utilisable');
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw new Error('QuotaExceeded')}});
 await page.getByRole('button',{name:'Nouvelle ville',exact:true}).click();
 await page.getByRole('button',{name:'C’est compris',exact:true}).click();
 assert.match(await page.getByRole('status').innerText(),/sauvegarde est bloquée/);
 console.log('OK stockage refusé: avertissement affiché, jeu utilisable');
}finally{await browser.close()}
