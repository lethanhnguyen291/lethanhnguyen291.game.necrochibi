(function(root){
  'use strict';
  const HeroArt=root.NecroHeroArt||(typeof require==='function'?require('./hero-art.js'):null);
  const RelicArt=root.NecroRelicArt||(typeof require==='function'?require('./relic-art.js'):null);
  const stages=[
    {name:'Nghĩa địa tím',subtitle:'Nơi quân đoàn đầu tiên thức dậy',color:'#9d73f2',floor:'#231b30',ground:'#30263e',accent:'#8870a8',difficulty:1,prop:'grave'},
    {name:'Đầm linh hồn',subtitle:'Những lời thì thầm dưới làn sương',color:'#59d8bd',floor:'#172b32',ground:'#203841',accent:'#5b9393',difficulty:1.16,prop:'swamp'},
    {name:'Thung lũng tro',subtitle:'Dấu chân nhỏ giữa biển tàn than',color:'#ef9973',floor:'#302027',ground:'#432e35',accent:'#aa7369',difficulty:1.32,prop:'ash'},
    {name:'Thành xương trắng',subtitle:'Đánh thức người gác cổng bị lãng quên',color:'#d8bb87',floor:'#282536',ground:'#383446',accent:'#a69b95',difficulty:1.48,prop:'bone'},
    {name:'Cổng địa ngục',subtitle:'Cuộc quái triều cuối cùng',color:'#ec779c',floor:'#301b30',ground:'#44253e',accent:'#ab6f9c',difficulty:1.65,prop:'gate'}
  ];
  const summons={
    zombie:{name:'Thây ma',icon:'♟',mana:20,hp:85,damage:7,speed:115,reach:35,interval:1.15,cooldown:3,color:'#74e2c1',role:'Đỡ đòn · cắn làm chậm'},
    skeleton:{name:'Bộ xương',icon:'☠',mana:30,hp:38,damage:11,speed:160,reach:340,interval:1.2,cooldown:5,color:'#c9b8ff',role:'Giữ khoảng cách · bắn xương'},
    spirit:{name:'Linh hồn',icon:'♧',mana:45,hp:30,damage:42,speed:275,reach:150,interval:1,cooldown:7,color:'#92d9ff',role:'Tạo giáp · lao vào nổ lan'}
  };
  const enemies={
    slime:{name:'Slime địa ngục',hp:30,damage:9,speed:53,r:14,xp:1},
    imp:{name:'Quỷ lùn',hp:85,damage:14,speed:185,r:15,xp:2},
    eye:{name:'Mắt phép',hp:135,damage:13,speed:65,r:17,xp:3},
    eater:{name:'Quái ăn xác',hp:300,damage:18,speed:90,r:23,xp:4},
    knight:{name:'Kỵ sĩ hắc ám',hp:620,damage:25,speed:86,r:26,xp:6}
  };
  const itemSvg=body=>'<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+body+'</svg>';
  const items={
    magnet:{name:'Nam châm',key:'4',color:'#9be8d1',description:'Thu ngay toàn bộ EXP, vàng và vật phẩm đang rơi trên bản đồ.',icon:itemSvg('<path d="M10 9v12a10 10 0 0 0 20 0V9h-7v12a3 3 0 0 1-6 0V9z"/><path d="M10 15h7m6 0h7M5 4l4 3m26-3-4 3"/>')},
    bomb:{name:'Bom',key:'5',color:'#f5a493',description:'Xóa quái thường, 50% số xác và đạn địch. Giữ xác gần pháp sư để gọi lại đệ; trùm chịu sát thương giới hạn.',icon:itemSvg('<circle cx="19" cy="24" r="12"/><path d="m24 12 3-5 5 2m-3-3 1-3m4 5 3-1M12 21l3-3"/>')},
    book:{name:'Sách phù phép',key:'6',color:'#c6a0f1',description:'Tăng chỉ số chiến đấu và triệu hồi 20% trong 20 giây. Không cộng dồn.',icon:itemSvg('<path d="M20 10c-5-4-11-4-15-2v23c5-2 10-2 15 2 5-4 10-4 15-2V8c-4-2-10-2-15 2zm0 0v23M10 13l5 1m-5 5 5 1m11-6 4-1m-4 7 4-1"/>')}
  };
  const heroes=[
    {id:'apprentice',name:'Linh · Tập sự',title:'Cân bằng',price:0,color:'#7560a8',trim:'#c7b3f2',house:'Nhà Chỉ Vàng',lore:'Người khâu những lối hồn rách bằng sợi Tinh Chỉ.',desc:'130 máu · 100 mana. Pháp sư cân bằng, dễ làm quen.',ability:{id:'stitch',name:'Khâu Hồn',short:'KHÂU HỒN',mana:20,cooldown:18,range:360,color:'#edcf8a',icon:RelicArt.icon('thread'),desc:'Nối tối đa 6 quái gần, đánh hai nhịp cách nhau 1.2 giây.'},icon:HeroArt.portrait('apprentice'),apply:p=>{}},
    {id:'keeper',name:'Mộc · Giữ mộ',title:'Bền bỉ',price:350,color:'#467968',trim:'#a3c4a3',house:'Vườn Chuông Câm',lore:'Mang hạt Đèn Mầm để giữ cho ký ức người mất không lụi tắt.',desc:'+35 máu, đệ thêm 15% máu. Di chuyển chậm hơn 5%.',ability:{id:'garden',name:'Vườn Đèn',short:'VƯỜN ĐÈN',mana:25,cooldown:24,range:180,color:'#b9e58b',icon:RelicArt.icon('root'),desc:'Vườn đèn 6 giây: hồi 4 máu/giây cho pháp sư, 3% máu/giây cho đệ ở trong, làm chậm quái.'},icon:HeroArt.portrait('keeper'),apply:p=>{p.maxHp+=35;p.minionHealth*=1.15;p.speed*=.95;}},
    {id:'soulcaller',name:'Lam · Gọi hồn',title:'Triệu hồi',price:650,color:'#477f9b',trim:'#a7e4e7',house:'Tháp Kính Khuyết',lore:'Đọc đường đi của linh hồn qua những mảnh kính mất một góc.',desc:'+30 mana, hồi thêm 0.8 mana/giây, đệ thêm 10% sát thương. Giảm 15 máu.',ability:{id:'nova',name:'Tinh Trận',short:'TINH TRẬN',mana:30,cooldown:22,range:250,color:'#a5e8fa',icon:RelicArt.icon('mirror'),desc:'Nổ tinh thể quanh mình; quái thường đóng băng 1.6 giây, boss chỉ bị làm chậm.'},icon:HeroArt.portrait('soulcaller'),apply:p=>{p.maxHp-=15;p.maxMana+=30;p.manaRegen+=.8;p.minionPower*=1.1;}}
  ];
  const weapons=[
    {id:'graveStaff',name:'Gậy Ấn Tinh',title:'Tinh Chỉ',origin:'Nhà Chỉ Vàng',price:0,color:RelicArt.colors.graveStaff,shape:'star',desc:'20 sát thương, bắn mỗi 0.65 giây.',special:{id:'seal',name:'Tinh Ấn',every:6,desc:'Mỗi 6 đòn trúng, nổ dấu ấn gây 70% sát thương phép trong vùng nhỏ.'},icon:RelicArt.svg('graveStaff',{portrait:true}),apply:p=>{}},
    {id:'moonWand',name:'Cành Nguyệt Diệp',title:'Mầm sống',origin:'Vườn Chuông Câm',price:180,color:RelicArt.colors.moonWand,shape:'leaf',desc:'Bắn nhanh hơn 25%, mỗi đạn giảm 10% sát thương.',special:{id:'leaf',name:'Lá Trở Về',every:5,desc:'Mỗi 5 đòn trúng, lá nảy sang quái khác gây 65% sát thương phép và hồi 2 máu.'},icon:RelicArt.svg('moonWand',{portrait:true}),apply:p=>{p.fireInterval*=.8;p.damage*=.9;}},
    {id:'rubyStaff',name:'Trượng Huyết Đăng',title:'Lửa ký ức',origin:'Lò Tàn Âm',price:350,color:RelicArt.colors.rubyStaff,shape:'lantern',desc:'+25% sát thương, khoảng nghỉ giữa các lần bắn tăng 15%.',special:{id:'embers',name:'Đốm Tàn Âm',every:4,desc:'Mỗi 4 đòn trúng, tạo vùng lửa 3 giây, gây 30% sát thương phép mỗi giây.'},icon:RelicArt.svg('rubyStaff',{portrait:true}),apply:p=>{p.damage*=1.25;p.fireInterval*=1.15;}},
    {id:'frostStaff',name:'Trượng Tinh Kính',title:'Kính Khuyết',origin:'Tháp Kính Khuyết',price:550,color:RelicArt.colors.frostStaff,shape:'mirror',desc:'Đạn làm chậm mục tiêu 1.2 giây. Sát thương giảm 5%.',special:{id:'frost',name:'Vỡ Kính',every:6,desc:'Mỗi 6 đòn trúng, nổ băng gây 55% sát thương phép, đóng băng quái thường gần đó 1 giây.'},icon:RelicArt.svg('frostStaff',{portrait:true}),apply:p=>{p.damage*=.95;p.staffSlow=1.2;}},
    {id:'soulTome',name:'Sổ Chỉ Hồn',title:'Khế ước',origin:'Sảnh Lưu Hồn',price:800,color:RelicArt.colors.soulTome,shape:'book',desc:'+0.8 mana/giây, đệ +12% sát thương, phép thường giảm 15% sát thương.',special:{id:'pages',name:'Trang Về Nguồn',every:7,desc:'Mỗi 7 đòn trúng, hồi 5 mana và rút ngắn hồi chiêu triệu hồi 0.8 giây.'},icon:RelicArt.svg('soulTome',{portrait:true}),apply:p=>{p.manaRegen+=.8;p.minionPower*=1.12;p.damage*=.85;}}
  ];
  const world={name:'Dạ Khâu',guild:'Hội Tam Ấn',motto:'Giữ ngọn đèn. Nối đường hồn.',story:'Sau Đêm Vỡ Chuông, ranh giới người sống và ký ức người mất rách thành những quái triều. Hội Tam Ấn dùng Tinh Chỉ, Đèn Mầm và Kính Khuyết để khâu lại các lối hồn. Quân đoàn được triệu hồi là những ký ức được cho mượn hình hài.',details:[
    {title:'Dấu Tam Kết',kind:'seal',text:'Vòng tròn hở và ba đường khâu là lời hẹn trở về. Dấu này xuất hiện trên vũ khí, bìa sổ phép, biểu trưng và cột neo hồn.'},
    {title:'Tinh Chỉ',kind:'thread',text:'Sợi sáng mắc lại trong mảnh Chuông Gốc. Linh dệt nó thành ấn phép và những đường nối giữa nhiều linh hồn.'},
    {title:'Đèn Mầm',kind:'root',text:'Hạt cây chỉ mọc nơi có người còn được nhớ đến. Mộc mang đèn này để nuôi lại sức sống cho cả quân đoàn.'},
    {title:'Kính Khuyết',kind:'mirror',text:'Mảnh gương luôn thiếu một góc để linh hồn có lối ra. Lam dùng nó giữ quái trong những tinh trận ngắn ngủi.'},
    {title:'Chuông Câm & Cột Tam Ấn',kind:'seal',text:'Những chuông vỡ và cột khâu nằm rải trong đấu trường là dấu tích của các chuyến vá đường hồn trước đó.'}
  ]};
  const permanentUpgrades=[
    {id:'armor',name:'Giáp linh hồn',icon:'⛨',max:5,baseCost:80,desc:'Mỗi cấp giảm thêm 2% sát thương nhận.',effect:n=>'Giảm '+(n*2)+'% sát thương',apply:(p,n)=>p.armor+=n*.02},
    {id:'damage',name:'Sức mạnh phép',icon:'✦',max:5,baseCost:80,desc:'Mỗi cấp thêm 5% sát thương phép cơ bản.',effect:n=>'Sát thương +'+(n*5)+'%',apply:(p,n)=>p.damage*=1+n*.05},
    {id:'healing',name:'Hồi máu',icon:'❦',max:5,baseCost:100,desc:'Mỗi cấp hồi thêm 0.2 máu mỗi giây.',effect:n=>'Hồi '+(n*.2).toFixed(1)+' máu/giây',apply:(p,n)=>p.regen+=n*.2},
    {id:'health',name:'Sinh lực',icon:'♥',max:5,baseCost:80,desc:'Mỗi cấp thêm 10 máu tối đa.',effect:n=>'Máu tối đa +'+(n*10),apply:(p,n)=>p.maxHp+=n*10},
    {id:'revive',name:'Hồi sinh',icon:'♧',max:1,baseCost:500,desc:'Một lần mỗi trận: hồi sinh với 50% máu và miễn sát thương 3 giây.',effect:n=>n?'1 lần hồi sinh / trận':'Chưa có hồi sinh',apply:(p,n)=>p.reviveCharges=n},
    {id:'manaFlow',name:'Hồi mana',icon:'◈',max:5,baseCost:60,desc:'Mỗi cấp thêm 0.75 mana/giây và 10 mana tối đa.',effect:n=>'+'+(n*.75).toFixed(2)+' mana/giây · +'+(n*10)+' mana tối đa',apply:(p,n)=>{p.manaRegen+=n*.75;p.maxMana+=n*10;}}
  ];
  const upgrades=[
    {id:'power',name:'Gậy hắc nguyệt',icon:'✦',branch:'BẢN THÂN',desc:'Sát thương gậy phép tăng 15%.',max:6,apply:p=>p.damage*=1.15},
    {id:'haste',name:'Niệm chú nhanh',icon:'ϟ',branch:'BẢN THÂN',desc:'Khoảng nghỉ giữa các lần bắn giảm 10%.',max:5,apply:p=>p.fireInterval*=.9},
    {id:'multi',name:'Phép phân thân',icon:'⋔',branch:'BẢN THÂN',desc:'Thêm một đạn phép mỗi lượt bắn.',max:3,apply:p=>p.shots++},
    {id:'ricochet',name:'Đạn nảy',icon:'⤳',branch:'BẢN THÂN',desc:'Đạn từ gậy nảy thêm 1 lần sang quái khác.',max:3,apply:p=>p.bounces++},
    {id:'siphon',name:'Tia hút hồn',icon:'✧',branch:'BẢN THÂN',desc:'Mỗi đạn gậy trúng đích có 25% cơ hội hồi 3 mana và giảm hồi chiêu.',max:1,apply:p=>p.siphon=true},
    {id:'fireRing',name:'Vòng tròn địa ngục',icon:'◉',branch:'BẢN THÂN',desc:'Vòng lửa tím đốt quái xung quanh. Mỗi cấp thêm 12 sát thương/giây.',max:4,apply:p=>p.fireRing++},
    {id:'heart',name:'Trái tim bất diệt',icon:'♡',branch:'BẢN THÂN',desc:'Thêm 30 máu tối đa, hồi ngay 50 máu.',max:8,apply:p=>{p.maxHp+=30;p.hp=Math.min(p.maxHp,p.hp+50);}},
    {id:'mana',name:'Bình linh lực',icon:'◈',branch:'BẢN THÂN',desc:'Thêm 35 mana tối đa, hồi ngay 45 mana, hồi thêm 1.5 mana/giây.',max:6,apply:p=>{p.maxMana+=35;p.mana=Math.min(p.maxMana,p.mana+45);p.manaRegen+=1.5;}},
    {id:'speed',name:'Bước chân phù thủy',icon:'➶',branch:'BẢN THÂN',desc:'Chạy nhanh hơn 10%, lướt hồi nhanh hơn 12%.',max:4,apply:p=>{p.speed*=1.1;p.dashMax*=.88;}},
    {id:'magnet',name:'Lời gọi tinh thể',icon:'❋',branch:'BẢN THÂN',desc:'Tầm hút kinh nghiệm và tầm gọi xác tăng 30%.',max:3,apply:p=>{p.magnet*=1.3;p.summonRange*=1.3;}},
    {id:'regen',name:'Máu của trăng',icon:'❦',branch:'BẢN THÂN',desc:'Hồi 1.2 máu mỗi giây, hồi ngay 20 máu.',max:5,apply:p=>{p.regen+=1.2;p.hp=Math.min(p.maxHp,p.hp+20);}},
    {id:'minionPower',name:'Quân đoàn thức tỉnh',icon:'⚑',branch:'QUÂN ĐOÀN',desc:'Tất cả đệ có thêm 12% sát thương và 10% máu.',max:6,apply:p=>{p.minionPower*=1.12;p.minionHealth*=1.1;}},
    {id:'fusion',name:'Hợp nhất đệ',icon:'✥',branch:'QUÂN ĐOÀN',desc:'Khi chật 80 ô: hợp 5 đệ thường cùng loại ở gần thành 1 đệ khổng lồ để gọi thêm.',max:1,apply:p=>p.fusion=true},
    {id:'poison',name:'Thây ma độc',icon:'☣',branch:'QUÂN ĐOÀN',desc:'Thây ma chết để lại vũng độc 6 giây gây sát thương liên tục.',max:1,apply:p=>p.poison=true},
    {id:'split',name:'Xương phân mảnh',icon:'⋏',branch:'QUÂN ĐOÀN',desc:'Bộ xương bắn 3 mũi xương theo hình nón.',max:1,apply:p=>p.split=true},
    {id:'economy',name:'Tiết kiệm tế phẩm',icon:'♜',branch:'QUÂN ĐOÀN',desc:'Chỉ cần 3 xác thay vì 5 để gọi đủ 5 đệ. Mana không đổi.',max:1,apply:p=>p.corpseNeed=3},
    {id:'cooldown',name:'Khế ước tốc hành',icon:'⌁',branch:'QUÂN ĐOÀN',desc:'Thời gian hồi cả ba kỹ năng giảm 18%.',max:4,apply:p=>p.summonCooldown*=.82},
    {id:'explosion',name:'Nổ xác',icon:'✺',branch:'GIAO THOA',desc:'Xác chớp đỏ ở 5 giây cuối có thể bị đạn gậy kích nổ. Gậy tự nhắm xác có quái bên cạnh.',max:1,apply:p=>p.explosion=true},
    {id:'recycle',name:'Thu hồi linh lực',icon:'⟲',branch:'GIAO THOA',desc:'Xác tự tan sau 30 giây hóa thành tia tím, hồi 2 mana mỗi giá trị xác.',max:1,apply:p=>p.recycle=true},
    {id:'leader',name:'Linh hồn thủ lĩnh',icon:'♛',branch:'GIAO THOA',desc:'Gọi từ xác boss tạo thêm phẩm chất thủ lĩnh cho một đệ: hào quang tăng 20% tốc đánh cả đội.',max:1,apply:p=>p.leader=true},
    {id:'sacrifice',name:'Hiến tế phòng thủ',icon:'⛨',branch:'GIAO THOA',desc:'Khi chịu đòn chí mạng, một đệ trong tầm 220 sẽ hy sinh để chịu thay toàn bộ đòn đó.',max:1,apply:p=>p.sacrifice=true},
    {id:'commander',name:'Chỉ huy cuồng nhiệt',icon:'⚔',branch:'GIAO THOA',desc:'Gậy phép đánh dấu mục tiêu trong 4 giây. Đệ ưu tiên đánh dấu, tăng 30% tốc đánh khi tấn công nó.',max:1,apply:p=>p.commander=true},
    {id:'ward',name:'Màn chắn linh hồn',icon:'◇',branch:'GIAO THOA',desc:'Giáp từ linh hồn hồi nhanh hơn; mọi sát thương nhận giảm 10%.',max:3,apply:p=>{p.wardPower++;p.armor=Math.min(.4,p.armor+.1);}}
  ];
  root.NecroData={stages,summons,enemies,items,heroes,weapons,world,permanentUpgrades,upgrades};
  if(typeof module!=='undefined')module.exports=root.NecroData;
})(typeof globalThis!=='undefined'?globalThis:this);

