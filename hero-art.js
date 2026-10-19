(function(root){
  'use strict';
  const RelicArt=root.NecroRelicArt||(typeof require==='function'?require('./relic-art.js'):null);
  // Web-sized transparent portraits are shared by the shop and battlefield.
  const styles={
    apprentice:{coat:'#7560a8',skin:'#f4cdb8',accent:'#efcf8e'},
    keeper:{coat:'#467968',skin:'#dba486',accent:'#f3c66e'},
    soulcaller:{coat:'#477f9b',skin:'#eed1c0',accent:'#d3dbff'}
  };
  const assets={
    apprentice:{src:'assets/heroes/linh.webp',weapon:'graveStaff',frame:{x:-52,y:-76,w:104,h:104},grip:{x:-22.8,y:-11.1,rx:3.1,ry:3.6}},
    keeper:{src:'assets/heroes/moc.webp',weapon:'moonWand',frame:{x:-52,y:-76,w:104,h:104},grip:{x:-19.5,y:-7.9,rx:3.1,ry:3.5}},
    soulcaller:{src:'assets/heroes/lam.webp',weapon:'frostStaff',frame:{x:-52,y:-76,w:104,h:104},grip:{x:-24.7,y:-8.8,rx:3.1,ry:3.6}}
  };
  assets.apprentice.rig={top:8,cut:13,legs:[{x:-25,w:25,pivot:-12},{x:0,w:24,pivot:10}]};
  assets.keeper.rig={top:7,cut:12,legs:[{x:-17,w:18,pivot:-7},{x:1,w:20,pivot:11}]};
  assets.soulcaller.rig={top:8,cut:14,legs:[{x:-24,w:24,pivot:-11},{x:0,w:23,pivot:9}]};
  function portrait(id='apprentice',weaponId){
    const asset=assets[id]||assets.apprentice,f=asset.frame,g=asset.grip,px=(g.x-f.x)/f.w*100,py=(g.y-f.y)/f.h*100;
    const weapon=weaponId||asset.weapon,h=weapon==='soulTome'?61:72,w=h*2/3;
    const img='<img src="'+asset.src+'" width="1254" height="1254" alt="" decoding="async"';
    return '<span class="hero-portrait" aria-hidden="true">'+img+'><span class="portrait-relic" style="left:'+(px-w/2/f.w*100)+'%;top:'+(py-h*65/120/f.h*100)+'%;width:'+(w/f.w*100)+'%;height:'+(h/f.h*100)+'%;transform:rotate(-.2rad);transform-origin:50% 54.167%">'+RelicArt.svg(weapon)+'</span>'+img+' style="clip-path:ellipse('+(g.rx/f.w*100)+'% '+(g.ry/f.h*100)+'% at '+px+'% '+py+'%)"></span>';
  }
  root.NecroHeroArt={styles,assets,portrait};
  if(typeof module!=='undefined')module.exports=root.NecroHeroArt;
})(typeof globalThis!=='undefined'?globalThis:this);

