(function(root){
  'use strict';
  const D=root.NecroData||(typeof require==='function'?require('./data.js'):null),LIMIT=1e9;
  const count=n=>Number.isSafeInteger(n)?Math.max(0,Math.min(LIMIT,n)):0;
  function normalize(raw){
    const source=raw&&typeof raw==='object'?raw:{},owned={},equipped={},upgrades={};
    for(const [kind,list,key] of [['hero',D.heroes,'heroes'],['weapon',D.weapons,'weapons']]){
      const saved=Array.isArray(source.owned?.[key])?source.owned[key]:[];
      owned[key]=list.filter(e=>e.price===0||saved.includes(e.id)).map(e=>e.id);
      equipped[kind]=owned[key].includes(source.equipped?.[kind])?source.equipped[kind]:list[0].id;
    }
    for(const u of D.permanentUpgrades)upgrades[u.id]=Math.min(u.max,count(source.upgrades?.[u.id]));
    return{version:1,gold:count(source.gold),owned,equipped,upgrades};
  }
  const listFor=kind=>kind==='hero'?D.heroes:kind==='weapon'?D.weapons:[];
  const ownedKey=kind=>kind==='hero'?'heroes':'weapons';
  function upgradePlan(profile,id){
    const u=D.permanentUpgrades.find(u=>u.id===id);if(!u)return{ok:false,reason:'Nâng cấp không tồn tại.'};
    const rank=profile.upgrades[id]||0,cost=Math.ceil(u.baseCost*1.75**rank/10)*10;
    if(rank>=u.max)return{ok:false,maxed:true,rank,cost:0,reason:'Đã đạt cấp tối đa.'};
    return{ok:profile.gold>=cost,rank,cost,reason:profile.gold>=cost?'':'Cần thêm '+(cost-profile.gold)+' vàng.'};
  }
  function buyUpgrade(profile,id){const plan=upgradePlan(profile,id);if(!plan.ok)return plan;profile.gold-=plan.cost;profile.upgrades[id]=plan.rank+1;return{...plan,rank:plan.rank+1};}
  function equipmentPlan(profile,kind,id){
    const item=listFor(kind).find(e=>e.id===id);if(!item)return{ok:false,reason:'Trang bị không tồn tại.'};
    const owned=profile.owned[ownedKey(kind)].includes(id),equipped=profile.equipped[kind]===id;
    return{ok:owned||profile.gold>=item.price,owned,equipped,cost:item.price,reason:owned?'':profile.gold>=item.price?'':'Cần thêm '+(item.price-profile.gold)+' vàng.'};
  }
  function buyAndEquip(profile,kind,id){
    const plan=equipmentPlan(profile,kind,id);if(!plan.ok)return plan;
    if(!plan.owned){profile.gold-=plan.cost;profile.owned[ownedKey(kind)].push(id);}
    profile.equipped[kind]=id;return{...plan,owned:true,equipped:true};
  }
  function bankRunGold(profile,run){
    const earned=count(run?.gold),already=count(run?.bankedGold),amount=Math.max(0,earned-already);
    if(amount){profile.gold=Math.min(LIMIT,profile.gold+amount);run.bankedGold=earned;}return amount;
  }
  function applyToPlayer(player,raw){
    const p=normalize(raw),hero=D.heroes.find(h=>h.id===p.equipped.hero),weapon=D.weapons.find(w=>w.id===p.equipped.weapon);
    hero.apply(player);weapon.apply(player);for(const u of D.permanentUpgrades)u.apply(player,p.upgrades[u.id]);
    player.heroId=hero.id;player.weaponId=weapon.id;player.weaponColor=weapon.color;player.hp=player.maxHp;player.mana=player.maxMana;
    return{hero,weapon};
  }
  root.NecroProgression={normalize,upgradePlan,buyUpgrade,equipmentPlan,buyAndEquip,bankRunGold,applyToPlayer};
  if(typeof module!=='undefined')module.exports=root.NecroProgression;
})(typeof globalThis!=='undefined'?globalThis:this);
