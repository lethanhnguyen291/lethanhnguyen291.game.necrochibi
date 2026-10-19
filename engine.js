(function(root){
  'use strict';
  const D=root.NecroData||(typeof require==='function'?require('./data.js'):null);
  const P=root.NecroProgression||(typeof require==='function'?require('./progression.js'):null);
  const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const BOOK_GAIN=['maxHp','maxMana','damage','speed','manaRegen','regen','magnet','summonRange','minionPower','minionHealth','armor'];
  const BOOK_FASTER=['fireInterval','dashMax','summonCooldown','heroSkillCooldown'];
  function encounterAt(time,difficulty=1){
    const t=clamp(time,0,600),late=clamp((t-360)/120,0,1),tier=Math.min(4,Math.floor(t/120));
    return{tier,health:difficulty*(1+Math.min(t,360)/500+Math.max(0,t-360)/1800),heavyHealth:{eater:1-late*.1,knight:1-late*.2},
      cap:time>=600?90:time>=360?110:145,count:time>=600?2:time>=420?4:time>=360?3:Math.min(5,1+Math.floor(t/130)),
      interval:(time>=600?1.12:time>=420?.9:time>=360?.98:Math.max(.55,1.05-t*.0007))/Math.sqrt(difficulty),
      resting:time>=420&&time<600&&(time-420)%28>=23,
      weights:[[1,0,0,0,0],[.425,.575,0,0,0],[11/30,7/60,31/60,0,0],[.37,.2,.17,.26,0],[.28,.18,.14,.18,.22]][tier]};
  }
  class Game{
    constructor(stage=0,random=Math.random,profile){
      this.random=random;this.stage=clamp(stage|0,0,4);this.config=D.stages[this.stage];this.mode='playing';
      this.time=0;this.id=0;this.level=1;this.xp=0;this.xpNeed=10;this.kills=0;this.regularKills=0;this.summoned=0;this.totalFusions=0;
      this.enemies=[];this.corpses=[];this.minions=[];this.bullets=[];this.drops=[];this.zones=[];this.warnings=[];this.effects=[];this.events=[];
      this.bossSpawned=[false,false,false];this.bossKilled=[false,false,false];this.firewall=null;this.offers=[];
      this.spawnClock=.5;this.shootClock=.1;this.auraClock=0;this.corpseLifetime=30;this.maxMinions=80;this.minionLeash=300;this.spawnRadius=540;this.worldRadius=1900;
      this.inventory={magnet:0,bomb:0,book:0};this.itemUses={magnet:0,bomb:0,book:0};this.maxItemUses=3;this.gold=0;this.nextMiniBoss=30;this.miniBossesSpawned=0;this.bookRemaining=0;this.bookActive=false;
      this.bankedGold=0;this.autoSummon=false;this.autoIndex=0;this.autoClock=0;this.heroCooldown=0;this.weaponHits=0;
      this.player={x:0,y:0,r:15,hp:130,maxHp:130,mana:100,maxMana:100,manaRegen:5,speed:175,damage:20,fireInterval:.65,
        shots:1,bounces:0,magnet:95,summonRange:250,regen:0,minionPower:1,minionHealth:1,summonCooldown:1,heroSkillCooldown:1,
        corpseNeed:5,fusion:false,poison:false,split:false,explosion:false,recycle:false,leader:false,
        sacrifice:false,commander:false,siphon:false,fireRing:0,wardPower:0,armor:0,shield:0,invuln:1,reviveCharges:0,staffSlow:0,
        dash:0,dashMax:3.7,dashTime:0,dashX:0,dashY:1,look:1,cooldowns:{zombie:0,skeleton:0,spirit:0},upgrades:{}};
      this.loadout=P.applyToPlayer(this.player,profile);
      this.obstacles=[];
      for(let i=0;i<32;i++){const a=this.random()*TAU,r=330+this.random()*1350;this.obstacles.push({x:Math.cos(a)*r,y:Math.sin(a)*r,r:18+this.random()*16,variant:i%3});}
      for(let i=0;i<8;i++){const a=i*TAU/8;this.spawnEnemy('slime',{x:Math.cos(a)*260,y:Math.sin(a)*260});}
    }
    emit(type,data={}){if(this.events.length>=240)this.events.shift();this.events.push({type,...data});}
    drainEvents(){return this.events.splice(0);}
    nearest(origin,entities,range=Infinity,predicate=()=>true){let best=null,limit=range*range;for(const e of entities){if(e.dead)continue;const dx=e.x-origin.x,dy=e.y-origin.y,d=dx*dx+dy*dy;if(d<limit&&predicate(e)){limit=d;best=e;}}return best;}
    around(origin,range){return this.enemies.filter(e=>!e.dead&&distance(e,origin)<range+e.r);}
    aliveMinions(){return this.minions.filter(m=>!m.dead);}
    nearbyCorpses(){return this.corpses.filter(c=>!c.dead&&c.life>0&&distance(c,this.player)<=this.player.summonRange).sort((a,b)=>distance(a,this.player)-distance(b,this.player));}
    corpseValue(){return this.nearbyCorpses().reduce((n,c)=>n+c.value,0);}
    setAutoSummon(enabled){this.autoSummon=!!enabled;this.autoClock=0;return this.autoSummon;}
    updateAutoSummon(dt){
      if(!this.autoSummon||this.mode!=='playing')return;this.autoClock-=dt;if(this.autoClock>0)return;this.autoClock=.2;
      const type=['zombie','skeleton','spirit'][this.autoIndex];
      if(this.summonPlan(type).ok){const result=this.summon(type);this.autoIndex=(this.autoIndex+1)%3;this.emit('autoCast',{summonType:type,count:result.count});}
    }
    heroSkillPlan(){
      const spec=this.loadout.hero.ability,p=this.player,factor=this.bookActive?1.2:1,range=spec.range*factor;
      const plan={mana:spec.mana,cooldown:spec.cooldown*p.heroSkillCooldown,range};
      if(this.mode!=='playing')return{...plan,ok:false,reason:'Hãy tiếp tục trận để dùng kỹ năng tướng.'};
      if(this.heroCooldown>.001)return{...plan,ok:false,reason:spec.name+' đang hồi '+Math.ceil(this.heroCooldown)+' giây.'};
      if(p.mana+.0001<spec.mana)return{...plan,ok:false,reason:'Cần '+spec.mana+' mana để dùng '+spec.name+'.'};
      const targets=spec.id==='garden'?[]:this.around(p,range).sort((a,b)=>distance(a,p)-distance(b,p));
      if(spec.id!=='garden'&&!targets.length)return{...plan,ok:false,reason:'Chưa có quái trong tầm '+spec.name+'.'};
      return{...plan,ok:true,targets};
    }
    useHeroSkill(){
      const plan=this.heroSkillPlan();if(!plan.ok){this.emit('notice',{text:plan.reason});return plan;}
      const p=this.player,spec=this.loadout.hero.ability,factor=this.bookActive?1.2:1;
      p.mana=Math.max(0,p.mana-plan.mana);this.heroCooldown=plan.cooldown;
      if(spec.id==='stitch'){
        const targets=plan.targets.slice(0,6),points=targets.map(e=>({x:e.x,y:e.y}));
        this.effects.push({kind:'stitch',x:p.x,y:p.y,life:1.2,targetIds:targets.map(e=>e.id),points,damage:p.damage*.65,color:spec.color});
        for(const e of targets)this.hurtEnemy(e,16+p.damage*1.35,'hero');
        this.emit('heroSkill',{kind:'stitch',x:p.x,y:p.y,r:plan.range,color:spec.color,points});
      }else if(spec.id==='garden'){
        this.effects.push({kind:'garden',x:p.x,y:p.y,r:plan.range,life:6,heal:4*factor,allyHeal:.03*factor,color:spec.color});
        this.emit('heroSkill',{kind:'garden',x:p.x,y:p.y,r:plan.range,color:spec.color});
      }else{
        for(const e of plan.targets){this.freezeEnemy(e,1.6);this.hurtEnemy(e,15+p.damage*1.2,'hero');}
        this.effects.push({kind:'nova',x:p.x,y:p.y,r:plan.range,life:1.2,color:spec.color});
        this.emit('heroSkill',{kind:'nova',x:p.x,y:p.y,r:plan.range,color:spec.color});
      }
      this.emit('notice',{text:spec.name+' · −'+plan.mana+' mana.'});return{ok:true,mana:plan.mana,cooldown:plan.cooldown};
    }
    freezeEnemy(enemy,seconds){if(enemy.dead)return;if(enemy.boss||enemy.miniBoss)enemy.slow=Math.max(enemy.slow||0,2.5);else enemy.frozen=Math.max(enemy.frozen||0,seconds);}
    registerWeaponHit(target){
      if(this.mode!=='playing')return;const p=this.player,weapon=this.loadout.weapon,special=weapon.special;
      this.weaponHits++;if(this.weaponHits<special.every)return;this.weaponHits=0;
      const event={x:target.x,y:target.y,color:weapon.color,kind:special.id,r:90};
      if(special.id==='seal'){for(const e of this.around(target,85))this.hurtEnemy(e,p.damage*.7,'weapon');}
      else if(special.id==='leaf'){
        const next=this.nearest(target,this.enemies,240,e=>e!==target);if(next)this.hurtEnemy(next,p.damage*.65,'weapon');p.hp=Math.min(p.maxHp,p.hp+2);event.points=[{x:p.x,y:p.y},{x:target.x,y:target.y},...(next?[{x:next.x,y:next.y}]:[])];
      }else if(special.id==='embers'){
        const fires=this.effects.filter(f=>f.kind==='embers');if(fires.length>=3)this.effects.splice(this.effects.indexOf(fires[0]),1);
        this.effects.push({kind:'embers',x:target.x,y:target.y,r:95,life:3,damage:p.damage*.3,color:weapon.color});event.r=95;
      }else if(special.id==='frost'){
        for(const e of this.around(target,105)){this.freezeEnemy(e,1);this.hurtEnemy(e,p.damage*.55,'weapon');}event.r=105;
      }else{
        p.mana=Math.min(p.maxMana,p.mana+5);for(const type in p.cooldowns)p.cooldowns[type]=Math.max(0,p.cooldowns[type]-.8);event.x=p.x;event.y=p.y;
      }
      this.emit('relic',event);
    }
    updateHeroEffects(dt){
      const p=this.player;
      for(const f of this.effects){
        if(f.life<=.000001)continue;const elapsed=Math.min(dt,f.life);f.life-=dt;
        if(f.kind==='garden'){
          if(distance(p,f)<=f.r+p.r)p.hp=Math.min(p.maxHp,p.hp+f.heal*elapsed);
          for(const m of this.minions)if(!m.dead&&distance(m,f)<=f.r+m.r)m.hp=Math.min(m.maxHp,m.hp+m.maxHp*f.allyHeal*elapsed);
          for(const e of this.around(f,f.r))e.slow=Math.max(e.slow||0,.35);
        }else if(f.kind==='embers'){for(const e of this.around(f,f.r))this.hurtEnemy(e,f.damage*elapsed,'weapon');}
        else if(f.kind==='stitch'&&f.life<=.000001){
          for(const id of f.targetIds){const e=this.enemies.find(e=>e.id===id&&!e.dead);if(e)this.hurtEnemy(e,f.damage,'hero');}
          this.emit('relic',{kind:'seal',x:f.x,y:f.y,color:f.color,r:80,points:f.points});
        }
      }
    }
    fusionGroups(minions,preferred){
      const types=[preferred,...Object.keys(D.summons).filter(t=>t!==preferred)];
      for(const type of types){const same=minions.filter(m=>!m.dead&&!m.elite&&!m.leader&&m.type===type);
        for(const anchor of same){const close=same.filter(m=>distance(m,anchor)<=240).sort((a,b)=>distance(a,anchor)-distance(b,anchor));if(close.length>=5)return close.slice(0,5);}
      }return null;
    }
    summonPlan(type){
      if(!D.summons[type])return{ok:false,reason:'Kỹ năng không tồn tại.'};
      const p=this.player,spec=D.summons[type],near=this.nearbyCorpses(),available=near.reduce((n,c)=>n+c.value,0);
      const use=Math.min(p.corpseNeed,available),count=!use?0:use===p.corpseNeed?5:Math.max(1,Math.floor(use*5/p.corpseNeed));
      const mana=Math.round(spec.mana*count/5*10)/10;
      const preview={count,mana};
      if(this.mode!=='playing')return{...preview,ok:false,reason:'Hãy tiếp tục trận trước khi gọi đệ.'};
      if(p.cooldowns[type]>.001)return{...preview,ok:false,reason:`${spec.name} đang hồi ${Math.ceil(p.cooldowns[type])} giây.`};
      if(!available)return{...preview,ok:false,reason:'Chưa có xác trong vòng gọi. Hạ quái rồi lại gần xác nhé.'};
      if(p.mana+.0001<mana)return{...preview,ok:false,reason:`Thiếu mana: cần ${mana}, hiện có ${Math.floor(p.mana)}.`};
      const corpses=[];let value=0;for(const c of near){corpses.push(c);value+=c.value;if(value>=use)break;}
      const remaining=this.aliveMinions().slice(),groups=[];
      while(remaining.length+count>this.maxMinions){
        if(!p.fusion)return{...preview,ok:false,reason:`Quân đoàn đã đầy ${this.maxMinions} ô. Nâng cấp Hợp nhất đệ để gọi thêm.`};
        const group=this.fusionGroups(remaining,type);if(!group)return{...preview,ok:false,reason:'Chưa có 5 đệ thường cùng loại trong tầm 240 để hợp nhất.'};
        groups.push(group);for(const m of group)remaining.splice(remaining.indexOf(m),1);
        remaining.push({elite:true,type:group[0].type,x:group[0].x,y:group[0].y});
      }
      return{ok:true,count,mana,corpses,groups,leader:p.leader&&corpses.some(c=>c.boss)};
    }
    summon(type){
      const plan=this.summonPlan(type);if(!plan.ok){this.emit('notice',{text:plan.reason});return plan;}
      // Planning never mutates mana, corpses or minions: a failed cast costs nothing.
      for(const group of plan.groups){
        let x=0,y=0;for(const m of group){x+=m.x;y+=m.y;m.dead=true;}
        this.createMinion(group[0].type,x/5,y/5,{elite:true});this.totalFusions++;this.emit('fusion',{x:x/5,y:y/5});
      }
      for(const c of plan.corpses)c.dead=true;
      this.player.mana=Math.max(0,this.player.mana-plan.mana);
      this.player.cooldowns[type]=D.summons[type].cooldown*this.player.summonCooldown;
      for(let i=0;i<plan.count;i++){
        const c=plan.corpses[i%plan.corpses.length],a=i*TAU/plan.count;
        this.createMinion(type,c.x+Math.cos(a)*12,c.y+Math.sin(a)*12,{leader:plan.leader&&i===0});this.summoned++;
        this.emit('summon',{x:c.x,y:c.y,color:D.summons[type].color});
      }
      this.minions=this.minions.filter(m=>!m.dead);this.corpses=this.corpses.filter(c=>!c.dead);
      return plan;
    }
    createMinion(type,x,y,extra={}){
      const spec=D.summons[type],m={id:++this.id,type,x,y,r:12,hp:1,maxHp:1,damage:spec.damage,speed:spec.speed,attack:.35,invuln:.5,dead:false,elite:false,leader:false,returning:false,phase:this.random()*TAU,...extra};
      this.refreshMinion(m,true);this.minions.push(m);return m;
    }
    refreshMinion(m,full=false){
      const ratio=full?1:m.hp/m.maxHp,p=this.player,s=D.summons[m.type],growth=1+(this.level-1)*.012;
      m.maxHp=s.hp*p.minionHealth*growth*(m.elite?3.6:1)*(m.leader?1.3:1);
      m.hp=m.maxHp*ratio;m.damage=s.damage*p.minionPower*growth*(m.elite?2.7:1)*(m.leader?1.2:1);m.r=m.elite?22:m.leader?16:12;
    }
    spawnEnemy(type='slime',position){
      const wave=encounterAt(this.time,this.config.difficulty);
      if(this.enemies.filter(e=>!e.dead&&!e.boss&&!e.miniBoss).length>=wave.cap)return null;
      const spec=D.enemies[type];if(!spec)return null;
      const a=this.random()*TAU,r=this.spawnRadius+this.random()*70,p=this.player;
      let pos=position||{x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r};
      if(this.firewall&&!position){pos=this.ringPosition(a,this.firewall.r-35);}
      const scale=wave.health*(wave.heavyHealth[type]||1);
      const e={id:++this.id,type,...spec,x:pos.x,y:pos.y,hp:spec.hp*scale,maxHp:spec.hp*scale,damage:spec.damage*this.config.difficulty,speed:spec.speed,attack:1+this.random(),contactCooldown:0,hit:0,slow:0,marked:0,dead:false,phase:this.random()*TAU,eaten:0};
      this.bound(e);this.enemies.push(e);return e;
    }
    spawnBoss(index){
      if(this.bossSpawned[index])return null;this.bossSpawned[index]=true;
      if(index===2){this.firewall={x:this.player.x,y:this.player.y,r:500};}
      const a=this.random()*TAU,pos=index===2?this.ringPosition(a,370):{x:this.player.x+Math.cos(a)*380,y:this.player.y+Math.sin(a)*380};
      const hp=[2200,8500,36000][index]*this.config.difficulty,damageRegen=hp*(index===2?.06:.18);
      const e={id:++this.id,type:'boss',boss:true,bossIndex:index,name:['Gác mộ bé bự','Nữ hoàng xương','Chúa tể quái triều'][index],x:pos.x,y:pos.y,r:[38,45,61][index],hp,maxHp:hp,armor:[.05,.12,.2][index],damageRegen,damageBudget:damageRegen*.25,damage:[19,26,38][index]*this.config.difficulty,speed:[44,49,57][index],xp:35+index*25,attack:2,army:8,roar:10,contactCooldown:0,hit:0,slow:0,marked:0,dead:false,phase:0};
      this.bound(e);this.enemies.push(e);this.emit('boss',{index,text:`${index===2?'TRÙM CUỐI':'BOSS '+(index+1)} · ${e.name}`});return e;
    }
    ringPosition(a,r){const f=this.firewall;return{x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r};}
    spawnMiniBoss(){
      const a=this.random()*TAU,pos=this.firewall?this.ringPosition(a,this.firewall.r-70):{x:this.player.x+Math.cos(a)*330,y:this.player.y+Math.sin(a)*330};
      const hp=(240+this.time*2.2)*this.config.difficulty;
      const e={id:++this.id,type:'miniBoss',miniBoss:true,name:'Tiểu vương âm phủ',x:pos.x,y:pos.y,r:27,hp,maxHp:hp,damage:(13+this.time/45)*this.config.difficulty,speed:78,armor:.08,xp:8,attack:1.8,contactCooldown:0,hit:0,slow:0,marked:0,dead:false,phase:this.random()*TAU};
      this.bound(e);this.enemies.push(e);this.miniBossesSpawned++;this.emit('miniBoss',{x:e.x,y:e.y,text:'Trùm nhỏ xuất hiện · Hạ nó để lấy vật phẩm!'});return e;
    }
    dropItem(x,y){
      const eligible=Object.keys(D.items).filter(type=>this.itemUses[type]+this.inventory[type]+this.drops.filter(d=>!d.dead&&d.kind==='item'&&d.item===type).length<this.maxItemUses);
      if(!eligible.length)return null;
      const type=eligible[Math.floor(this.random()*eligible.length)],drop={id:++this.id,x,y,kind:'item',item:type,value:1,pull:false};this.drops.push(drop);return drop;
    }
    collectDrop(drop){
      if(drop.dead)return 0;drop.dead=true;const p=this.player;
      if(drop.kind==='xp')return drop.value;
      if(drop.kind==='gold')this.gold+=drop.value;
      else if(drop.kind==='mana')p.mana=Math.min(p.maxMana,p.mana+drop.value);
      else if(drop.kind==='heal')p.hp=Math.min(p.maxHp,p.hp+drop.value);
      else if(drop.kind==='item'){
        if(this.itemUses[drop.item]+this.inventory[drop.item]<this.maxItemUses){this.inventory[drop.item]++;this.emit('notice',{text:'Nhặt được '+D.items[drop.item].name+' · Bấm '+D.items[drop.item].key+' để dùng.'});}
      }return 0;
    }
    itemPlan(type){
      if(!D.items[type])return{ok:false,reason:'Vật phẩm không tồn tại.'};
      if(this.mode!=='playing')return{ok:false,reason:'Hãy tiếp tục trận để dùng vật phẩm.'};
      if(this.itemUses[type]>=this.maxItemUses)return{ok:false,reason:D.items[type].name+' đã dùng đủ 3 lần trong trận.'};
      if(type==='book'&&this.bookActive)return{ok:false,reason:'Sách đang có hiệu lực, còn '+Math.ceil(this.bookRemaining)+' giây.'};
      if(this.inventory[type]<1)return{ok:false,reason:'Chưa có '+D.items[type].name.toLowerCase()+'. Hạ trùm nhỏ để nhặt.'};
      return{ok:true};
    }
    setBookStats(active){
      if(this.bookActive===active)return;
      const p=this.player,factor=active?1.2:1/1.2;
      for(const key of BOOK_GAIN)p[key]*=factor;
      for(const key of BOOK_FASTER)p[key]/=factor;
      for(const key of ['hp','mana','shield'])p[key]*=factor;
      p.hp=Math.min(p.hp,p.maxHp);p.mana=Math.min(p.mana,p.maxMana);this.bookActive=active;
      for(const m of this.minions)if(!m.dead)this.refreshMinion(m);
    }
    useItem(type){
      const plan=this.itemPlan(type);if(!plan.ok){this.emit('notice',{text:plan.reason});return plan;}
      this.inventory[type]--;this.itemUses[type]++;
      if(type==='magnet'){
        let xp=0;for(const d of this.drops)xp+=this.collectDrop(d);this.drops=this.drops.filter(d=>!d.dead);if(xp)this.addXp(xp);
        this.emit('magnet',{x:this.player.x,y:this.player.y});
      }else if(type==='bomb'){
        for(const e of [...this.enemies]){if(e.dead)continue;this.hurtEnemy(e,e.boss?e.maxHp*.15:e.miniBoss?e.maxHp*.35:e.maxHp*10,'bomb');}
        // Include fresh bomb kills, remove only the farther half, keep nearby summons available.
        const corpses=this.corpses.filter(c=>!c.dead&&c.life>0).sort((a,b)=>distance(a,this.player)-distance(b,this.player));
        this.corpses=corpses.slice(0,Math.ceil(corpses.length/2));this.bullets=this.bullets.filter(b=>b.kind!=='hostile');this.warnings=[];this.clean();this.emit('bomb',{x:this.player.x,y:this.player.y,r:800});
      }else{
        this.setBookStats(true);this.bookRemaining=20;this.emit('book',{x:this.player.x,y:this.player.y});
      }
      this.emit('notice',{text:D.items[type].name+' · Đã dùng '+this.itemUses[type]+'/3 lần'+(type==='book'?' · +20% trong 20 giây.':type==='bomb'?' · Giữ lại '+this.corpses.length+' xác để triệu hồi.':'.')});return{ok:true};
    }
    bound(e,obstacles=false){
      const d=Math.hypot(e.x,e.y),limit=this.worldRadius-e.r;if(d>limit){e.x*=limit/d;e.y*=limit/d;}
      if(obstacles){for(const o of this.obstacles){const dx=e.x-o.x,dy=e.y-o.y,dd=Math.hypot(dx,dy),min=e.r+o.r;if(dd<min){const a=dd>0?Math.atan2(dy,dx):0;e.x=o.x+Math.cos(a)*min;e.y=o.y+Math.sin(a)*min;}}}
    }
    move(e,target,speed,dt,phase=false){
      const dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy);
      if(d>.1){let nx=dx/d,ny=dy/d;const step=Math.min(d,speed*dt);
        if(!phase){
          const ahead={x:e.x+nx*Math.max(step,28),y:e.y+ny*Math.max(step,28)};
          const obstacle=this.obstacles.find(o=>distance(ahead,o)<o.r+e.r+5);
          if(obstacle){
            if(e.navObstacle!==obstacle){e.navObstacle=obstacle;e.navSide=dx*(obstacle.y-e.y)-dy*(obstacle.x-e.x)>=0?1:-1;}
            const a=Math.atan2(e.y-obstacle.y,e.x-obstacle.x)+e.navSide*Math.PI/2;nx=Math.cos(a);ny=Math.sin(a);
          }else e.navObstacle=null;
        }
        e.x+=nx*step;e.y+=ny*step;
      }this.bound(e,!phase);
    }
    hurtEnemy(e,damage,source='staff'){
      if(!e||e.dead||this.mode!=='playing')return 0;
      damage*=1-(e.armor||0);
      if(e.boss){damage=Math.min(damage,e.damageBudget);e.damageBudget-=damage;}
      if(damage<=0)return 0;
      e.hp-=damage;e.hit=.13;this.emit('hit',{x:e.x,y:e.y,damage,color:source==='staff'?'#e5c6ff':'#a2ecdb'});
      const p=this.player;
      if(source==='staff'){
        if(p.staffSlow)e.slow=Math.max(e.slow||0,p.staffSlow);
        if(p.commander)e.marked=4;
        if(p.siphon&&this.random()<.25){p.mana=Math.min(p.maxMana,p.mana+3);for(const t in p.cooldowns)p.cooldowns[t]=Math.max(0,p.cooldowns[t]-.35);}
      }
      if(e.hp>0)return damage;
      e.dead=true;this.kills++;
      if(!e.boss&&!e.miniBoss)this.regularKills++;
      this.corpses.push({id:++this.id,x:e.x,y:e.y,r:e.r,type:e.type,boss:!!(e.boss||e.miniBoss),value:e.boss||e.miniBoss?5:1,life:this.corpseLifetime,dead:false,phase:this.random()*TAU});
      this.drops.push({id:++this.id,x:e.x,y:e.y,value:e.xp,kind:'xp',pull:false});
      // A predictable mana supply rewards fighting without depending on random upgrades.
      if(e.miniBoss||(!e.boss&&this.regularKills%5===0))this.drops.push({id:++this.id,x:e.x,y:e.y,value:e.miniBoss?20:8,kind:'mana',pull:true});
      if(e.boss||e.miniBoss||this.random()<.3)this.drops.push({id:++this.id,x:e.x-12,y:e.y,value:e.boss?30:e.miniBoss?12:1+Math.floor(this.random()*3),kind:'gold',pull:false});
      if(e.miniBoss)this.dropItem(e.x+12,e.y);
      if(this.random()<.025)this.drops.push({id:++this.id,x:e.x+10,y:e.y,value:18,kind:'heal'});
      this.emit('death',{x:e.x,y:e.y,boss:e.boss});
      if(e.boss){this.bossKilled[e.bossIndex]=true;p.mana=Math.min(p.maxMana,p.mana+30);p.hp=Math.min(p.maxHp,p.hp+25);this.emit('notice',{text:`Đã hạ ${e.name} · Hồi 25 máu, 30 mana. Xác boss = 5 xác thường.`});
        if(this.time>=600&&this.bossKilled.every(Boolean)){this.mode='won';this.emit('win');}
      }
      return damage;
    }
    killMinion(m,poison=true){
      if(m.dead)return;m.dead=true;this.emit('minionDeath',{x:m.x,y:m.y});
      if(poison&&m.type==='zombie'&&this.player.poison)this.zones.push({x:m.x,y:m.y,r:m.elite?95:65,life:6,damage:18*this.player.minionPower,kind:'poison'});
    }
    hurtMinion(m,amount){if(m.dead||m.invuln>0)return;m.hp-=amount;m.invuln=.45;if(m.hp<=0)this.killMinion(m);}
    hurtPlayer(amount){
      const p=this.player;if(this.mode!=='playing'||p.invuln>0||p.dashTime>0)return;
      let damage=amount*(1-p.armor);const absorbed=Math.min(p.shield,damage);p.shield-=absorbed;damage-=absorbed;
      if(damage>=p.hp&&p.sacrifice){const m=this.nearest(p,this.minions,220);if(m){this.killMinion(m);p.invuln=1;this.emit('sacrifice',{x:m.x,y:m.y});this.emit('notice',{text:'Hiến tế phòng thủ! Một đệ đã chịu thay đòn chí mạng.'});return;}}
      p.hp=Math.max(0,p.hp-damage);p.invuln=.65;this.emit('hurt',{damage});
      if(p.hp<=0){
        if(p.reviveCharges>0){p.reviveCharges--;p.hp=p.maxHp*.5;p.invuln=3;this.emit('revive',{x:p.x,y:p.y});this.emit('notice',{text:'Hồi sinh! Hồi 50% máu và miễn sát thương 3 giây.'});}
        else{this.mode='lost';this.emit('loss');}
      }
    }
    dash(direction={x:0,y:1}){
      const p=this.player;if(this.mode!=='playing'||p.dash>0)return false;
      const l=Math.hypot(direction.x,direction.y)||1;p.dashX=direction.x/l;p.dashY=direction.y/l;p.dash=p.dashMax;p.dashTime=.18;p.invuln=Math.max(.25,p.invuln);this.emit('dash',{x:p.x,y:p.y});return true;
    }
    shoot(origin,target,{kind='staff',damage=this.player.damage,bounces=0,angle=0}={}){
      const a=Math.atan2(target.y-origin.y,target.x-origin.x)+angle;
      this.bullets.push({id:++this.id,x:origin.x,y:origin.y,vx:Math.cos(a)*(kind==='hostile'?155:kind==='bone'?390:470),vy:Math.sin(a)*(kind==='hostile'?155:kind==='bone'?390:470),r:kind==='hostile'?5:4,life:kind==='hostile'?5:1.65,kind,damage,bounces,color:kind==='staff'?this.player.weaponColor:null,hits:new Set()});
    }
    staffAttack(){
      const p=this.player;let target=this.nearest(p,this.enemies,560);
      if(p.explosion){const ready=this.nearbyCorpses().filter(c=>c.life<=5&&this.around(c,105).length>0);if(ready.length)target=ready[0];}
      if(!target)return;
      p.look=target.x>=p.x?1:-1;
      for(let i=0;i<p.shots;i++)this.shoot(p,target,{bounces:p.bounces,angle:(i-(p.shots-1)/2)*.16});this.emit('shot');
    }
    explodeCorpse(c){
      if(c.dead)return;c.dead=true;this.emit('explosion',{x:c.x,y:c.y,r:c.boss?175:110});
      for(const e of this.around(c,c.boss?175:110))this.hurtEnemy(e,this.player.damage*(c.boss?6:3.5),'explosion');
    }
    addXp(value){this.xp+=value;if(this.xp>=this.xpNeed&&this.mode==='playing')this.levelUp();}
    levelUp(){
      this.xp-=this.xpNeed;this.level++;this.xpNeed=Math.round(10+(this.level-1)*4+(this.level-1)**1.3);
      this.player.mana=Math.min(this.player.maxMana,this.player.mana+this.player.maxMana*.2);
      for(const m of this.minions)if(!m.dead)this.refreshMinion(m);
      const pool=D.upgrades.filter(u=>(this.player.upgrades[u.id]||0)<u.max);
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      this.offers=pool.slice(0,3);
      // Offer a dependable mana choice at levels 2, 5, 8... until it is maxed.
      const mana=pool.find(u=>u.id==='mana');if((this.level-2)%3===0&&mana&&!this.offers.includes(mana))this.offers[2]=mana;
      if(this.offers.length<3){for(const u of D.upgrades.filter(u=>['heart','mana','power'].includes(u.id)))if(!this.offers.includes(u)&&this.offers.length<3)this.offers.push(u);}
      this.mode='upgrade';this.emit('level',{level:this.level});
    }
    choose(index){
      if(this.mode!=='upgrade'||!this.offers[index])return false;const u=this.offers[index],wasBookActive=this.bookActive;if(wasBookActive)this.setBookStats(false);u.apply(this.player);if(wasBookActive)this.setBookStats(true);this.player.upgrades[u.id]=(this.player.upgrades[u.id]||0)+1;
      for(const m of this.minions)if(!m.dead)this.refreshMinion(m);this.offers=[];this.mode='playing';this.emit('notice',{text:u.name+' · Nâng cấp đã có hiệu lực.'});if(this.xp>=this.xpNeed)this.levelUp();return true;
    }
    bossRoar(e){
      const f=this.firewall||{x:e.x,y:e.y,r:500};
      for(const m of this.minions){if(m.dead)continue;const a=Math.atan2(m.y-e.y,m.x-e.x);m.x+=Math.cos(a)*150;m.y+=Math.sin(a)*150;this.bound(m,m.type!=='spirit');}
      for(const c of this.corpses){if(c.dead)continue;const a=Math.atan2(c.y-f.y,c.x-f.x);c.x=f.x+Math.cos(a)*(f.r-55);c.y=f.y+Math.sin(a)*(f.r-55);}
      this.emit('roar',{x:e.x,y:e.y,r:500});this.emit('notice',{text:'Tiếng gầm địa ngục! Xác bị thổi ra mép vòng lửa.'});
    }
    updateEnemies(dt){
      const p=this.player;
      for(const e of this.enemies){
        if(e.dead||this.mode!=='playing')continue;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.marked=Math.max(0,e.marked-dt);
        if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);e.contactCooldown=Math.max(0,(e.contactCooldown||0)-dt);continue;}e.attack-=dt;
        let target=p;const tank=this.nearest(e,this.minions,e.boss?150:190,m=>m.type==='zombie');
        if(tank)target=tank;else{const close=this.nearest(e,this.minions,75,m=>m.type!=='spirit');if(close)target=close;}
        if(e.type==='eater'){
          const corpse=this.nearest(e,this.corpses,600,c=>c.life>0);
          if(corpse){target=corpse;if(distance(e,corpse)<e.r+14){corpse.dead=true;e.eaten++;e.maxHp*=1.12;e.hp=Math.min(e.maxHp,e.hp+65);e.r=Math.min(40,e.r+1.8);this.emit('eat',{x:e.x,y:e.y});}}
        }
        const d=distance(e,target),speed=e.speed*(e.slow>0?.48:1);
        if(e.boss){
          e.damageBudget=Math.min(e.damageRegen*.5,e.damageBudget+e.damageRegen*dt);
          if(d>e.r+target.r+4)this.move(e,target,speed,dt);
          if(e.attack<=0){this.warnings.push({x:target.x,y:target.y,r:75+e.bossIndex*20,life:.95,max:.95,damage:e.damage*1.45,kind:'slam'});e.attack=e.bossIndex===2?2.8:4;this.emit('warning');}
          e.army-=dt;if(e.army<=0){for(let i=0;i<6+e.bossIndex*2;i++){const a=i*TAU/(6+e.bossIndex*2);this.spawnEnemy('slime',{x:e.x+Math.cos(a)*100,y:e.y+Math.sin(a)*100});}e.army=11;}
          if(e.bossIndex===2){e.roar-=dt;if(e.roar<=0){this.warnings.push({x:e.x,y:e.y,r:180,life:1.5,max:1.5,damage:0,kind:'roar',bossId:e.id});e.roar=15;}}
        }else if(e.miniBoss){
          if(d>e.r+target.r+5)this.move(e,target,speed,dt);
          if(e.attack<=0){this.warnings.push({x:target.x,y:target.y,r:60,life:.85,max:.85,damage:e.damage,kind:'slam'});e.attack=3.8;}
        }else if(e.type==='eye'){
          if(d>285)this.move(e,target,speed,dt);else if(d<190)this.move(e,{x:e.x-(target.x-e.x),y:e.y-(target.y-e.y)},speed*.7,dt);
          if(e.attack<=0&&d<600){this.shoot(e,p,{kind:'hostile',damage:e.damage});e.attack=2.8;}
        }else{
          if(d>e.r+(target.r||12)-1)this.move(e,target,speed,dt);
          if(e.type==='knight'&&e.attack<=0&&d<155){this.warnings.push({x:e.x,y:e.y,r:100,life:.7,max:.7,damage:e.damage,kind:'sweep'});e.attack=3.5;}
        }
        if(!target.value&&d<e.r+(target.r||12)+4&&e.contactCooldown<=0){
          target===p?this.hurtPlayer(e.damage):this.hurtMinion(target,e.damage);e.contactCooldown=.7;
        }
        e.contactCooldown=Math.max(0,(e.contactCooldown||0)-dt);
      }
      // Resolve only nearby cells instead of comparing every enemy with every enemy.
      const cells=new Map(),size=75;
      for(const e of this.enemies){if(e.dead)continue;const cx=Math.floor(e.x/size),cy=Math.floor(e.y/size);
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const b of cells.get((cx+dx)+','+(cy+dy))||[]){
          const x=e.x-b.x,y=e.y-b.y,min=(e.r+b.r)*.75,square=x*x+y*y;if(square<min*min&&square>.0001){const d=Math.sqrt(square),shift=(min-d)*.45,nx=x/d*shift,ny=y/d*shift;if(!e.boss){e.x+=nx;e.y+=ny;}if(!b.boss){b.x-=nx;b.y-=ny;}}
        }
        const key=cx+','+cy;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(e);
      }
    }
    updateMinions(dt){
      const p=this.player,army=this.aliveMinions(),leader=army.some(m=>m.leader),totals={zombie:0,skeleton:0,spirit:0},slots={zombie:0,skeleton:0,spirit:0};
      for(const m of army)totals[m.type]++;
      const activeSpirits=totals.spirit;
      const bookFactor=this.bookActive?1.2:1,maxShield=Math.min(65,activeSpirits*(10+p.wardPower*6))*bookFactor;p.shield=Math.min(maxShield,p.shield+dt*activeSpirits*(2+p.wardPower)*bookFactor);
      for(const m of this.minions){
        if(m.dead||this.mode!=='playing')continue;m.invuln=Math.max(0,m.invuln-dt);m.attack-=dt;
        const slot=slots[m.type]++,ring=Math.floor(slot/14),inRing=Math.min(14,totals[m.type]-ring*14);
        const radius=(m.type==='spirit'?68:m.type==='zombie'?90:135)+ring*25;
        const angle=(slot%14)*TAU/inRing+this.time*(m.type==='spirit'?.8:.12)+(ring%2?.2:0);
        const formation={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius};
        const fromPlayer=distance(m,p),leash=Math.max(this.minionLeash,radius+75);
        if(fromPlayer>leash)m.returning=true;
        if(m.returning&&fromPlayer<=Math.min(leash-40,radius+40))m.returning=false;
        if(m.returning){this.move(m,formation,Math.max(m.speed*1.6,p.speed*1.45),dt,m.type==='spirit');continue;}
        // Fight near the mage; a distant marked enemy cannot pull the army away.
        const guardRange=m.type==='skeleton'?360:m.type==='spirit'?210:300;
        const protecting=e=>{const dx=e.x-p.x,dy=e.y-p.y,r=guardRange+e.r;return dx*dx+dy*dy<=r*r;};
        let target=p.commander?this.nearest(m,this.enemies,700,e=>e.marked>0&&protecting(e)):null;
        target ||= this.nearest(m,this.enemies,m.type==='zombie'?400:m.type==='spirit'?190:550,protecting);
        if(!target){this.move(m,formation,Math.max(m.speed,p.speed*1.15),dt,m.type==='spirit');continue;}
        const d=distance(m,target),rate=(leader?1.2:1)*(p.commander&&target.marked>0?1.3:1),spec=D.summons[m.type];
        if(m.type==='zombie'){
          if(d>m.r+target.r+5)this.move(m,target,m.speed,dt);
          if(d<m.r+target.r+12&&m.attack<=0){target.slow=2;this.hurtEnemy(target,m.damage,'minion');m.attack=spec.interval/rate;}
        }else if(m.type==='skeleton'){
          if(d>320)this.move(m,target,m.speed,dt);else if(d<160)this.move(m,{x:m.x+(m.x-target.x),y:m.y+(m.y-target.y)},m.speed*.8,dt);
          if(d<390&&m.attack<=0){for(const a of p.split?[-.2,0,.2]:[0])this.shoot(m,target,{kind:'bone',damage:m.damage*(p.split?.65:1),angle:a});m.attack=spec.interval/rate;}
        }else{
          this.move(m,target,m.speed,dt,true);
          if(d<target.r+m.r+10){this.emit('explosion',{x:m.x,y:m.y,r:m.elite?135:85,color:'#91dcf9'});for(const e of this.around(m,m.elite?135:85))this.hurtEnemy(e,m.damage,'spirit');this.killMinion(m,false);}
        }
      }
    }
    updateBullets(dt){
      for(const b of this.bullets){
        if(b.dead||this.mode!=='playing')continue;const ox=b.x,oy=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
        const vx=b.x-ox,vy=b.y-oy,l=vx*vx+vy*vy;
        const hitCircle=e=>{const t=l?clamp(((e.x-ox)*vx+(e.y-oy)*vy)/l,0,1):0,dx=e.x-ox-vx*t,dy=e.y-oy-vy*t,r=e.r+b.r;return dx*dx+dy*dy<r*r;};
        if(b.kind==='hostile'){
          let hit=false;for(const m of this.minions){if(!m.dead&&m.type!=='spirit'&&hitCircle(m)){this.hurtMinion(m,b.damage);hit=true;break;}}
          if(!hit&&hitCircle(this.player)){this.hurtPlayer(b.damage);hit=true;}if(hit)b.dead=true;
        }else{
          if(b.kind==='staff'&&this.player.explosion){const c=this.corpses.find(c=>!c.dead&&c.life<=5&&hitCircle(c));if(c){this.explodeCorpse(c);b.dead=true;continue;}}
          for(const e of this.enemies){if(e.dead||b.hits.has(e.id)||!hitCircle(e))continue;
            b.hits.add(e.id);const dealt=this.hurtEnemy(e,b.damage,b.kind==='staff'?'staff':'minion');if(b.kind==='staff'&&dealt>0)this.registerWeaponHit(e);
            const next=b.bounces>0?this.nearest(e,this.enemies,270,n=>!b.hits.has(n.id)):null;
            if(next){const a=Math.atan2(next.y-b.y,next.x-b.x);b.vx=Math.cos(a)*470;b.vy=Math.sin(a)*470;b.bounces--;b.life=1;}else b.dead=true;break;
          }
        }
      }
    }
    updateCorpses(dt){
      for(const c of this.corpses){if(c.dead)continue;c.life-=dt;if(c.life<=0){c.dead=true;if(this.player.recycle)this.drops.push({id:++this.id,x:c.x,y:c.y,kind:'mana',value:2*c.value,pull:true});this.emit('decay',{x:c.x,y:c.y});}}
    }
    updateDrops(dt){
      const p=this.player;let xp=0;
      for(const g of this.drops){if(g.dead)continue;const d=distance(g,p);if(d<p.magnet||g.pull){g.pull=true;const speed=g.kind==='mana'?470:360,step=Math.min(d,speed*dt);if(d>0){g.x+=(p.x-g.x)/d*step;g.y+=(p.y-g.y)/d*step;}}
        if(distance(g,p)<p.r+7)xp+=this.collectDrop(g);
      }
      if(xp){this.addXp(xp);this.emit('xp');}
    }
    updateZones(dt){
      for(const w of this.warnings){w.life-=dt;if(w.life>0||w.dead)continue;w.dead=true;
        if(w.kind==='roar'){const boss=this.enemies.find(e=>e.id===w.bossId&&!e.dead);if(boss)this.bossRoar(boss);continue;}
        this.emit('explosion',{x:w.x,y:w.y,r:w.r,color:'#ff927b'});
        if(distance(w,this.player)<w.r+this.player.r)this.hurtPlayer(w.damage);
        for(const m of this.minions)if(!m.dead&&distance(w,m)<w.r+m.r){this.hurtMinion(m,w.damage*1.4);if(w.kind==='sweep'){const a=Math.atan2(m.y-w.y,m.x-w.x);m.x+=Math.cos(a)*100;m.y+=Math.sin(a)*100;this.bound(m,m.type!=='spirit');}}
      }
      this.auraClock-=dt;const tick=this.auraClock<=0;if(tick)this.auraClock=.25;
      for(const z of this.zones){z.life-=dt;if(tick)for(const e of this.around(z,z.r))this.hurtEnemy(e,z.damage*.25,'poison');}
      if(tick&&this.player.fireRing)for(const e of this.around(this.player,85+this.player.fireRing*8))this.hurtEnemy(e,this.player.fireRing*12*.25*(this.bookActive?1.2:1),'aura');
    }
    step(dt,input={x:0,y:0}){
      if(this.mode!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;const p=this.player;
      if(this.bookActive){this.bookRemaining=Math.max(0,this.bookRemaining-dt);if(this.bookRemaining<=.000001){this.bookRemaining=0;this.setBookStats(false);this.emit('notice',{text:'Sách phù phép đã hết hiệu lực.'});}}
      while(this.time+.000001>=this.nextMiniBoss){this.spawnMiniBoss();this.nextMiniBoss+=30;}
      p.invuln=Math.max(0,p.invuln-dt);p.dash=Math.max(0,p.dash-dt);this.heroCooldown=Math.max(0,this.heroCooldown-dt);p.mana=Math.min(p.maxMana,p.mana+p.manaRegen*dt);p.hp=Math.min(p.maxHp,p.hp+p.regen*dt);
      for(const key in p.cooldowns)p.cooldowns[key]=Math.max(0,p.cooldowns[key]-dt);
      this.updateAutoSummon(dt);
      let x=input.x||0,y=input.y||0,len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}if(x)p.look=x>0?1:-1;
      if(p.dashTime>0){p.x+=p.dashX*730*dt;p.y+=p.dashY*730*dt;p.dashTime=Math.max(0,p.dashTime-dt);}else{p.x+=x*p.speed*dt;p.y+=y*p.speed*dt;}
      this.bound(p,true);
      if(this.firewall){const f=this.firewall,d=distance(p,f),edge=f.r-p.r;if(d>edge){p.x=f.x+(p.x-f.x)/d*edge;p.y=f.y+(p.y-f.y)/d*edge;this.hurtPlayer(16);}}
      this.shootClock-=dt;if(this.shootClock<=0){this.staffAttack();this.shootClock=p.fireInterval;}
      this.spawnClock-=dt;if(this.spawnClock<=0){
        const wave=encounterAt(this.time,this.config.difficulty),types=Object.keys(D.enemies);
        if(!wave.resting)for(let i=0;i<wave.count;i++){let roll=this.random(),rank=0;while(rank<wave.tier&&roll>=wave.weights[rank])roll-=wave.weights[rank++];this.spawnEnemy(types[rank]);}
        this.spawnClock=wave.interval;
      }
      [180,360,600].forEach((time,index)=>{if(this.time+.000001>=time&&!this.bossSpawned[index])this.spawnBoss(index);});
      this.updateHeroEffects(dt);this.updateEnemies(dt);if(this.mode!=='playing'){this.clean();return;}
      this.updateMinions(dt);this.updateBullets(dt);this.updateZones(dt);this.updateCorpses(dt);this.updateDrops(dt);this.clean();
    }
    clean(){
      this.enemies=this.enemies.filter(e=>!e.dead);this.corpses=this.corpses.filter(c=>!c.dead);this.minions=this.minions.filter(m=>!m.dead);
      this.bullets=this.bullets.filter(b=>!b.dead&&b.life>0);this.drops=this.drops.filter(g=>!g.dead);this.zones=this.zones.filter(z=>z.life>0);this.warnings=this.warnings.filter(w=>!w.dead);
      this.effects=this.effects.filter(f=>f.life>.000001);
      // Compact uncollected resources without discarding value, items or corpses.
      if(this.drops.length>180){const cells=new Map();this.drops=this.drops.filter(g=>{if(!['xp','gold'].includes(g.kind)||g.pull)return true;const key=g.kind+':'+Math.floor(g.x/80)+','+Math.floor(g.y/80),old=cells.get(key);if(old){old.value+=g.value;return false;}cells.set(key,g);return true;});}
    }
  }
  root.NecroEngine={Game,distance,clamp,encounterAt};if(typeof module!=='undefined')module.exports=root.NecroEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
