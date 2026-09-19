import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const url=process.env.BRICKVILLE_URL || 'http://127.0.0.1:4187/';
const browser=await chromium.launch({channel:'chrome',headless:true});
const ctx=await browser.newContext({viewport:{width:820,height:1180},hasTouch:true,isMobile:true});
const page=await ctx.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const results=[];
const save=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('brickville-city-v1')||'null'));
const button=(name)=>page.getByRole('button',{name,exact:true});
async function check(name,fn){await fn();results.push(name);console.log('OK',name)}
await fs.mkdir('screenshots',{recursive:true});
try{
 await page.goto(url);await button('Nouvelle ville').waitFor();
 await page.screenshot({path:'screenshots/accueil-tablette.png'});
 await check('Démarrage, aide et interface tablette',async()=>{
  await button('Nouvelle ville').tap();await button('C’est compris').tap();await page.waitForTimeout(300);
  assert.equal((await save()).plates.length,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 });
 await check('Construction par toucher réel',async()=>{
  await button('Briques').tap();await button('Brique 2×2').tap();await page.touchscreen.tap(410,590);
  await page.waitForTimeout(120);assert.equal((await save()).bricks.length,1);
 });
 await check('Annuler puis rétablir',async()=>{
  await button('Annuler').tap();assert.equal((await save()).bricks.length,0);
  await button('Rétablir').tap();assert.equal((await save()).bricks.length,1);
 });
 await check('Rotation et couleur appliquées à la construction',async()=>{
  await button('Brique 1×4').tap();await button('Bleu').tap();await button('Tourner').tap();
  await page.touchscreen.tap(490,620);await page.waitForTimeout(100);
  const b=(await save()).bricks.at(-1);assert.equal(b.rot,1);assert.equal(b.color,'blue');
  await button('Annuler').tap();assert.equal((await save()).bricks.length,1);
 });
 await check('Suppression de l’objet touché même avec plaque sélectionnée',async()=>{
  await button('Agrandir').tap();await button('Retirer').tap();
  // The brick is at the camera target; try points on its projected visible top.
  for(const y of [580,585,590,575,570]) {await page.touchscreen.tap(410,y);if((await save()).bricks.length===0)break;}
  assert.equal((await save()).bricks.length,0);await button('Annuler').tap();
  assert.equal((await save()).bricks.length,1);await button('Construire').tap();
 });
 await check('Glisser aller-retour ne construit rien',async()=>{
  const before=(await save()).bricks.length;
  const cdp=await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:400,y:600,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:460,y:600,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:400,y:600,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal((await save()).bricks.length,before);
 });
 await check('Pincer pour zoomer ne construit rien',async()=>{
  const before=(await save()).bricks.length;const cdp=await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:350,y:600,id:1},{x:450,y:600,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:320,y:600,id:1},{x:480,y:600,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal((await save()).bricks.length,before);
 });
 await check('Rechargement immédiat et reprise de la ville',async()=>{
  const before=await save();await page.reload();await button('Continuer ma ville').tap();
  assert.deepEqual((await save()).bricks,before.bricks);
 });
 await check('Nouvelle ville et recommencer demandent confirmation',async()=>{
  page.once('dialog',d=>d.dismiss());await button('Recommencer').tap();assert.equal((await save()).bricks.length,1);
  await page.reload();page.once('dialog',d=>d.dismiss());await button('Nouvelle ville').tap();
  assert.equal((await save()).bricks.length,1);await button('Continuer ma ville').tap();
 });
 await check('Menus, couleurs, aide et portrait/paysage',async()=>{
  await button('Bâtiments').tap();await button('Maison').tap();await button('Rouge').tap();
  assert.equal(await button('Rouge').getAttribute('aria-pressed'),'true');
  await button('Aide').tap();await button('C’est compris').tap();
  await page.setViewportSize({width:1180,height:820});await page.screenshot({path:'screenshots/jeu-paysage.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'screenshots/jeu-telephone.png'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 });
 await check('Aide défilable sur écran bas',async()=>{
  await page.setViewportSize({width:844,height:390});await button('Aide').tap();await button('C’est compris').scrollIntoViewIfNeeded();await button('C’est compris').tap();
 });
 await check('Toutes les catégories et vignettes sont sélectionnables',async()=>{
  await page.setViewportSize({width:1180,height:820});
  const categories=['Plaques','Bâtiments','Briques','Plaques fines','Toits','Ouvertures','Rue','Nature','Véhicules','Figurines'];
  let count=0;
  for(const name of categories){
    await button(name).tap();
    const cards=page.locator('button').filter({has:page.locator('span.w-full.truncate')});
    const total=await cards.count();assert.ok(total>0,name);
    for(let i=0;i<total;i++){await cards.nth(i).scrollIntoViewIfNeeded();await cards.nth(i).tap();assert.equal(await cards.nth(i).getAttribute('aria-pressed'),'true');count++;}
  }
  assert.equal(count,73);
 });
 await check('Écran accueil paysage sans chevauchement',async()=>{
  await page.setViewportSize({width:844,height:390});await page.reload();await button('Continuer ma ville').waitFor();
  assert.equal(await page.evaluate(()=>{const a=document.querySelector('.title-screen header').getBoundingClientRect(),b=document.querySelector('.title-actions').getBoundingClientRect();return a.right>b.left&&a.bottom>b.top}),false);
 });
 assert.deepEqual(errors,[]);
 await fs.writeFile('screenshots/browser-results.json',JSON.stringify({url,results,errors},null,2));
 console.log(`BROWSER PASS: ${results.length} scénarios`);
}catch(e){await page.screenshot({path:'screenshots/echec.png'});throw e}finally{await browser.close()}
