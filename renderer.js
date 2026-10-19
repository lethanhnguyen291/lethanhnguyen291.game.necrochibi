(function(root){
  'use strict';
  const D=root.NecroData,TAU=Math.PI*2,hash=(x,y,s=0)=>{const n=Math.sin(x*127.1+y*311.7+s*71.9)*43758.5453;return n-Math.floor(n);};
  class Renderer{
    constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.camera={x:0,y:0};this.particles=[];this.rings=[];this.numbers=[];this.threads=[];this.shake=0;this.t=0;this.heroSprites=new Map();this.weaponSprites=new Map();this.summonSprites=new Map();this.minionMotion=new WeakMap();this.heroMotion=null;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.prepareHeroArt();this.resize();}
    prepareHeroArt(){
      for(const hero of D.heroes){const img=new Image();img.src=NecroHeroArt.assets[hero.id].src;this.heroSprites.set(hero.id,img);}
      for(const [type,asset] of Object.entries(NecroCreatureArt.assets)){const img=new Image();img.src=asset.src;this.summonSprites.set(type,img);}
      for(const weapon of D.weapons){const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(NecroRelicArt.svg(weapon.id));this.weaponSprites.set(weapon.id,img);}
    }
    resize(){const arena=this.canvas.parentElement,r=arena.getBoundingClientRect(),style=getComputedStyle(arena),inset=name=>parseFloat(style.getPropertyValue('--battle-'+name))||0;this.w=r.width;this.h=r.height;this.dpr=Math.min(devicePixelRatio||1,2);this.zoom=Math.min(1,Math.max(.68,this.w/750));this.battle={top:inset('top'),bottom:inset('bottom'),right:inset('right'),shift:inset('shift')};this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);}
    point(x,y){return{x:(x-this.camera.x)*this.zoom+this.originX+this.sx,y:(y-this.camera.y)*this.zoom+this.originY+this.sy};}
    circle(x,y,r,color){const c=this.ctx;c.fillStyle=color;c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);c.fill();}
    ellipse(x,y,rx,ry,color){const c=this.ctx;c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();}
    glow(x,y,r,color){const c=this.ctx,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
    burst(x,y,color,count=12){for(let i=0;i<count;i++){const a=Math.random()*TAU,v=30+Math.random()*130;this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.4+Math.random()*.35,color});}if(this.particles.length>400)this.particles.splice(0,this.particles.length-400);}
    event(e){
      if(e.type==='hit'){if(this.numbers.length<55)this.numbers.push({x:e.x,y:e.y-20,text:Math.ceil(e.damage),life:.6,color:e.color});}
      if(e.type==='death'||e.type==='decay')this.burst(e.x,e.y,e.type==='death'?'#e59dbb':'#82668d',e.boss?40:7);
      if(e.type==='summon'||e.type==='fusion'||e.type==='sacrifice'){this.burst(e.x,e.y,e.color||'#80f2d4',e.type==='fusion'?40:18);this.rings.push({...e,r:0,max:e.type==='fusion'?90:45,life:.55,color:e.color||'#a8eadc'});}
      if(e.type==='explosion'||e.type==='roar'){this.rings.push({...e,r:0,max:e.r,life:.65,color:e.color||'#dc9bfb'});this.burst(e.x,e.y,e.color||'#d994f9',25);if(!this.reduced)this.shake=e.type==='roar'?9:4;}
      if(e.type==='hurt'&&!this.reduced)this.shake=5;
      if(e.type==='revive'){this.burst(e.x,e.y,'#ffe2a0',45);this.rings.push({...e,r:0,max:130,life:1,color:'#ffe2a0'});}
      if(e.type==='heroSkill'||e.type==='relic'){
        this.burst(e.x,e.y,e.color,18);this.rings.push({...e,r:0,max:e.r||90,life:.65,color:e.color});
        if(e.points)this.threads.push({points:[{x:e.x,y:e.y},...e.points],color:e.color,life:.55});if(this.threads.length>35)this.threads.shift();
      }
      if(['magnet','bomb','book'].includes(e.type)){const color=e.type==='magnet'?'#9be8d1':e.type==='bomb'?'#ffb192':'#d7aeff';this.rings.push({...e,r:0,max:e.type==='bomb'?800:e.type==='magnet'?620:100,life:.9,color});this.burst(e.x,e.y,color,e.type==='bomb'?55:24);if(e.type==='bomb'&&!this.reduced)this.shake=7;}
    }
    glyph(kind,x,y,scale,color){
      const c=this.ctx;c.save();c.translate(x,y);c.scale(scale,scale);c.strokeStyle=color;c.lineWidth=1.7;c.lineCap='round';c.lineJoin='round';c.beginPath();
      if(kind==='root'){c.moveTo(0,10);c.bezierCurveTo(-13,0,-4,-8,0,-11);c.bezierCurveTo(13,0,4,8,0,10);c.moveTo(0,-6);c.lineTo(0,8);c.moveTo(-5,-1);c.lineTo(0,4);c.lineTo(5,-1);}
      else if(kind==='mirror'){c.moveTo(7,-6);c.lineTo(0,-10);c.lineTo(-9,-5);c.lineTo(-9,5);c.lineTo(0,10);c.lineTo(9,5);c.lineTo(9,0);c.moveTo(2,-8);c.lineTo(7,-1);}
      else if(kind==='thread'){c.moveTo(0,-10);c.lineTo(8,0);c.lineTo(0,10);c.lineTo(-8,0);c.closePath();for(const y of [-4,0,4]){c.moveTo(-4,y-2);c.lineTo(4,y+2);}}
      else{c.arc(0,0,9,.15,5.4);for(const x of [-4,0,4]){c.moveTo(x,-6);c.lineTo(x,6);}}
      c.stroke();c.restore();
    }
    drawHeroEffects(game){
      const c=this.ctx;
      for(const f of game.effects){
        if(f.kind==='stitch'){
          this.worldObject(f.x,f.y,()=>{c.strokeStyle=f.color+'bb';c.lineWidth=1.8;for(let i=0;i<f.points.length;i++){const e=game.enemies.find(e=>e.id===f.targetIds[i]&&!e.dead)||f.points[i],x=e.x-f.x,y=e.y-f.y;c.beginPath();c.moveTo(0,-8);c.quadraticCurveTo(x*.5+Math.sin(this.t*9)*15,y*.5-35,x,y-8);c.stroke();this.glyph('thread',x,y-14,.8,f.color);}},600);
        }else this.worldObject(f.x,f.y,()=>{
          const fade=Math.min(1,f.life*2);c.globalAlpha=fade;
          if(f.kind==='garden'){
            this.ellipse(0,0,f.r,f.r*.62,'#84bb6825');c.strokeStyle=f.color+'88';c.lineWidth=2;c.beginPath();c.ellipse(0,0,f.r,f.r*.62,0,0,TAU);c.stroke();
            for(let i=0;i<7;i++){const a=i*TAU/7,x=Math.cos(a)*f.r*.75,y=Math.sin(a)*f.r*.46;this.glow(x,y-8,22,'#bde88233');this.glyph('root',x,y-10+Math.sin(this.t*3+i)*3,.8,f.color);}this.glyph('root',0,-15,1.5,'#f7d889');
          }else if(f.kind==='embers'){
            this.ellipse(0,0,f.r,f.r*.65,'#d87b6725');for(let i=0;i<8;i++){const a=i*TAU/8,x=Math.cos(a)*f.r*.65,y=Math.sin(a)*f.r*.4;this.ellipse(x,y-6-Math.sin(this.t*7+i)*5,4,11,f.color+'aa');}this.glyph('seal',0,-8,1.1,f.color);
          }else{
            const radius=f.r*(1-f.life/1.2);c.strokeStyle=f.color+'88';c.lineWidth=2;c.beginPath();c.arc(0,0,radius,0,TAU);c.stroke();for(let i=0;i<6;i++){const a=i*TAU/6;this.glyph('mirror',Math.cos(a)*radius,Math.sin(a)*radius,1,f.color);}
          }c.globalAlpha=1;
        },f.r+30);
      }
    }
    background(config){
      const c=this.ctx;c.fillStyle=config.floor;c.fillRect(0,0,this.w,this.h);
      const z=this.zoom,cell=135,ox=this.camera.x-this.originX/z,oy=this.camera.y-this.originY/z;
      for(let tx=Math.floor(ox/cell)-1;tx<(ox+this.w/z)/cell+1;tx++)for(let ty=Math.floor(oy/cell)-1;ty<(oy+this.h/z)/cell+1;ty++){
        const p=this.point(tx*cell,ty*cell),v=hash(tx,ty);
        c.save();c.translate(p.x,p.y);c.scale(z,z);
        c.strokeStyle=config.ground;c.lineWidth=1;c.beginPath();c.moveTo(-14,-24);c.lineTo(3,-15);c.lineTo(0,0);c.lineTo(24,10);c.stroke();
        this.ellipse(20,-15,45,24,config.ground+'40');
        if(v<.25){
          c.strokeStyle=config.accent+'44';c.lineWidth=2;
          for(let i=0;i<4;i++){const x=hash(tx,ty,i+2)*80-40,y=hash(tx+i,ty,8)*60-30;c.beginPath();c.moveTo(x,y);c.lineTo(x-4,y-11);c.lineTo(x+2,y-5);c.lineTo(x+6,y-14);c.stroke();}
        }else if(v>.75){
          this.ellipse(21,-3,20,6,'#08071144');
          const color=config.prop==='ash'?'#e17e69':config.prop==='swamp'?'#70a9b2':'#9a73bc';
          c.fillStyle=color+'66';c.beginPath();c.moveTo(5,-2);c.lineTo(12,-22);c.lineTo(19,-3);c.lineTo(22,-31);c.lineTo(30,-4);c.closePath();c.fill();
        }
        c.restore();
      }
      for(let i=0;i<20;i++){const x=(hash(i,7)*this.w+Math.sin(this.t*.13+i)*25+this.w)%this.w,y=(hash(i,9)*this.h-this.t*(2+i%4)+this.h*100)%this.h;c.globalAlpha=.2+Math.sin(this.t+i)*.15;this.circle(x,y,1,config.color);}c.globalAlpha=1;
    }
    obstacle(o,config){
      const c=this.ctx;this.ellipse(0,o.r*.4,o.r*1.3,o.r*.5,'#0b07164f');
      if(o.variant===1||o.variant===2){
        c.save();c.scale(o.r/24,o.r/24);c.strokeStyle='#221b2c';c.lineWidth=3;
        if(o.variant===2){c.fillStyle='#51465e';c.beginPath();c.moveTo(-14,9);c.lineTo(-12,-44);c.lineTo(2,-53);c.lineTo(14,-42);c.lineTo(17,9);c.closePath();c.fill();c.stroke();this.glow(0,-26,27,config.color+'30');this.glyph('seal',0,-27,1.1,config.color);c.strokeStyle='#b2a2c0';c.lineWidth=1.2;for(const y of [-10,-5,0]){c.beginPath();c.moveTo(-5,y);c.lineTo(7,y-2);c.stroke();}}
        else{c.strokeStyle='#8c7255';c.lineWidth=4;c.beginPath();c.moveTo(-15,10);c.lineTo(-15,-36);c.quadraticCurveTo(0,-55,13,-37);c.lineTo(13,-28);c.stroke();c.fillStyle='#b49768';c.strokeStyle='#322637';c.lineWidth=2;c.beginPath();c.moveTo(-3,-29);c.quadraticCurveTo(19,-40,24,-10);c.lineTo(27,-5);c.lineTo(13,-2);c.lineTo(10,-14);c.lineTo(5,-2);c.lineTo(-7,-6);c.closePath();c.fill();c.stroke();this.glow(11,-14,20,'#edc87926');this.glyph('thread',11,-18,.55,'#f5dc97');}
        c.restore();return;
      }
      const colors=['#51425d','#46515f','#65505a','#646070','#694359'],fill=colors[D.stages.indexOf(config)];
      c.fillStyle=fill;c.strokeStyle='#100c1b';c.lineWidth=3;
      if(config.prop==='grave'||config.prop==='gate'){
        c.beginPath();c.moveTo(-o.r*.6,8);c.lineTo(-o.r*.55,-o.r);c.quadraticCurveTo(0,-o.r*1.6,o.r*.55,-o.r);c.lineTo(o.r*.65,8);c.closePath();c.fill();c.stroke();
        c.strokeStyle=config.color+'88';c.lineWidth=2;c.beginPath();c.moveTo(0,-o.r);c.lineTo(0,0);c.moveTo(-7,-o.r*.6);c.lineTo(7,-o.r*.6);c.stroke();
      }else if(config.prop==='bone'){
        c.fillStyle='#b3a3ab';c.fillRect(-o.r*.5,-o.r*1.1,o.r,o.r*1.2);this.ellipse(0,-o.r,o.r*.7,o.r*.35,'#c5b6b7');this.ellipse(0,4,o.r*.8,o.r*.25,'#8d7b91');
      }else{
        c.beginPath();c.moveTo(-o.r,0);c.lineTo(-o.r*.5,-o.r*.9);c.lineTo(o.r*.2,-o.r*1.2);c.lineTo(o.r,-o.r*.1);c.lineTo(o.r*.6,o.r*.5);c.lineTo(-o.r*.7,o.r*.4);c.closePath();c.fill();c.stroke();
        c.strokeStyle=config.color+'66';c.lineWidth=1;c.beginPath();c.moveTo(-o.r*.4,-o.r*.7);c.lineTo(0,0);c.lineTo(o.r*.6,-o.r*.2);c.stroke();
      }
    }
    wizard(p){
      const c=this.ctx,hero=D.heroes.find(h=>h.id===p.heroId)||D.heroes[0],weapon=D.weapons.find(w=>w.id===p.weaponId)||D.weapons[0],style=NecroHeroArt.styles[hero.id];
      const motion=p.presentation?null:this.heroMotion,pose=NecroMotion.pose(motion);
      const img=this.heroSprites.get(hero.id),asset=NecroHeroArt.assets[hero.id],frame=asset.frame,grip=asset.grip,bob=this.reduced?0:motion?.weight?pose.bob:Math.sin(this.t*2.5)*.35,side=p.presentation?(p.look||1):(motion?.facing||p.look||1);
      this.ellipse(0,23,22,6,'#0b081580');this.glow(0,-8,60,style.coat+'25');c.save();c.translate(0,bob);c.scale(side,1);
      if(p.invuln>0&&Math.floor(this.t*16)%2===0)c.globalAlpha=.55;
      const ready=img?.complete&&img.naturalWidth;if(ready)NecroMotion.paint(c,img,frame,asset.rig,motion);
      const relic=this.weaponSprites.get(weapon.id),book=weapon.shape==='book',height=book?61:72,width=height*2/3,handleY=65;
      c.save();c.translate(grip.x,grip.y);c.rotate(-.2);if(relic?.complete&&relic.naturalWidth)c.drawImage(relic,-width/2,-height*handleY/120,width,height);c.restore();
      // Reuse the painted hand above the weapon instead of adding a flat replacement hand.
      if(ready){c.save();c.beginPath();c.ellipse(grip.x,grip.y,grip.rx,grip.ry,0,0,TAU);c.clip();c.drawImage(img,frame.x,frame.y,frame.w,frame.h);c.restore();}c.restore();
      if(p.shield>1){c.strokeStyle='#9be8ff66';c.lineWidth=2;c.beginPath();c.arc(0,-10,37,0,TAU);c.stroke();}
    }
    summonedCreature(e){
      const asset=NecroCreatureArt.assets[e.type],img=this.summonSprites.get(e.type);if(!asset||!img?.complete||!img.naturalWidth)return false;
      const c=this.ctx,scale=e.elite?1.65:e.leader?1.2:1,motion=this.minionMotion.get(e),pose=NecroMotion.pose(motion),floating=e.type==='spirit';
      c.save();c.scale(scale,scale);this.ellipse(0,19,17,5,'#08071277');c.strokeStyle=e.elite?'#e5c384aa':'#75ead780';c.lineWidth=e.elite?2:1;c.beginPath();c.ellipse(0,18,19,6,0,0,TAU);c.stroke();
      c.save();c.translate(0,this.reduced?0:floating?-3+Math.sin(this.t*3+(e.phase||0))*2.2:pose.bob);c.scale(motion?.facing||1,1);
      if(e.invuln>0&&Math.floor(this.t*14)%2===0)c.globalAlpha=.72;
      if(floating)this.glow(0,-14,32,'#92d9ff22');NecroMotion.paint(c,img,asset.frame,asset.rig,motion);c.restore();
      if(e.elite)this.glyph('seal',0,-51,.5,'#eccc8d');
      if(e.leader){c.fillStyle='#efd497';c.beginPath();c.moveTo(-10,-46);c.lineTo(-12,-55);c.lineTo(-3,-50);c.lineTo(0,-59);c.lineTo(4,-50);c.lineTo(13,-55);c.lineTo(10,-46);c.closePath();c.fill();}c.restore();
      if(e.hp<e.maxHp){c.fillStyle='#110c20';c.fillRect(-15,28,30,3);c.fillStyle='#80e9ce';c.fillRect(-15,28,30*Math.max(0,e.hp/e.maxHp),3);}return true;
    }
    creaturePortrait(canvas,entry){
      const previous=this.ctx,c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();
      const spec=entry.preview,size=spec.boss||spec.miniBoss?spec.r/21:1;c.translate(canvas.width/2,canvas.height*.68);c.scale(4.1/size,4.1/size);
      this.ctx=c;try{this.creature({...spec,portrait:true,hp:spec.maxHp||1,maxHp:spec.maxHp||1},entry.friendly);}finally{c.restore();this.ctx=previous;}
    }
    creature(e,friendly=false,corpse=false){
      if(friendly&&!corpse&&this.summonedCreature(e))return;
      const c=this.ctx,t=this.t,eScale=e.elite?1.65:e.leader?1.2:1;const size=e.boss||e.miniBoss?e.r/21:1;
      c.save();c.scale(eScale*size,eScale*size);const bob=corpse?0:Math.sin(t*5+(e.phase||0))*1.5;
      this.ellipse(0,15,20,6,'#08071266');
      if(!corpse){c.strokeStyle=friendly?'#75ead799':'#f58d7588';c.lineWidth=1.5;c.beginPath();c.ellipse(0,13,19,7,0,0,TAU);c.stroke();}
      c.translate(0,bob);if(corpse){c.rotate(-1.35);c.scale(.78,.85);c.globalAlpha=.64;}
      const type=e.boss||e.miniBoss?'boss':e.type,hit=e.hit>0;
      c.lineWidth=2.5;c.strokeStyle='#1a1024';
      if(type==='slime'){
        c.fillStyle=hit?'#f8d8df':'#c56c96';c.beginPath();c.moveTo(-19,8);c.bezierCurveTo(-25,-13,-6,-24,3,-15);c.bezierCurveTo(15,-25,27,-1,18,11);c.quadraticCurveTo(0,20,-19,8);c.fill();c.stroke();
        this.ellipse(-7,-6,5,3,'#efb0c366');
      }else if(type==='zombie'){
        c.fillStyle='#555271';c.fillRect(-10,3,20,15);c.strokeRect(-10,3,20,15);
        this.ellipse(0,-7,16,16,hit?'#d5ffe8':'#7cc3aa');c.strokeStyle='#1a1024';c.stroke();
        c.strokeStyle='#4c887b';c.lineWidth=2;c.beginPath();c.moveTo(-10,-17);c.lineTo(6,-17);c.moveTo(-6,-20);c.lineTo(-6,-14);c.moveTo(0,-20);c.lineTo(0,-14);c.stroke();
        c.strokeStyle='#78b69f';c.lineWidth=6;c.beginPath();c.moveTo(-10,5);c.lineTo(-20,0);c.moveTo(10,5);c.lineTo(20,0);c.stroke();
      }else if(type==='skeleton'){
        c.strokeStyle='#cfc8de';c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(0,13);c.moveTo(-9,5);c.lineTo(9,5);c.moveTo(-8,10);c.lineTo(8,10);c.moveTo(0,13);c.lineTo(-8,19);c.moveTo(0,13);c.lineTo(8,19);c.stroke();
        this.ellipse(0,-10,15,14,'#ded9ed');c.strokeStyle='#3b294c';c.lineWidth=2;c.stroke();
        c.strokeStyle='#ae86d8';c.lineWidth=2;c.beginPath();c.arc(22,1,13,-1.2,1.2);c.moveTo(27,-11);c.lineTo(27,13);c.stroke();
      }else if(type==='spirit'){
        this.glow(0,0,35,'#91e5f122');c.fillStyle='#9cdbe5';c.beginPath();c.moveTo(-16,8);c.bezierCurveTo(-23,-25,23,-27,17,8);c.lineTo(10,15);c.lineTo(2,10);c.lineTo(-5,16);c.lineTo(-10,10);c.closePath();c.fill();c.stroke();
      }else if(type==='eye'){
        c.fillStyle='#a573c0';for(let i=0;i<6;i++){const a=i*TAU/6;c.beginPath();c.moveTo(Math.cos(a)*10,Math.sin(a)*10);c.lineTo(Math.cos(a)*28,Math.sin(a)*22);c.lineTo(Math.cos(a+.5)*12,Math.sin(a+.5)*12);c.fill();}
        this.ellipse(0,-2,19,15,'#ded1e8');c.stroke();this.circle(0,-2,9,'#b55b7b');this.circle(0,-2,4,'#22142e');this.circle(-3,-5,2,'#fff0ef');
      }else if(type==='eater'){
        c.fillStyle=hit?'#eed3bb':'#b88480';c.beginPath();c.ellipse(0,1,23,21,0,0,TAU);c.fill();c.stroke();this.ellipse(0,5,15,9,'#46283f');
        c.fillStyle='#eed6bc';for(let i=0;i<5;i++)c.fillRect(-12+i*5,-2,3,5);
        c.strokeStyle='#e19f80';c.lineWidth=5;c.beginPath();c.moveTo(-19,5);c.lineTo(-28,13);c.moveTo(19,5);c.lineTo(28,13);c.stroke();
      }else if(type==='knight'){
        c.fillStyle='#67566f';c.beginPath();c.moveTo(-15,0);c.lineTo(-19,17);c.lineTo(17,17);c.lineTo(15,-3);c.closePath();c.fill();c.stroke();
        c.fillStyle=hit?'#dac7ed':'#7f718e';c.beginPath();c.moveTo(-18,-16);c.lineTo(0,-27);c.lineTo(18,-16);c.lineTo(15,1);c.lineTo(-15,1);c.closePath();c.fill();c.stroke();
        c.strokeStyle='#ffae8f';c.lineWidth=3;c.beginPath();c.moveTo(-10,-10);c.lineTo(10,-10);c.stroke();
        c.strokeStyle='#d6b9c0';c.lineWidth=6;c.beginPath();c.moveTo(26,13);c.lineTo(26,-26);c.stroke();c.lineWidth=3;c.beginPath();c.moveTo(18,3);c.lineTo(34,3);c.stroke();
      }else{
        const boss=type==='boss';c.fillStyle=hit?'#f0cfdf':boss?'#a56ba4':'#b87785';
        c.beginPath();c.moveTo(-18,12);c.quadraticCurveTo(-25,-13,-13,-19);c.lineTo(-18,-32);c.lineTo(-3,-22);c.lineTo(5,-22);c.lineTo(18,-32);c.lineTo(14,-18);c.quadraticCurveTo(27,-5,18,13);c.closePath();c.fill();c.stroke();
        if(boss){c.fillStyle='#635075';c.beginPath();c.moveTo(-14,4);c.lineTo(-23,20);c.lineTo(23,20);c.lineTo(13,4);c.closePath();c.fill();c.stroke();this.circle(0,10,3,'#e5acb4');}
      }
      if(corpse||!['eye','knight'].includes(type)){
        if(corpse){c.strokeStyle='#211b2b';c.lineWidth=2;for(const x of [-6,6]){c.beginPath();c.moveTo(x-2,-8);c.lineTo(x+2,-4);c.moveTo(x+2,-8);c.lineTo(x-2,-4);c.stroke();}}
        else{const eyeColor=friendly?'#273044':'#3c203b';this.ellipse(-6,-6,2.2,3,eyeColor);this.ellipse(6,-6,2.2,3,eyeColor);c.strokeStyle=eyeColor;c.lineWidth=1;c.beginPath();c.arc(0,0,3,0,Math.PI);c.stroke();}
      }
      if(e.leader&&!corpse){c.fillStyle='#efd497';c.beginPath();c.moveTo(-10,-27);c.lineTo(-12,-36);c.lineTo(-3,-31);c.lineTo(0,-40);c.lineTo(4,-31);c.lineTo(13,-36);c.lineTo(10,-27);c.closePath();c.fill();}
      if(e.miniBoss&&!corpse){c.fillStyle='#ffd18c';c.beginPath();c.moveTo(-10,-28);c.lineTo(-13,-38);c.lineTo(-4,-33);c.lineTo(0,-43);c.lineTo(5,-33);c.lineTo(13,-38);c.lineTo(10,-28);c.closePath();c.fill();}
      c.restore();
      if(!corpse&&!e.boss&&e.hp<e.maxHp){c.fillStyle='#110c20';c.fillRect(-15,24,30,3);c.fillStyle=friendly?'#80e9ce':'#f7a88f';c.fillRect(-15,24,30*Math.max(0,e.hp/e.maxHp),3);}
      if(e.miniBoss&&!corpse&&!e.portrait){c.fillStyle='#f4ce9b';c.font='600 10px Segoe UI';c.textAlign='center';c.fillText('TRÙM NHỎ',0,-62);}
    }
    worldObject(x,y,fn,extent=160){const p=this.point(x,y),margin=Math.max(160,extent*this.zoom);if(p.x< -margin||p.x>this.w+margin||p.y< -margin||p.y>this.h+margin)return;const c=this.ctx;c.save();c.translate(p.x,p.y);c.scale(this.zoom,this.zoom);fn();c.restore();}
    render(game,dt,stage=0,profile){
      this.t+=dt;const c=this.ctx,p=game?.player,config=game?.config||D.stages[stage];
      // Keep the player in the clear battlefield between the mobile controls.
      this.originX=game?(this.w-this.battle.right)/2:this.w/2;this.originY=game?(this.h+this.battle.top-this.battle.bottom)/2+this.battle.shift:this.h/2;
      this.heroMotion=NecroMotion.track(this.heroMotion,p,dt,game?.mode==='playing',this.reduced);
      if(game)for(const m of game.minions)this.minionMotion.set(m,NecroMotion.track(this.minionMotion.get(m),m,dt,game.mode==='playing',this.reduced));
      if(p){this.camera.x+=(p.x-this.camera.x)*(1-Math.exp(-8*dt));this.camera.y+=(p.y-this.camera.y)*(1-Math.exp(-8*dt));}else this.camera={x:0,y:0};
      this.shake=Math.max(0,this.shake-dt*20);this.sx=this.shake?(Math.random()-.5)*this.shake:0;this.sy=this.shake?(Math.random()-.5)*this.shake:0;
      c.setTransform(this.dpr,0,0,this.dpr,0,0);this.background(config);
      if(!game){this.menu(stage,profile);return;}
      this.drawHeroEffects(game);
      for(const z of game.zones)this.worldObject(z.x,z.y,()=>{c.globalAlpha=Math.min(1,z.life/2)*.4;this.ellipse(0,0,z.r,z.r*.6,'#9d58bd');c.globalAlpha=1;});
      for(const w of game.warnings)this.worldObject(w.x,w.y,()=>{const progress=1-w.life/w.max;c.fillStyle='#ef796728';c.strokeStyle='#ff9d83';c.lineWidth=2;c.beginPath();c.arc(0,0,w.r,0,TAU);c.fill();c.stroke();c.fillStyle='#f68d7b55';c.beginPath();c.moveTo(0,0);c.arc(0,0,w.r,-Math.PI/2,-Math.PI/2+TAU*progress);c.closePath();c.fill();});
      const selected=new Set(game.nearbyCorpses().slice(0,5).map(c=>c.id));
      if(game.corpses.length){const pp=this.point(p.x,p.y);c.lineWidth=1;for(const dead of game.corpses)if(selected.has(dead.id)){const s=this.point(dead.x,dead.y);c.strokeStyle='#af8af34d';c.setLineDash([3,7]);c.beginPath();c.moveTo(pp.x,pp.y);c.lineTo(s.x,s.y);c.stroke();}c.setLineDash([]);}
      this.worldObject(p.x,p.y,()=>{c.strokeStyle='#b38cd526';c.lineWidth=1;c.setLineDash([4,9]);c.beginPath();c.arc(0,0,p.summonRange,0,TAU);c.stroke();c.setLineDash([]);
        if(p.fireRing){c.strokeStyle='#c273f388';c.lineWidth=5;c.beginPath();c.arc(0,0,85+p.fireRing*8,0,TAU);c.stroke();}});
      for(const dead of game.corpses)this.worldObject(dead.x,dead.y,()=>{if(dead.life<=5){c.globalAlpha=.3+Math.sin(this.t*12)*.15;this.ellipse(0,7,dead.r+5,dead.r*.5,'#ff777c');c.globalAlpha=1;}this.creature(dead,false,true);if(dead.boss){c.fillStyle='#efc7a7';c.font='10px Segoe UI';c.textAlign='center';c.fillText('5 XÁC',0,28);}});
      for(const g of game.drops)this.worldObject(g.x,g.y,()=>{
        if(g.kind==='heal'){c.fillStyle='#ef9cae';c.font='17px Segoe UI';c.textAlign='center';c.fillText('♥',0,5);}
        else if(g.kind==='gold'){this.circle(0,0,5,'#eac477');c.strokeStyle='#8d633e';c.lineWidth=1.5;c.beginPath();c.moveTo(0,-3);c.lineTo(0,3);c.stroke();}
        else if(g.kind==='item'){
          const color=D.items[g.item].color;this.glow(0,0,32,color+'35');this.circle(0,0,15,'#2c1b40');c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(0,0,15,0,TAU);c.stroke();
          if(g.item==='magnet'){c.beginPath();c.moveTo(-7,-7);c.lineTo(-7,2);c.arc(0,2,7,Math.PI,0,true);c.lineTo(7,-7);c.stroke();}
          else if(g.item==='bomb'){this.circle(0,2,7,color);c.beginPath();c.moveTo(4,-4);c.lineTo(8,-10);c.lineTo(12,-7);c.stroke();}
          else{c.strokeRect(-9,-7,18,16);c.beginPath();c.moveTo(0,-7);c.lineTo(0,9);c.moveTo(-6,-2);c.lineTo(-3,-1);c.moveTo(3,-1);c.lineTo(6,-2);c.stroke();}
        }else{if(g.kind==='mana')this.glow(0,0,17,'#8ecfff33');c.save();c.rotate(Math.PI/4);c.fillStyle=g.kind==='mana'?'#8ecfff':'#a7efd9';c.fillRect(-3.5,-3.5,7,7);c.restore();}
      });
      if(game.bookActive)this.worldObject(p.x,p.y,()=>{c.strokeStyle='#d4acff99';c.lineWidth=2;c.beginPath();c.arc(0,-6,45,0,TAU);c.stroke();});
      const objects=game.obstacles.map(o=>({y:o.y,draw:()=>this.worldObject(o.x,o.y,()=>this.obstacle(o,config))}));
      for(const e of game.enemies)objects.push({y:e.y,draw:()=>this.worldObject(e.x,e.y,()=>{if(e.marked>0){c.fillStyle='#ffc6da';c.font='20px Segoe UI';c.textAlign='center';c.fillText('⌖',0,-e.r-18);}this.creature(e);if(e.frozen>0){c.strokeStyle='#b6f2ffbb';c.fillStyle='#9edcff22';c.lineWidth=2;c.beginPath();for(let i=0;i<6;i++){const a=i*TAU/6-Math.PI/2,x=Math.cos(a)*(e.r+9),y=Math.sin(a)*(e.r+15)-5;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();c.stroke();}})});
      for(const m of game.minions)objects.push({y:m.y,draw:()=>this.worldObject(m.x,m.y,()=>this.creature(m,true))});
      objects.push({y:p.y,draw:()=>this.worldObject(p.x,p.y,()=>this.wizard(p))});objects.sort((a,b)=>a.y-b.y);for(const o of objects)o.draw();
      for(const b of game.bullets){const s=this.point(b.x,b.y);c.strokeStyle=b.kind==='hostile'?'#f89785':b.kind==='bone'?'#e4d9f9':b.color||'#ca8eff';c.lineWidth=b.kind==='bone'?3:4;c.lineCap='round';c.beginPath();c.moveTo(s.x-b.vx*.018*this.zoom,s.y-b.vy*.018*this.zoom);c.lineTo(s.x,s.y);c.stroke();this.circle(s.x,s.y,b.r*this.zoom,c.strokeStyle);}
      if(game.firewall){const f=game.firewall;this.worldObject(f.x,f.y,()=>{c.strokeStyle='#ef6e8599';c.lineWidth=8;c.beginPath();c.arc(0,0,f.r,0,TAU);c.stroke();for(let i=0;i<50;i++){const a=i*TAU/50;c.fillStyle=i%2?'#e975af':'#f49a78';c.beginPath();c.moveTo(Math.cos(a)*(f.r-5),Math.sin(a)*(f.r-5));c.lineTo(Math.cos(a+.012)*(f.r+10+Math.sin(this.t*6+i)*7),Math.sin(a+.012)*(f.r+10+Math.sin(this.t*6+i)*7));c.lineTo(Math.cos(a+.025)*(f.r-5),Math.sin(a+.025)*(f.r-5));c.fill();}},f.r+30);}
      for(const r of this.rings){r.life-=dt;r.r+=(r.max-r.r)*dt*8;this.worldObject(r.x,r.y,()=>{c.globalAlpha=Math.max(0,r.life);c.strokeStyle=r.color;c.lineWidth=4;c.beginPath();c.arc(0,0,r.r,0,TAU);c.stroke();c.globalAlpha=1;},r.max);}this.rings=this.rings.filter(r=>r.life>0);
      for(const thread of this.threads){thread.life-=dt;c.globalAlpha=Math.max(0,thread.life*1.8);c.strokeStyle=thread.color;c.lineWidth=2;c.beginPath();thread.points.forEach((p,i)=>{const q=this.point(p.x,p.y);i?c.lineTo(q.x,q.y-8):c.moveTo(q.x,q.y-8);});c.stroke();}this.threads=this.threads.filter(t=>t.life>0);c.globalAlpha=1;
      for(const q of this.particles){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;const s=this.point(q.x,q.y);c.globalAlpha=Math.max(0,q.life);this.circle(s.x,s.y,2*this.zoom,q.color);}this.particles=this.particles.filter(q=>q.life>0);c.globalAlpha=1;
      c.font='bold 11px Segoe UI';c.textAlign='center';for(const n of this.numbers){n.life-=dt;n.y-=22*dt;const s=this.point(n.x,n.y);c.globalAlpha=Math.max(0,Math.min(1,n.life*3));c.fillStyle=n.color;c.fillText(n.text,s.x,s.y);}this.numbers=this.numbers.filter(n=>n.life>0);c.globalAlpha=1;
      // Keep the current boss findable outside the camera view.
      const arrowTop=this.battle.top?this.battle.top+12:150,arrowBottom=this.battle.bottom?this.h-this.battle.bottom-12:this.h-125,arrowRight=this.w-this.battle.right-30;
      for(const boss of game.enemies.filter(e=>e.boss)){const b=this.point(boss.x,boss.y);if(b.x<35||b.x>arrowRight+5||b.y<arrowTop||b.y>arrowBottom){const x=Math.max(30,Math.min(arrowRight,b.x)),y=Math.max(arrowTop,Math.min(arrowBottom,b.y)),a=Math.atan2(b.y-this.originY,b.x-this.originX);c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#f6b5bc';c.beginPath();c.moveTo(10,0);c.lineTo(-7,-6);c.lineTo(-7,6);c.fill();c.restore();}}
      const vg=c.createRadialGradient(this.w/2,this.h/2,Math.min(this.w,this.h)*.25,this.w/2,this.h/2,Math.max(this.w,this.h)*.7);vg.addColorStop(0,'#10081c00');vg.addColorStop(1,'#10081c88');c.fillStyle=vg;c.fillRect(0,0,this.w,this.h);
    }
    menu(stage,profile){
      if(matchMedia('(max-width:700px), (max-width:950px) and (max-height:500px)').matches)return;
      const mobile=this.w<700,c=this.ctx,x=this.w*(mobile?.69:.72),y=this.h*(mobile?.68:.42),scale=mobile?1.15:2.3;
      this.glow(x,y,220,'#ae73ec25');c.save();c.translate(x,y+28);c.strokeStyle='#b288db33';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,0,95+i*30,43+i*18,0,0,TAU);c.stroke();}c.restore();
      c.save();c.translate(x,y);c.scale(scale,scale);this.wizard({look:1,invuln:0,shield:0,presentation:true,heroId:profile?.equipped.hero,weaponId:profile?.equipped.weapon});c.restore();
      const friends=mobile?[['zombie',-95,31],['skeleton',70,30],['spirit',-70,-65]]:[['zombie',-110,80],['skeleton',95,65],['spirit',-110,-110]];
      for(const [type,dx,dy] of friends){c.save();c.translate(x+dx,y+dy);c.scale(mobile?1:1.25,mobile?1:1.25);this.creature({type,phase:dx,hp:1,maxHp:1},true);c.restore();}
      const shade=c.createLinearGradient(0,0,this.w,0);shade.addColorStop(0,'#17101ff0');shade.addColorStop(.4,'#17101f88');shade.addColorStop(.72,'#17101f00');c.fillStyle=shade;c.fillRect(0,0,this.w,this.h);
    }
  }
  root.NecroRenderer=Renderer;
})(globalThis);

