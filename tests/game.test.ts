import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { CATALOG, itemFootprint } from '../src/game/catalog';
import { useCity } from '../src/game/store';
import { Occupancy, transformPrefab } from '../src/game/occupancy';
import { brickWorldMatrix, getBrickGeometry, specialHeight, footprintCells } from '../src/game/geometry';
import { loadSave, writeSave, hasSave } from '../src/game/save';
import { SAVE_KEY, MAX_PLATES, PLATE_H } from '../src/game/constants';
import { TapGesture } from '../src/game/gestures';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', { configurable:true, value: {
  getItem:(k:string)=>memory.get(k) ?? null,
  setItem:(k:string,v:string)=>{memory.set(k,v)},
  removeItem:(k:string)=>{memory.delete(k)},
}});
beforeEach(()=>{memory.clear();useCity.getState().startNew();useCity.getState().setHelp(false)});
const state = () => useCity.getState();
function place(id='brick-2x2',x=16,z=16){state().selectItem(id);state().setGhostWorld(x,z);return state().placeAtGhost()}

test('catalogue: chaque objet, couleur autorisée et orientation se pose sur une plaque vide',()=>{
  let combinations=0;
  for(const item of CATALOG.filter(i=>i.kind!=='baseplate')) for(const color of item.colors) for(const rot of [0,1,2,3]){
    state().resetCity();state().selectItem(item.id);state().setColor(color);
    for(let i=0;i<rot;i++)state().rotate();
    state().setGhostWorld(16,16);
    assert.equal(state().placeAtGhost(),true,`${item.id}/${color}/${rot}`);
    assert.equal(new Set(state().bricks.map(b=>b.groupId)).size,1);
    assert.ok(state().bricks.every(b=>Number.isFinite(b.y)&&b.y>=0));
    combinations++;
  }
  console.log(`Catalogue: ${CATALOG.length} références, ${combinations} combinaisons pièce/couleur/rotation`);
});
test('toutes les plaques: ajout, remplacement, annulation et rétablissement',()=>{
  for(const item of CATALOG.filter(i=>i.kind==='baseplate')){
    state().resetCity();state().selectItem(item.id);
    assert.equal(state().addPlateAt(-1,0),true,item.id);
    assert.equal(state().plates[1].type,item.plateType);
    state().undo();assert.equal(state().plates.length,1);
    state().redo();assert.equal(state().plates.length,2);
    if(item.plateType!=='grass'){assert.equal(state().replacePlate(0,0),true);assert.equal(state().plates[0].type,item.plateType)}
  }
});
test('bords, raccord de plaques, refus hors plateau et coordonnées négatives',()=>{
  assert.equal(place('brick-2x2',0,0),false);
  state().selectItem('plate-grass');assert.equal(state().addPlateAt(-1,0),true);
  assert.equal(place('brick-2x2',0,16),true);
  assert.equal(place('brick-2x2',-16,16),true);
  assert.equal(place('brick-2x2',80,80),false);
});
test('limite de 25 plaques, refus détaché, diagonal et doublon',()=>{
  assert.equal(state().addPlateAt(2,0),false);assert.equal(state().addPlateAt(1,1),false);assert.equal(state().addPlateAt(0,0),false);
  for(let x=1;x<MAX_PLATES;x++)assert.equal(state().addPlateAt(x,0),true);
  assert.equal(state().addPlateAt(MAX_PLATES,0),false);
});
test('empilement, support irrégulier et suppression supérieure',()=>{
  assert.equal(place(),true);assert.equal(place(),true);
  assert.equal(state().bricks[1].y,3);
  assert.equal(place('brick-2x4',16,17),false);
  state().setMode('erase');state().setGhostWorld(15.1,15.1);
  assert.equal(state().eraseAtGhost(),true);assert.equal(state().bricks.length,1);
  assert.equal(state().bricks[0].y,0);
});
test('retirer fonctionne même quand une plaque était sélectionnée',()=>{
  place();state().selectItem('plate-grass');state().setMode('erase');state().setGhostWorld(15.5,15.5);
  assert.equal(state().eraseAtGhost(),true);assert.equal(state().bricks.length,0);
});
test('construire après agrandir choisit une vraie brique',()=>{
  state().setMode('place');state().setGhostWorld(16,16);assert.equal(state().placeAtGhost(),true);
});
test('annuler/rétablir, nouvelle action invalide le futur, historique limité',()=>{
  place();state().undo();assert.equal(state().bricks.length,0);state().redo();assert.equal(state().bricks.length,1);
  state().undo();place('brick-1x1',5,5);assert.equal(state().future.length,0);
  for(let n=0;n<45;n++)place('brick-1x1',5,5);
  assert.equal(state().past.length,40);
});
test('plaque occupée ne se remplace pas et action vide ne remplit pas historique',()=>{
  assert.equal(state().replacePlate(0,0),false);assert.equal(state().past.length,0);
  place();state().selectItem('plate-water');assert.equal(state().replacePlate(0,0),false);
});
test('sauvegarde immédiate, rechargement, reprise et aucune sauvegarde du décor',()=>{
  place();assert.ok(hasSave());const saved=loadSave()!;assert.equal(saved.bricks.length,1);
  state().startDemo();state().persist();assert.equal(loadSave()!.bricks.length,1);
  state().continueSave();assert.deepEqual(state().bricks,saved.bricks);
  place();assert.equal(state().bricks.length,2);assert.equal(new Set(state().bricks.map(b=>b.id)).size,2);
});
test('sauvegarde invalide refusée sans plantage',()=>{
  for(const raw of ['{','null','{}','{"plates":[null],"bricks":[]}','{"version":999,"plates":[],"bricks":[]}']){
    memory.set(SAVE_KEY,raw);assert.equal(loadSave(),null,raw);assert.equal(hasSave(),false,raw);
  }
});
test('échec stockage signalé, aucun faux succès',()=>{
  const original=localStorage.setItem;
  localStorage.setItem=()=>{throw new Error('quota')};
  try{assert.equal(writeSave({version:1,plates:state().plates,bricks:[],selectedId:'brick-2x2',color:'red',rot:0,mode:'place'}),false);state().persist();assert.equal(state().savedHint,false)}finally{localStorage.setItem=original}
});
test('géométrie: voiture orientée comme son empreinte, bus réservé à sa hauteur',()=>{
  const car=CATALOG.find(i=>i.id==='car')!;const geo=getBrickGeometry('car',car.w,car.d,car.h);geo.computeBoundingBox();
  assert.ok(geo.boundingBox!.max.x<2.2);assert.ok(geo.boundingBox!.max.z>3.5);
  assert.equal(specialHeight('bus',6),6);
});
test('toutes les géométries ont des sommets finis',()=>{
  for(const item of CATALOG.filter(i=>i.kind!=='baseplate')){
    const voxels=item.prefab??[{...item,kind:item.kind as any}];
    for(const v of voxels){const g=getBrickGeometry(v.kind,v.w,v.d,v.h);assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite),item.id)}
  }
});
test('rotation des assemblages correspond à la rotation réelle de chaque pièce',()=>{
  const prefab=[{kind:'brick' as const,x:0,z:0,y:0,w:2,d:1,h:3,rot:0 as const,color:'red' as const},{kind:'brick' as const,x:3,z:2,y:0,w:1,d:2,h:3,rot:0 as const,color:'blue' as const}];
  for(const rot of [0,1,2,3]){
    const transformed=transformPrefab(prefab,0,0,rot);
    const whole=brickWorldMatrix(0,0,0,4,4,rot);
    prefab.forEach((b,i)=>{
      const center=new Vector3(b.x+b.w/2,PLATE_H,b.z+b.d/2).applyMatrix4(whole);
      const t=transformed[i];const fp=itemFootprint({...t,id:'test',name:'test',category:'bricks',colors:['red'],thumb:'brick'},t.rot);
      assert.ok(Math.abs(center.x-(t.x+fp.w/2))<1e-6,`rotation ${rot} x`);
      assert.ok(Math.abs(center.z-(t.z+fp.d/2))<1e-6,`rotation ${rot} z`);
    });
  }
});
test('occupation reconstruite après retrait et annulation',()=>{
  const o=new Occupancy();o.reset([{id:'p',gx:0,gz:0,type:'grass'}],[]);
  const brick={kind:'brick' as const,x:1,z:1,y:0,w:2,d:2,h:3,rot:0 as const,color:'red' as const,id:'a',groupId:'g'};
  o.addBrick(brick);assert.equal(o.heightAt(1,1),3);o.removeGroup('g');assert.equal(o.heightAt(1,1),0);
  assert.equal(o.canPlace([brick]).ok,true);
});

