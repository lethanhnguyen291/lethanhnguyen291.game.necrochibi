(function(root){
  'use strict';
  const TAU=Math.PI*2;
  // Advance the gait by world distance, so stopping, slow motion and pause cannot slide the feet.
  function track(state,entity,dt,active=true,reduced=false){
    if(!entity)return null;
    if(!state||state.entity!==entity)return{entity,x:entity.x,y:entity.y,phase:0,weight:0,facing:entity.look||1};
    if(!active&&!reduced){state.x=entity.x;state.y=entity.y;return state;}
    const dx=entity.x-state.x,dy=entity.y-state.y,distance=Math.hypot(dx,dy);
    const walking=active&&!reduced&&distance>.025&&distance<80;
    if(walking){state.phase=(state.phase+distance/96*TAU)%TAU;if(Math.abs(dx)>.08)state.facing=dx>0?1:-1;}
    state.weight=reduced?0:state.weight+((walking?1:0)-state.weight)*(1-Math.exp(-Math.max(0,dt)*22));
    if(state.weight<.001)state.weight=0;
    state.x=entity.x;state.y=entity.y;return state;
  }
  function pose(state){
    const phase=state?.phase||0,weight=state?.weight||0,step=Math.sin(phase);
    return{step:step*weight,bob:-Math.abs(Math.sin(phase*2))*.65*weight,
      left:{lift:-Math.max(0,step)*3.8*weight,angle:step*.16*weight,x:step*1.7*weight},
      right:{lift:-Math.max(0,-step)*3.8*weight,angle:-step*.16*weight,x:-step*1.7*weight}};
  }
  // Articulate the original painted boots underneath the robe; keep face and body intact.
  function paint(ctx,image,frame,rig,state){
    if(!rig||!state?.weight){ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h);return;}
    const p=pose(state);
    for(const [index,leg] of rig.legs.entries()){
      const motion=index?p.right:p.left;
      ctx.save();ctx.translate(leg.pivot+motion.x,rig.top+motion.lift);ctx.rotate(motion.angle);ctx.translate(-leg.pivot,-rig.top);
      ctx.beginPath();ctx.rect(leg.x,rig.top,leg.w,frame.y+frame.h-rig.top+6);ctx.clip();ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h);ctx.restore();
    }
    ctx.save();ctx.beginPath();ctx.rect(frame.x-8,frame.y-8,frame.w+16,frame.h+16);
    for(const leg of rig.legs)ctx.rect(leg.x,rig.cut,leg.w,frame.y+frame.h-rig.cut+8);
    ctx.clip('evenodd');ctx.drawImage(image,frame.x,frame.y,frame.w,frame.h);ctx.restore();
  }
  const api={track,pose,paint};root.NecroMotion=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
