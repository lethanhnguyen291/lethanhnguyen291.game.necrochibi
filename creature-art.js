(function(root){
  'use strict';
  const assets={
    zombie:{src:'assets/summons/zombie.webp',frame:{x:-37,y:-48,w:74,h:74},rig:{top:9,cut:15,legs:[{x:-20,w:21,pivot:-10},{x:1,w:19,pivot:10}]}},
    skeleton:{src:'assets/summons/skeleton.webp',frame:{x:-38,y:-49,w:76,h:76},rig:{top:10,cut:16,legs:[{x:-17,w:17,pivot:-9},{x:0,w:18,pivot:9}]}},
    spirit:{src:'assets/summons/spirit.webp',frame:{x:-37,y:-49,w:74,h:74}}
  };
  function portrait(type){const a=assets[type];return a?'<img class="summon-portrait" src="'+a.src+'" alt="" width="128" height="128" decoding="async">':'';}
  root.NecroCreatureArt={assets,portrait};if(typeof module!=='undefined')module.exports=root.NecroCreatureArt;
})(typeof globalThis!=='undefined'?globalThis:this);
