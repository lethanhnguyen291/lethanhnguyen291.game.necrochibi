(function(root){
  'use strict';
  // Combat advances at the same rate on 30, 60 and 120 Hz displays.
  class FixedClock{
    constructor(){this.reset();}
    reset(){this.remaining=0;}
    advance(elapsed,speed,playing,step){
      if(!playing()){this.reset();return 0;}
      this.remaining+=Math.min(.1,Math.max(0,elapsed))*speed;let count=0;
      const interval=1/60;while(this.remaining+1e-9>=interval&&playing()){this.remaining=Math.max(0,this.remaining-interval);step(interval);count++;}
      if(!playing())this.reset();return count;
    }
  }
  root.NecroRuntime={FixedClock};if(typeof module!=='undefined')module.exports=root.NecroRuntime;
})(typeof globalThis!=='undefined'?globalThis:this);
