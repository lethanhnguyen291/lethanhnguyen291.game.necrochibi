(() => {
  'use strict';
  const $=id=>document.getElementById(id),D=NecroData,P=NecroProgression,{Game,clamp}=NecroEngine,canvas=$('game'),renderer=new NecroRenderer(canvas);
  const timeText=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
  const storage={get(k,v){try{return localStorage.getItem(k)??v;}catch{return v;}},set(k,v){try{localStorage.setItem(k,v);return true;}catch{return false;}}};
  let profile;try{profile=P.normalize(JSON.parse(storage.get('necro.profile','null')));}catch{profile=P.normalize();}
  let autoEnabled=storage.get('necro.autoSummon','off')==='on',metaSection=null,shopKind='weapon',saveWarned=false,worldOpen=false;
  let completed=[];try{const list=JSON.parse(storage.get('necro.completed','[]'));if(Array.isArray(list))completed=list.filter(v=>Number.isInteger(v)&&v>=0&&v<5);}catch{}
  let selected=clamp(Number(storage.get('necro.stage','0'))||0,0,4),game=null,lastMode='',previous=0,hudClock=0,speed=1,toastUntil=0;
  let soundOn=storage.get('necro.sound','off')==='on',audio=null,joystick=null,lastMove={x:0,y:1},helpPrevious=null,flashUntil=0;
  const keys=new Set(),screens=['welcome','menu-caption','stage-picker','hud','play-bottom','side-info','item-rack','boss-list','world-screen','meta-screen','upgrade-screen','pause-screen','end-screen'];
  const show=(id,on)=>$(id).classList.toggle('hidden',!on);
  new ResizeObserver(()=>renderer.resize()).observe(canvas.parentElement);
  function initAudio(){if(!soundOn)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{soundOn=false;soundUI();}}
  function tone(f,d=.1,volume=.03,slide=0){if(!soundOn||!audio||audio.state!=='running')return;try{const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(35,f+slide),t+d);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+d+.02);}catch{}}
  function soundUI(){$('sound').setAttribute('aria-pressed',String(soundOn));$('sound').setAttribute('aria-label',soundOn?'Tắt âm thanh':'Bật âm thanh');$('sound').title=soundOn?'Tắt âm thanh':'Bật âm thanh';$('sound').querySelector('span').classList.toggle('hidden',soundOn);}
  $('sound').onclick=()=>{soundOn=!soundOn;storage.set('necro.sound',soundOn?'on':'off');initAudio();soundUI();tone(660);};soundUI();
  function saveProfile(){if(!storage.set('necro.profile',JSON.stringify(profile))&&!saveWarned){saveWarned=true;notice('Trình duyệt chưa cho lưu tiến trình. Vàng và đồ mua chỉ giữ tới khi đóng trang.');}}
  function commitPurchase(next){if(!storage.set('necro.profile',JSON.stringify(next))){notice('Không lưu được tiến trình. Lượt mua chưa thực hiện, vàng vẫn giữ nguyên.');return false;}profile=next;return true;}
  function profileUI(){
    for(const e of document.querySelectorAll('[data-wallet]'))e.textContent=profile.gold.toLocaleString('vi-VN');
    const hero=D.heroes.find(h=>h.id===profile.equipped.hero),weapon=D.weapons.find(w=>w.id===profile.equipped.weapon);
    $('menu-loadout').textContent='Đang chọn: '+hero.name+' · '+weapon.name;
  }
  function bankGold(){if(game&&P.bankRunGold(profile,game)){saveProfile();profileUI();}}
  function openWorld(){if(game)return;worldOpen=true;show('world-screen',true);$('close-world').focus();}
  function closeWorld(){worldOpen=false;show('world-screen',false);$('open-world').focus();}
  function worldUI(){
    $('world-story').textContent=D.world.story;
    $('world-details').innerHTML=D.world.details.map(d=>'<article><span>'+NecroRelicArt.icon(d.kind)+'</span><h3>'+d.title+'</h3><p>'+d.text+'</p></article>').join('');
    document.querySelector('.brand-icon').innerHTML=NecroRelicArt.icon('seal','#9be8d1');
  }
  function renderMeta(){
    const upgrading=metaSection==='power';$('meta-title').textContent=upgrading?'Nâng cấp sức mạnh':'Kho báu âm phủ';
    $('meta-eyebrow').textContent=upgrading?'KHẾ ƯỚC DÀI LÂU':'CỬA HÀNG · TƯỚNG & VŨ KHÍ';
    $('meta-intro').textContent=upgrading?'Mang sức mạnh vào mọi trận. Dùng vàng đã nhặt để nâng cấp vĩnh viễn.':'Chọn một tướng và một vũ khí. Mỗi món có ưu điểm riêng để đổi cách chơi.';
    show('shop-tabs',!upgrading);$('meta-grid').className=upgrading?'permanent-grid':'equipment-grid '+shopKind+'-grid';
    $('shop-weapons').setAttribute('aria-selected',String(shopKind==='weapon'));$('shop-heroes').setAttribute('aria-selected',String(shopKind==='hero'));
    const cards=upgrading?D.permanentUpgrades.map(u=>{
      const plan=P.upgradePlan(profile,u.id),card=document.createElement('article');card.className='permanent-card'+(plan.maxed?' maxed':'');
      card.innerHTML='<h3>'+u.name+'</h3><div class="permanent-icon">'+u.icon+'<span>+</span></div><b class="rank-label">'+(plan.maxed?'ĐÃ TỐI ĐA':'CẤP '+plan.rank+' / '+u.max)+'</b><div class="rank-pips">'+Array.from({length:u.max},(_,i)=>'<i class="'+(i<plan.rank?'filled':'')+'"></i>').join('')+'</div><p>'+u.desc+'</p><small class="current-effect">'+u.effect(plan.rank)+'</small><button class="buy-permanent" '+(!plan.ok?'disabled':'')+'>'+(plan.maxed?'Đã hoàn tất':'<span>●</span> '+plan.cost.toLocaleString('vi-VN'))+'</button><small class="purchase-hint">'+(plan.maxed?'Áp dụng trong mọi trận':plan.reason||'Nâng lên cấp '+(plan.rank+1))+'</small>';
      const b=card.querySelector('button');b.setAttribute('aria-label',plan.maxed?u.name+' đã tối đa':'Nâng '+u.name+' lên cấp '+(plan.rank+1)+' giá '+plan.cost+' vàng');
      b.onclick=()=>{const next=P.normalize(profile),result=P.buyUpgrade(next,u.id);if(!result.ok||!commitPurchase(next))return;profileUI();renderMeta();$('close-meta').focus();tone(700,.15,.04,200);notice(u.name+' · Đã nâng lên cấp '+result.rank+'.');};return card;
    }):(shopKind==='hero'?D.heroes:D.weapons).map(item=>{
      const plan=P.equipmentPlan(profile,shopKind,item.id),card=document.createElement('article');card.className='equipment-card'+(plan.equipped?' equipped':'');
      card.innerHTML='<div class="equipment-top"><span>'+item.title+'</span><small>'+(plan.equipped?'ĐANG DÙNG':plan.owned?'ĐÃ SỞ HỮU':'CHƯA MỞ')+'</small></div><div class="equipment-art" style="--equipment-color:'+item.color+'">'+item.icon+'</div><h3>'+item.name+'</h3><p>'+item.desc+'</p><button class="buy-equipment" '+(!plan.ok||plan.equipped?'disabled':'')+'>'+(plan.equipped?'✓ Đang dùng':plan.owned?'Trang bị':'<span>●</span> '+plan.cost.toLocaleString('vi-VN')+' · Mua & dùng')+'</button><small class="purchase-hint">'+(plan.reason||(!plan.owned?'Mua một lần, dùng lâu dài':'Có thể đổi trước mỗi trận'))+'</small>';
      const special=document.createElement('div');special.className='equipment-special';special.innerHTML=shopKind==='hero'?'<small>'+item.house+'</small><b>Q · '+item.ability.name+' <i>'+item.ability.mana+' MP / '+item.ability.cooldown+'s</i></b><span>'+item.ability.desc+'</span>':'<small>'+item.origin+'</small><b>'+item.special.name+'</b><span>'+item.special.desc+'</span>';card.insertBefore(special,card.querySelector('button'));
      const kind=shopKind,b=card.querySelector('button');b.setAttribute('aria-label',(plan.equipped?'Đang dùng ':plan.owned?'Trang bị ':'Mua và trang bị ')+item.name);
      b.onclick=()=>{const next=P.normalize(profile),result=P.buyAndEquip(next,kind,item.id);if(!result.ok||!commitPurchase(next))return;profileUI();renderMeta();$('close-meta').focus();tone(600,.15,.04,180);notice('Đã trang bị '+item.name+'.');};return card;
    });$('meta-grid').replaceChildren(...cards);profileUI();
  }
  function openMeta(section){if(game)return;metaSection=section;renderMeta();show('meta-screen',true);$('close-meta').focus();}
  function closeMeta(){if(metaSection===null)return;const section=metaSection;metaSection=null;show('meta-screen',false);$(section==='power'?'open-power':'open-shop').focus();}
  function toggleAuto(){if(!game||helpPrevious!==null||!['playing','paused'].includes(game.mode))return;autoEnabled=game.setAutoSummon(!autoEnabled);storage.set('necro.autoSummon',autoEnabled?'on':'off');hud();notice(autoEnabled?'Auto bật · Tự luân phiên thây ma → bộ xương → linh hồn khi đủ tài nguyên.':'Auto tắt · Bấm 1 / 2 / 3 để tự triệu hồi.');if(game.mode==='playing')canvas.focus({preventScroll:true});}
  function castHeroSkill(){if(!game||helpPrevious!==null)return;const result=game.useHeroSkill();if(result.ok)tone(560,.3,.04,260);hud();if(game.mode==='playing')canvas.focus({preventScroll:true});}
  function stageCards(){
    $('progress').textContent=completed.length+' / 5';
    $('stages').replaceChildren(...D.stages.map((s,i)=>{const b=document.createElement('button');b.className='stage-card'+(i===selected?' selected':'');b.setAttribute('aria-pressed',String(i===selected));b.setAttribute('aria-label','Màn '+(i+1)+': '+s.name);b.innerHTML='<small>QUÁI TRIỀU 0'+(i+1)+'</small><b>'+s.name+'</b>'+(completed.includes(i)?'<span class="stage-check">✓</span>':'');b.title=s.subtitle;b.onclick=()=>{selected=i;storage.set('necro.stage',String(i));stageCards();tone(400+i*60,.08);};return b;}));
  }
  function resetInput(){keys.clear();if(joystick){try{canvas.releasePointerCapture(joystick.id);}catch{}}joystick=null;show('joystick',false);}
  function movement(){let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);if(joystick){x+=joystick.dx/40;y+=joystick.dy/40;}const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}if(l>.05)lastMove={x:x/Math.hypot(x,y),y:y/Math.hypot(x,y)};return{x,y};}
  function notice(text){$('toast').textContent=text;show('toast',true);$('toast').classList.add('visible');toastUntil=performance.now()+4200;}
  function start(){
    bankGold();initAudio();resetInput();game=new Game(selected,Math.random,profile);game.setAutoSummon(autoEnabled);speed=Number($('speed').value)||1;lastMode='';lastMove={x:0,y:1};helpPrevious=null;metaSection=null;worldOpen=false;show('help-screen',false);
    $('hero-skill').querySelector('.hero-skill-icon').innerHTML=game.loadout.hero.ability.icon;
    renderer.particles=[];renderer.rings=[];renderer.numbers=[];renderer.threads=[];renderer.camera={x:0,y:0};renderer.shake=0;
    for(const id of screens)show(id,['hud','play-bottom','side-info','item-rack'].includes(id));
    $('pause').disabled=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Tạm dừng');
    $('damage-flash').classList.remove('flash');document.body.classList.add('playing');hud();syncMode();canvas.focus({preventScroll:true});
    notice(autoEnabled?'Auto đang bật · Bạn di chuyển, quân đoàn sẽ tự được triệu hồi.':'Bấm AUTO cạnh ba phép để tự triệu hồi, hoặc dùng phím 1 / 2 / 3.');tone(330,.2,.04,220);
  }
  function menu(){bankGold();resetInput();game=null;lastMode='';helpPrevious=null;metaSection=null;show('help-screen',false);document.body.classList.remove('playing');for(const id of screens)show(id,['welcome','menu-caption','stage-picker'].includes(id));$('pause').disabled=true;$('toast').classList.remove('visible');$('damage-flash').classList.remove('flash');stageCards();profileUI();$('start').focus();}
  function pause(){if(!game||helpPrevious!==null)return;if(game.mode==='playing'){game.mode='paused';resetInput();}else if(game.mode==='paused')game.mode='playing';syncMode();}
  function pauseDetails(){const p=game.player;$('pause-summary').textContent=D.stages[selected].name+' · Cấp '+game.level+' · '+timeText(game.time)+(speed>1?' · Tốc độ '+speed+'×':'')+' · '+game.loadout.hero.name+' / '+game.loadout.weapon.name+' · Hồi sinh còn '+p.reviveCharges+' lượt';const entries=Object.entries(p.upgrades);
    $('owned-upgrades').replaceChildren(...entries.map(([id,n])=>{const u=D.upgrades.find(x=>x.id===id),s=document.createElement('span');s.textContent=u.name+(n>1?' · '+n:'');s.title=u.desc;return s;}));
    if(!entries.length){const s=document.createElement('span');s.textContent='Chưa có nâng cấp. Nhặt đủ tinh thể để chọn khế ước đầu tiên.';$('owned-upgrades').append(s);}
  }
  function help(){if(helpPrevious!==null)return;helpPrevious=game?game.mode:'menu';if(game?.mode==='playing')game.mode='paused';resetInput();show('help-screen',true);$('close-help').focus();}
  function closeHelp(){if(helpPrevious===null)return;if(game&&helpPrevious==='playing')game.mode='playing';helpPrevious=null;show('help-screen',false);syncMode();if(game?.mode==='playing')canvas.focus({preventScroll:true});else if(game?.mode==='paused')$('resume').focus();else if(game?.mode==='upgrade')$('upgrade-cards').firstElementChild?.focus();else if(worldOpen)$('close-world').focus();else if(metaSection!==null)$('close-meta').focus();else $('help').focus();}
  function choose(i){if(!game||helpPrevious!==null)return;if(game.choose(i)){resetInput();tone(650,.16,.04,250);syncMode();hud();}}
  function summon(type){if(!game||helpPrevious!==null)return;const result=game.summon(type);if(result.ok){tone(type==='spirit'?500:300,.22,.04,300);notice('Đã gọi '+result.count+' '+D.summons[type].name.toLowerCase()+' · −'+result.mana+' mana'+(result.groups.length?' · Hợp nhất '+result.groups.length+' đệ khổng lồ':'')+(result.leader?' · Thủ lĩnh thức tỉnh!':''));}hud();canvas.focus({preventScroll:true});}
  function summonButtons(){
    $('summon-bar').replaceChildren(...Object.entries(D.summons).map(([type,s],i)=>{const b=document.createElement('button');b.className='summon-skill';b.dataset.type=type;b.id='summon-'+type;b.innerHTML='<span class="skill-icon">'+s.icon+'</span><span class="skill-info"><b>'+s.name+'</b><small><span class="mana-cost">'+s.mana/5+' MP/đệ</span> · <span class="corpse-mini">0/5 xác</span></small><span class="skill-state">Chưa có xác</span></span><kbd>'+(i+1)+'</kbd><i class="skill-fill"></i>';b.title=s.role;b.onclick=()=>summon(type);return b;}));
  }
  function itemButtons(){
    $('item-buttons').replaceChildren(...Object.entries(D.items).map(([type,s])=>{const slot=document.createElement('div');slot.className='item-slot';slot.innerHTML='<button class="item-circle" id="item-'+type+'" style="--item-color:'+s.color+'">'+s.icon+'<kbd>'+s.key+'</kbd><span class="item-stock">0</span><span class="item-timer"></span></button><b>'+s.name+'</b><small class="item-uses">0/3 lượt</small>';slot.querySelector('button').onclick=()=>useItem(type);return slot;}));
  }
  function useItem(type){if(!game||helpPrevious!==null)return;const result=game.useItem(type);if(result.ok)tone(type==='bomb'?150:600,.3,.045,type==='bomb'?-80:300);hud();syncMode();if(game.mode==='playing')canvas.focus({preventScroll:true});}
  function hud(){
    if(!game)return;const p=game.player,near=game.corpseValue();
    $('level').textContent='CẤP '+game.level;$('xp-text').textContent=Math.floor(game.xp)+' / '+game.xpNeed+' EXP';$('xp-bar').style.width=clamp(game.xp/game.xpNeed*100,0,100)+'%';
    $('hp-text').textContent=Math.ceil(p.hp)+' / '+Math.round(p.maxHp);$('hp-bar').style.width=p.hp/p.maxHp*100+'%';$('mana-text').textContent=Math.floor(p.mana)+' / '+Math.round(p.maxMana);$('mana-bar').style.width=p.mana/p.maxMana*100+'%';
    $('mana-regen').textContent='+'+Number(p.manaRegen.toFixed(2))+'/s';$('mana-regen').title='Tự hồi '+Number(p.manaRegen.toFixed(2))+' mana mỗi giây';
    $('shield-text').textContent=p.shield>=1?' +'+Math.floor(p.shield)+' giáp':'';
    $('timer').textContent=timeText(game.time)+(speed>1?' ×'+speed:'');$('stage-name').textContent=(selected+1)+' · '+D.stages[selected].name;
    const next=[180,360,600].findIndex((t,i)=>!game.bossSpawned[i]);$('next-boss').textContent=(next>=0?'Boss '+(next+1)+' · '+timeText([180,360,600][next]):'Hạ đủ 3 boss')+' · Trùm nhỏ '+Math.max(0,Math.ceil(game.nextMiniBoss-game.time))+'s';
    $('kills').textContent=game.kills;$('army-count').textContent=game.aliveMinions().length+' / '+game.maxMinions;$('corpse-count').textContent=near+' giá trị xác trong tầm · Dùng tối đa '+p.corpseNeed;
    for(const [type,s] of Object.entries(D.summons)){const b=$('summon-'+type),plan=game.summonPlan(type),cd=p.cooldowns[type];b.classList.toggle('blocked',!plan.ok);b.setAttribute('aria-disabled',String(!plan.ok));
      b.querySelector('.corpse-mini').textContent=Math.min(near,p.corpseNeed)+'/'+p.corpseNeed+' xác';
      b.querySelector('.mana-cost').textContent=plan.count>0?plan.mana+' MP':s.mana/5+' MP/đệ';
      b.querySelector('.skill-state').textContent=game.mode!=='playing'?'Trận đang dừng':cd>.01?'Hồi '+Math.ceil(cd)+'s':plan.ok?'Gọi '+plan.count+' đệ · '+plan.mana+' MP':near<1?'Chưa có xác':p.mana<plan.mana?(p.manaRegen>0?'Chờ mana ~'+Math.ceil((plan.mana-p.mana)/p.manaRegen)+'s':'Chưa đủ mana'):'Đội đầy / cần hợp nhất';
      b.querySelector('.skill-fill').style.width=(1-cd/(s.cooldown*p.summonCooldown))*100+'%';b.setAttribute('aria-label','Triệu hồi '+s.name+': '+(plan.ok?'sẵn sàng':plan.reason));b.title=s.role+' · '+s.hp+' máu / '+s.damage+' sát thương cơ bản'+(plan.ok?'':'. '+plan.reason);
    }
    $('dash-status').textContent=p.dash>.01?'Lướt hồi '+Math.ceil(p.dash)+'s':'Lướt sẵn sàng';
    $('gold-count').textContent=game.gold;
    $('auto-summon').setAttribute('aria-pressed',String(game.autoSummon));$('auto-summon').classList.toggle('enabled',game.autoSummon);$('auto-summon').querySelector('small').textContent=game.autoSummon?'BẬT':'TẮT';
    $('auto-summon').title=game.autoSummon?'Auto bật · Chờ gọi '+D.summons[['zombie','skeleton','spirit'][game.autoIndex]].name+'. Cần xác, mana và hết hồi chiêu. Bấm T để tắt.':'Tự động luân phiên 3 phép triệu hồi (T)';
    for(const [type,s] of Object.entries(D.items)){const b=$('item-'+type),plan=game.itemPlan(type),slot=b.parentElement;
      b.querySelector('.item-stock').textContent=game.inventory[type];slot.querySelector('.item-uses').textContent=game.itemUses[type]+'/3 đã dùng';
      b.querySelector('.item-timer').textContent=type==='book'&&game.bookActive?Math.ceil(game.bookRemaining)+'s':'';
      b.classList.toggle('active',type==='book'&&game.bookActive);b.classList.toggle('unavailable',!plan.ok);b.setAttribute('aria-disabled',String(!plan.ok));
      b.setAttribute('aria-label',s.name+': '+game.inventory[type]+' đang có, '+game.itemUses[type]+'/3 đã dùng'+(type==='book'&&game.bookActive?', còn '+Math.ceil(game.bookRemaining)+' giây':''));b.title=s.description+' · Phím '+s.key+(plan.ok?'':'. '+plan.reason);
    }
    const ability=game.loadout.hero.ability,heroPlan=game.heroSkillPlan(),heroButton=$('hero-skill');
    heroButton.style.setProperty('--ability-color',ability.color);heroButton.querySelector('.hero-skill-name').textContent=ability.short;heroButton.querySelector('.hero-skill-state').textContent=game.heroCooldown>.01?Math.ceil(game.heroCooldown)+'s':ability.mana+' MP';heroButton.querySelector('.hero-skill-fill').style.height=(1-clamp(game.heroCooldown/(ability.cooldown*p.heroSkillCooldown),0,1))*100+'%';heroButton.classList.toggle('blocked',!heroPlan.ok);heroButton.setAttribute('aria-disabled',String(!heroPlan.ok));heroButton.setAttribute('aria-label',ability.name+': '+(heroPlan.ok?'sẵn sàng':heroPlan.reason));heroButton.title='Q · '+ability.name+' · '+ability.desc+' '+(heroPlan.ok?'':heroPlan.reason);
    $('build').textContent=game.loadout.weapon.special.name+' · '+game.weaponHits+'/'+game.loadout.weapon.special.every+' đòn trúng';
    const bosses=game.enemies.filter(e=>e.boss);show('boss-list',bosses.length>0);
    $('boss-list').replaceChildren(...bosses.map(e=>{const b=document.createElement('div');b.className='boss-item';const title=document.createElement('div');title.innerHTML='<span>♛ '+e.name+'</span><span>'+Math.ceil(e.hp/e.maxHp*100)+'%</span>';const bar=document.createElement('div');bar.className='boss-meter';const fill=document.createElement('i');fill.style.width=e.hp/e.maxHp*100+'%';bar.append(fill);b.append(title,bar);return b;}));
  }
  function syncMode(){
    if(!game||game.mode===lastMode)return;lastMode=game.mode;
    show('upgrade-screen',game.mode==='upgrade');show('pause-screen',game.mode==='paused');show('end-screen',['won','lost'].includes(game.mode));
    $('pause').textContent=game.mode==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',game.mode==='paused'?'Tiếp tục':'Tạm dừng');$('pause').disabled=!['playing','paused'].includes(game.mode);
    if(game.mode==='playing')canvas.focus({preventScroll:true});
    if(game.mode==='paused'){pauseDetails();if(helpPrevious===null)$('resume').focus();}
    if(game.mode==='upgrade'){resetInput();$('upgrade-subtitle').textContent='Cấp '+game.level+' · Chọn 1 trong 3 khế ước cho lượt này';$('upgrade-cards').replaceChildren(...game.offers.map((u,i)=>{const b=document.createElement('button');b.className='upgrade-card';b.innerHTML='<span class="upgrade-icon">'+u.icon+'</span><span class="upgrade-key">'+(i+1)+'</span><strong>'+u.name+'</strong><p>'+u.desc+'</p><span class="upgrade-kind">'+u.branch+((game.player.upgrades[u.id]||0)>0?' · CẤP '+(game.player.upgrades[u.id]+1):'')+'</span>';b.onclick=()=>choose(i);return b;}));$('upgrade-cards').firstElementChild?.focus();}
    if(['won','lost'].includes(game.mode)){resetInput();const win=game.mode==='won';if(win&&!completed.includes(selected)){completed.push(selected);storage.set('necro.completed',JSON.stringify(completed));$('progress').textContent=completed.length+' / 5';}
      $('end-eyebrow').textContent=win?'QUÁI TRIỀU ĐÃ KẾT THÚC':'PHÁP SƯ NGÃ XUỐNG, KHẾ ƯỚC VẪN CÒN';
      $('end-title').innerHTML=win?'Nhỏ xíu.<br><em>Thắng lớn.</em>':'Hội bạn chờ bạn.<br><em>Thử lại nhé?</em>';
      $('end-message').textContent=(win?D.stages[selected].name+' đã yên lặng. Bạn đã hạ cả ba boss.':game.bossKilled.filter(Boolean).length+'/3 boss đã hạ · Thử giữ vài thây ma đỡ đòn và tiết kiệm xác cho lúc cần.')+' Đã giữ lại '+game.gold+' vàng nhặt trong trận.';
      $('end-time').textContent=timeText(game.time);$('end-kills').textContent=game.kills;$('end-army').textContent=game.summoned;show('next-stage',win&&selected<4);$('again').focus();tone(win?780:180,.5,.06,win?150:-100);
    }
  }
  function events(){for(const e of game.drainEvents()){renderer.event(e);if(['notice','boss','miniBoss'].includes(e.type))notice(e.text);if(e.type==='hurt'){flashUntil=performance.now()+140;$('damage-flash').classList.add('flash');tone(140,.12,.03,-60);}if(e.type==='shot')tone(750,.035,.008,-320);if(e.type==='xp')tone(900,.05,.012);if(e.type==='level')tone(550,.25,.04,300);}}
  function frame(t){
    const dt=Math.min((t-previous)/1000||0,.05);previous=t;
    if(game?.mode==='playing'&&helpPrevious===null){let remaining=dt*speed;const input=movement();while(remaining>0&&game.mode==='playing'){const step=Math.min(remaining,1/40);game.step(step,input);remaining-=step;}}
    if(game){bankGold();events();syncMode();hudClock-=dt;if(hudClock<=0){hud();hudClock=.1;}}
    if(toastUntil&&t>toastUntil){$('toast').classList.remove('visible');toastUntil=0;}if(flashUntil&&t>flashUntil){$('damage-flash').classList.remove('flash');flashUntil=0;}
    renderer.render(game,dt,selected,profile);requestAnimationFrame(frame);
  }
  $('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;$('resume').onclick=pause;$('pause').onclick=pause;
  $('leave').onclick=menu;$('home').onclick=menu;$('help').onclick=help;$('close-help').onclick=closeHelp;
  $('auto-summon').onclick=toggleAuto;$('open-power').onclick=()=>openMeta('power');$('open-shop').onclick=()=>openMeta('shop');$('close-meta').onclick=closeMeta;
  $('hero-skill').onclick=castHeroSkill;$('open-world').onclick=openWorld;$('close-world').onclick=closeWorld;
  $('shop-weapons').onclick=()=>{shopKind='weapon';renderMeta();$('shop-weapons').focus();};$('shop-heroes').onclick=()=>{shopKind='hero';renderMeta();$('shop-heroes').focus();};
  for(const id of ['shop-weapons','shop-heroes'])$(id).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();shopKind=e.key==='Home'?'weapon':e.key==='End'?'hero':shopKind==='weapon'?'hero':'weapon';renderMeta();$(shopKind==='weapon'?'shop-weapons':'shop-heroes').focus();}});
  $('build-button').onclick=()=>{if(game?.mode==='playing')pause();};$('dash-status').onclick=()=>{if(game?.mode==='playing'&&helpPrevious===null){game.dash(lastMove);canvas.focus({preventScroll:true});}};$('next-stage').onclick=()=>{selected=Math.min(4,selected+1);storage.set('necro.stage',String(selected));stageCards();start();};
  document.addEventListener('keydown',e=>{
    const active=game&&['playing','paused','upgrade'].includes(game.mode);
    if(active&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD','KeyT','KeyQ','Digit1','Digit2','Digit3','Digit4','Digit5','Digit6'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'&&!e.repeat){if(helpPrevious!==null)closeHelp();else if(worldOpen)closeWorld();else if(metaSection!==null)closeMeta();else pause();return;}
    if(e.code==='Tab'){const dialogs=[...document.querySelectorAll('.scrim:not(.hidden)')],dialog=helpPrevious!==null?$('help-screen'):dialogs.at(-1);if(!dialog)return;const buttons=[...dialog.querySelectorAll('button:not(.hidden):not(:disabled)')].filter(b=>b.getClientRects().length);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
    if(helpPrevious!==null)return;
    if(game?.mode==='upgrade'&&!e.repeat&&/^(Digit|Numpad)[123]$/.test(e.code)){choose(Number(e.code.slice(-1))-1);return;}
    if(game?.mode==='playing'){keys.add(e.code);if(!e.repeat){if(e.code==='Space')game.dash(lastMove);if(e.code==='KeyT')toggleAuto();if(e.code==='KeyQ')castHeroSkill();const digit=/^(Digit|Numpad)[123456]$/.test(e.code)?Number(e.code.slice(-1)):0;if(digit&&digit<=3)summon(['zombie','skeleton','spirit'][digit-1]);else if(digit)useItem(['magnet','bomb','book'][digit-4]);}}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{resetInput();if(game?.mode==='playing')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){bankGold();resetInput();if(game?.mode==='playing')pause();}});window.addEventListener('pagehide',bankGold);
  canvas.addEventListener('pointerdown',e=>{if(game?.mode!=='playing'||joystick||helpPrevious!==null||e.button>0)return;const r=canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;joystick={id:e.pointerId,x,y,dx:0,dy:0};canvas.setPointerCapture(e.pointerId);show('joystick',true);$('joystick').style.left=x+'px';$('joystick').style.top=y+'px';$('joystick').querySelector('i').style.transform='translate(0,0)';});
  canvas.addEventListener('pointermove',e=>{if(!joystick||joystick.id!==e.pointerId)return;const r=canvas.getBoundingClientRect();let dx=e.clientX-r.left-joystick.x,dy=e.clientY-r.top-joystick.y;const len=Math.hypot(dx,dy);if(len>40){dx*=40/len;dy*=40/len;}joystick.dx=dx;joystick.dy=dy;$('joystick').querySelector('i').style.transform='translate('+dx+'px,'+dy+'px)';});
  const release=e=>{if(joystick?.id===e.pointerId){joystick=null;show('joystick',false);}};for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
  summonButtons();itemButtons();stageCards();profileUI();worldUI();requestAnimationFrame(frame);
})();
