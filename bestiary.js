(function(root){
  'use strict';
  const D=root.NecroData||(typeof require==='function'?require('./data.js'):null);
  const Engine=root.NecroEngine||(typeof require==='function'?require('./engine.js'):null);
  const summonNotes={
    zombie:{title:'Vệ binh Khâu Lá',lore:'Ký ức người gác vườn, được Tinh Chỉ khâu lại để bảo vệ Hội Tam Ấn.',behavior:'Áp sát và cắn làm chậm mục tiêu trong 2 giây. Quái gần thường ưu tiên tấn công thây ma.',tip:'Gọi làm tuyến trước để bộ xương có khoảng trống bắn. Khi đi xa, đệ tự quay về đội hình quanh bạn.'},
    skeleton:{title:'Cung thủ Chỉ Hồn',lore:'Người đưa thư năm xưa căng sợi hồn thành dây cung, bắn những mũi tên dẫn lối.',behavior:'Bắn từ xa, tự lùi nếu quái đến gần. Giữ khoảng cách khoảng 160–320; có thể bắn mục tiêu trong tầm 390.',tip:'Cần thây ma che chắn. Nâng cấp tên tách nhánh giúp dọn đám đông.'},
    spirit:{title:'Sứ giả Kính Khuyết',lore:'Đốm ký ức tìm được lối về qua mảnh gương thiếu một góc. Luôn bay bên người giữ đèn.',behavior:'Khi còn sống, góp phần hồi lớp giáp cho pháp sư. Lao vào quái rồi tự tan, gây sát thương nổ trong bán kính 85.',tip:'Dùng khi quái tụ thành nhóm. Linh hồn là đệ cảm tử; nổ xong cần triệu hồi lại.'}
  };
  const enemyNotes={
    slime:{title:'Bầy tràn lối',behavior:'Di chuyển chậm, áp sát và gây sát thương tiếp xúc.',tip:'Nguồn xác và EXP đầu trận. Giữ khoảng cách, nhặt tài nguyên rồi gọi tuyến trước.'},
    imp:{title:'Kẻ đuổi bắt',behavior:'Quỷ nhỏ chạy rất nhanh, tìm đường áp sát pháp sư hoặc quân đoàn.',tip:'Đừng đứng yên. Dùng thây ma làm chậm hoặc lướt qua khoảng trống.'},
    eye:{title:'Kẻ bắn từ xa',behavior:'Giữ khoảng cách, phóng đạn phép về phía pháp sư mỗi 2.8 giây khi trong tầm.',tip:'Né ngang đường đạn. Quân đoàn có thể đỡ đạn địch, riêng linh hồn không chặn đạn.'},
    eater:{title:'Kẻ nuốt ký ức',behavior:'Tìm xác trong tầm 600. Mỗi xác ăn được tăng 12% máu tối đa và hồi 65 máu.',tip:'Triệu hồi để dùng xác sớm, tránh để nó tích lũy sức mạnh giữa một bãi xác.'},
    knight:{title:'Lưỡi kiếm đen',behavior:'Quái giáp nặng với nhiều máu. Khi đến gần, báo trước rồi quét vùng bán kính 100.',tip:'Rời vòng cảnh báo trước khi kiếm chạm đất; để bộ xương bào máu từ xa.'}
  };
  function entries(kind='summons'){
    if(kind==='summons')return Object.entries(D.summons).map(([id,s])=>({id,name:s.name,...summonNotes[id],friendly:true,role:s.role,color:s.color,
      stats:[['Máu',s.hp],['Sát thương',s.damage],['Mana / đệ',s.mana/5],['Hồi chiêu',s.cooldown+'s'],['Tốc độ',s.speed]],preview:{type:id,hp:s.hp,maxHp:s.hp}}));
    if(kind==='enemies')return Object.entries(D.enemies).map(([id,s])=>({id,name:s.name,...enemyNotes[id],friendly:false,color:'#f0a0a6',role:'Quái thường',
      stats:[['Máu',s.hp],['Sát thương',s.damage],['Tốc độ',s.speed],['EXP',s.xp]],preview:{...s,type:id,maxHp:s.hp}}));
    // Use isolated engine instances so boss figures always follow the combat rules.
    if(kind==='bosses'){
      const reference=new Engine.Game(0,()=>.5);reference.time=30;const mini=reference.spawnMiniBoss();
      const records=[{id:'miniBoss',enemy:mini,title:'Xuất hiện mỗi 30 giây',role:'Trùm nhỏ',behavior:'Đuổi theo mục tiêu, báo trước rồi đập một vùng bán kính 60. Chỉ số mạnh dần theo thời gian.',tip:'Hạ để nhận vật phẩm hỗ trợ ngẫu nhiên. Mỗi loại vật phẩm dùng tối đa 3 lần trong trận.'},
        ...[0,1,2].map(index=>({id:'boss-'+index,enemy:reference.spawnBoss(index),title:['03:00 · Người gác cổng','06:00 · Nữ hoàng','10:00 · Trùm cuối'][index],role:'Trùm '+(index+1),
          behavior:index===2?'Khóa đấu trường bằng vòng lửa, gọi quái, đập vùng rộng và gầm làm hao quân đoàn. Có giáp và giới hạn sát thương nhận theo thời gian.':'Đập vùng có báo trước và gọi thêm slime định kỳ. Có giáp và giới hạn sát thương nhận theo thời gian.',
          tip:index===2?'Giữ đội hình gần mình, né vòng đập và tái triệu hồi sau tiếng gầm. Bom giữ lại một nửa số xác.':'Di chuyển ra khỏi vùng cảnh báo. Duy trì tuyến trước, giữ mana để bổ sung đệ.'}))];
      return records.map(({enemy:e,...info})=>({...info,name:e.name,friendly:false,color:'#edc48d',stats:[['Máu',e.maxHp],['Sát thương',Math.round(e.damage*10)/10],['Giáp',Math.round(e.armor*100)+'%'],['Tốc độ',e.speed],['EXP',e.xp]],preview:e}));
    }
    return[];
  }
  const notes={summons:'Chỉ số cơ bản trước nâng cấp. Có 1–5 giá trị xác là gọi được 1–5 đệ; mana tính theo số đệ. Tối đa 80 đệ trên sân. Hợp nhất và thủ lĩnh có tạo hình lớn cùng dấu ấn riêng.',enemies:'Chỉ số gốc ở màn 1, thời điểm đầu trận. Máu tăng theo thời gian và độ khó màn; sát thương tăng theo độ khó màn.',bosses:'Chỉ số ở màn 1. Trùm nhỏ minh họa đợt đầu 00:30; những đợt sau mạnh hơn. Ba trùm lớn xuất hiện ở 03:00, 06:00 và 10:00.'};
  root.NecroBestiary={entries,notes};if(typeof module!=='undefined')module.exports=root.NecroBestiary;
})(typeof globalThis!=='undefined'?globalThis:this);
