(function(root){
  'use strict';
  const colors={graveStaff:'#f4cf79',moonWand:'#b3e878',rubyStaff:'#f39a8e',frostStaff:'#9ee8ff',soulTome:'#d9b0f9'};
  function mark(kind='seal',x=0,y=0,size=1,color='#ecd199'){
    let lines=kind==='thread'?'<path d="m0-10 8 10-8 10-8-10zM-4-3l8 6m-8-1 8 6m-8-11 8 6"/>':kind==='root'?'<path d="M0 10Q-12 0 0-11 12 0 0 10zm0-17V8M-5-1l5 5 5-5"/>':kind==='mirror'?'<path d="m7-6-7-4-9 5v10l9 5 9-5V0M2-8l5 7m-2-8 5 6"/>':'<path d="M6-7A9 9 0 1 0 9 1M-4-5v10M0-7v14M4-5v10"/>';
    return '<g transform="translate('+x+' '+y+') scale('+size+')" fill="none" stroke="'+color+'" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+lines+'</g>';
  }
  function svg(id='graveStaff',{portrait=false}={}){
    if(!colors[id])id='graveStaff';const color=colors[id],g='relic-'+id,ink='#292438';
    const path=(d,fill='none',stroke=ink,width=2.5)=>'<path d="'+d+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" stroke-linejoin="round"/>';
    const circle=(x,y,r,fill,stroke='none',width=2)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+width+'"/>';
    const shaft=path('M40 111 43 46','none',ink,8)+path('M40 111 43 46','none','#b68b61',4.5);
    let art='';
    if(id==='graveStaff'){
      art=circle(41,28,25,color+'22')+shaft+path('M40 111q-8-5 1-10t1-12q-8-5 1-10t0-13q-8-4 0-11','none','#70513f',3)+path('m41 6 9 13 13 8-14 9-8 14-9-14-13-9 13-8z','url(#'+g+')')+path('m41 17 4 7 7 3-7 4-4 8-4-8-7-4 7-3z','#fff1bc','#b48742',1.6)+mark('seal',41,27,.46,'#aa7938')+path('M43 52q15 3 10 18','none','#e5be6d',1.6)+path('m53 67 5 6-5 7-5-7z',color);
    }else if(id==='moonWand'){
      art=circle(40,29,25,color+'22')+path('M37 113q17-11 4-26T42 61q13-13-2-20l-10-8m12 28 16-15','none',ink,8)+path('M37 113q17-11 4-26T42 61q13-13-2-20l-10-8m12 28 16-15','none','#997349',4.5)+path('M41 48Q17 25 46 7q18 23-5 41z','url(#'+g+')')+path('m43 13-3 28m-8-18 9 7 9-11m-17 13 8 4 10-10','none','#edf9ad',2)+path('M39 65q-22-19-24-6 6 15 24 6',color)+path('M48 73q21-15 20-2-4 12-20 2',color)+path('m35 85 13-5m-12 11 13-5','none','#dfbf6b',3)+mark('root',41,53,.38,'#f8e7a0');
    }else if(id==='rubyStaff'){
      art=circle(40,30,27,color+'22')+shaft+path('M43 51Q9 38 25 15m18 36q29-14 15-36','none','#ad8556',4)+path('M26 15q15-12 29 0L58 42 42 52 24 42z','#633c47')+path('m30 19 20 0 2 20-11 7-12-7z','url(#'+g+')','#f2c57b',2)+path('m41 22 6 9-6 11-6-11z','#ffe5a7','none')+path('M25 14h32M28 43l27 0M42 4v7m-7 0 7-6 7 6','none','#dcb274',3)+path('m39 71 8-2m-8 9 8-2m-9 9 8-2','none','#e6c592',2.5)+mark('seal',42,100,.35,'#f2c57b');
    }else if(id==='frostStaff'){
      art=circle(40,29,28,color+'19')+path('M39 112 42 51','none',ink,8)+path('M39 112 42 51','none','#b8cee0',4.5)+path('M53 12A23 23 0 1 0 63 34','none','#567fa5',5)+path('M53 12A23 23 0 1 0 63 34','none',color,2)+path('m41 10 6 12 12 7-12 7-6 13-6-13-12-7 12-7z','url(#'+g+')','#d9faff',1.6)+path('m57 9 7 6-4 9-6-6z',color)+circle(16,26,3,color)+circle(63,43,2.5,color)+path('m35 62 12 0m-12 7 11 0M40 78l-6 8 6 7 6-7z','none','#9ee8ff',2)+mark('mirror',41,30,.4,'#426689');
    }else{
      art=circle(40,71,32,color+'1c')+path('M40 49Q24 39 9 46L12 93q17-5 28 5 13-10 29-5l3-47q-16-7-32 3z','#5a3f7f','#e6c78c',3)+path('M40 53Q26 45 15 50l3 36q13-2 22 6 11-8 22-6l4-36q-11-5-26 3z','url(#'+g+')','#bba0d9',1.6)+path('M40 53v39M18 55l16 6m-15 1 14 5m-13 1 13 5m14-12 14-6m-14 12 13-5','none','#d0b8ed',1.5)+mark('seal',53,75,.8,'#f5d991')+path('m28 89-3 20 8-5 5 4-1-17z','#b485c8')+path('m12 51 6 0m-6 7 6 0m-5 7 6 0m-5 7 6 0','none','#f1cc83',2)+path('m21 39 4-10 4 10m29-2 4-12 4 12','none',color,1.5);
    }
    const view=portrait&&id==='soulTome'?'0 31 80 83':'0 0 80 120';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+view+'" width="80" height="120" aria-hidden="true"><defs><linearGradient id="'+g+'" x2=".7" y2="1"><stop stop-color="#fff4c7"/><stop offset=".4" stop-color="'+color+'"/><stop offset="1" stop-color="'+(id==='moonWand'?'#559355':id==='frostStaff'?'#4d96be':id==='soulTome'?'#9870b5':'#b47d48')+'"/></linearGradient></defs>'+art+'</svg>';
  }
  const icon=(kind='seal',color)=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 24 24" aria-hidden="true">'+mark(kind,0,0,1,color)+'</svg>';
  root.NecroRelicArt={colors,mark,svg,icon};if(typeof module!=='undefined')module.exports=root.NecroRelicArt;
})(typeof globalThis!=='undefined'?globalThis:this);