test('gestes: tap, mouvement, retour au départ, pincement, annulation et clic droit',()=>{
  const g=new TapGesture();
  const e=(id:number,x=100,y=100,button=0)=>({pointerId:id,clientX:x,clientY:y,button});
  g.down(e(1));assert.equal(g.up(e(1)),true);
  g.down(e(1));g.move(e(1,140));assert.equal(g.up(e(1)),false);
  g.down(e(1));g.down(e(2));assert.equal(g.up(e(2)),false);assert.equal(g.up(e(1)),false);
  g.down(e(1));g.cancel(1);assert.equal(g.up(e(1)),false);
  g.down(e(1,100,100,2));assert.equal(g.up(e(1)),false);
});
test('bâtiments entiers supprimés, support protégé, reprise après retrait supérieur',()=>{
  place('kit-house');const group=state().bricks[0].groupId;
  assert.equal(state().eraseGroup(group),true);assert.equal(state().bricks.length,0);
  place('brick-2x2');const base=state().bricks[0].groupId;place('brick-1x1',15.5,15.5);
  assert.equal(state().eraseGroup(base),false);assert.match(state().notice,/au-dessus/);
  assert.equal(state().eraseGroup(state().bricks[1].groupId),true);
  assert.equal(state().eraseGroup(base),true);
});
test('rotations routes, retour à zéro, rotation inverse, changement de mode',()=>{
  state().selectItem('plate-road-ns');state().rotate();assert.equal(state().selectedId,'plate-road-ew');
  state().rotate();assert.equal(state().selectedId,'plate-road-ns');
  for(const id of ['plate-road-t-n','plate-road-curve-ne']){state().selectItem(id);for(let i=0;i<4;i++)state().rotate();assert.equal(state().selectedId,id)}
  state().selectItem('brick-1x4');state().rotate(-1);assert.equal(state().rot,3);
  state().rotate();assert.equal(state().rot,0);state().setMode('expand');assert.equal(state().selectedId,'plate-grass');
});
test('aide interdit de construire et de supprimer en arrière-plan',()=>{
  place();const group=state().bricks[0].groupId;state().setHelp(true);
  assert.equal(state().placeAtGhost(),false);assert.equal(state().eraseGroup(group),false);
});
test('recommencer efface modèle, sélection fantôme et sauvegarde précédente',()=>{
  place();state().rotate();state().resetCity();
  assert.equal(state().bricks.length,0);assert.equal(state().plates.length,1);assert.equal(state().ghost,null);assert.equal(state().rot,0);
  assert.equal(loadSave()!.bricks.length,0);
});
test('géométrie: briques au-dessus de la plaque, jamais enfouies',()=>{
  const p=new Vector3(0,0,0).applyMatrix4(brickWorldMatrix(0,0,0,1,1,0));assert.equal(p.y,PLATE_H);
});
test('assemblages: aucun volume occupé par deux pièces du même bâtiment',()=>{
  for(const item of CATALOG.filter(i=>i.prefab)) for(const rot of [0,1,2,3]) {
    const cells=new Set<string>();
    for(const b of transformPrefab(item.prefab!,0,0,rot)) for(const c of footprintCells(b.x,b.z,b.w,b.d,b.rot)) for(let y=b.y;y<b.y+specialHeight(b.kind,b.h);y++){
      const key=`${c.x},${y},${c.z}`;assert.equal(cells.has(key),false,`${item.id} rotation ${rot} : chevauchement ${key}`);cells.add(key);
    }
  }
});
test('couleur des murs modifiée sans repeindre toiture, fenêtres ni sol',()=>{
  const house=CATALOG.find(i=>i.id==='kit-house')!;
  const red=transformPrefab(house.prefab!,0,0,0,'blue');
  assert.ok(red.some(b=>b.kind==='brick'&&b.color==='blue'));
  house.prefab!.forEach((b,i)=>{if(b.kind!=='brick')assert.equal(red[i].color,b.color)});
  const cafe=CATALOG.find(i=>i.id==='kit-cafe')!;
  assert.ok(transformPrefab(cafe.prefab!,0,0,0,'tan').some(b=>b.kind==='brick'&&b.color==='tan'));
});
