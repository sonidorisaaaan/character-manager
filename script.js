var chars=[],cfg={},last={},tab="home",hi=0,busyN=0,bgm=new Audio(),bgmOn=false,LS="chars_v1",colors=["#b4543a","#4a7c8c","#7d6b9e","#5f8a5a","#c08a2e","#a0527a"];
bgm.loop=true;
var $=function(i){return document.getElementById(i)};
var FONTS=[["標準",""],["丸ゴシック",'"Zen Maru Gothic","Hiragino Maru Gothic ProN",sans-serif'],["明朝",'"Shippori Mincho","Hiragino Mincho ProN",serif'],["手書き風",'"Yomogi","Klee One",cursive'],["教科書体風",'"Klee One","Hiragino Mincho ProN",serif'],["ドット",'"DotGothic16",monospace']];
function col(c,i){return c.color||colors[i%6]}
function tf(c){return"translate("+(c.px||0)+"vw,"+(c.py||0)+"vh) scale("+(c.zoom||100)/100+")"}
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function norm(){chars.forEach(function(c){if(!c.imgs)c.imgs=c.img?[{u:c.img,n:"通常"}]:[]})}
var DB=null,MAP={},REV={};
function idb(){return new Promise(function(res){try{var r=indexedDB.open("charmgr",1);r.onupgradeneeded=function(){r.result.createObjectStore("b")};r.onsuccess=function(){res(r.result)};r.onerror=function(){res(null)}}catch(e){res(null)}})}
function loadBlobs(){return new Promise(function(res){if(!DB)return res();var rq=DB.transaction("b").objectStore("b").openCursor();rq.onsuccess=function(){var c=rq.result;if(c){var u=URL.createObjectURL(c.value);MAP[c.key]=u;REV[u]=c.key;c.continue()}else res()};rq.onerror=function(){res()}})}
function putBlob(blob){var id="idb:"+Date.now()+Math.random().toString(36).slice(2,7),u=URL.createObjectURL(blob);MAP[id]=u;REV[u]=id;if(DB)DB.transaction("b","readwrite").objectStore("b").put(blob,id);return u}
function ser(v){return JSON.stringify(v,function(k,x){return typeof x==="string"&&REV[x]?REV[x]:x})}
function des(t){return JSON.parse(t,function(k,x){return typeof x==="string"&&x.indexOf("idb:")===0?(MAP[x]||""):x})}
function lsGet(){try{return des(localStorage.getItem(LS)||"[]")}catch(e){return[]}}
function save(){try{localStorage.setItem(LS,ser(chars));localStorage.setItem(LS+"c",ser(cfg))}catch(e){alert("保存に失敗しました（容量不足の可能性があります）")}}
function nextBd(b){
  if(!b)return null;var p=b.split("-");if(p.length<3)return null;
  var t=new Date();t.setHours(0,0,0,0);
  var d=new Date(t.getFullYear(),+p[1]-1,+p[2]);
  if(d<t)d=new Date(t.getFullYear()+1,+p[1]-1,+p[2]);
  return Math.round((d-t)/864e5);
}
function age(b){
  if(!b)return"";var p=b.split("-"),y=+p[0];if(!y||y<1)return"";
  var t=new Date(),a=t.getFullYear()-y;
  if(t<new Date(t.getFullYear(),+p[1]-1,+p[2]))a--;return a+"歳";
}
function fmt(b){if(!b)return"誕生日未設定";var p=b.split("-");return(+p[1])+"月"+(+p[2])+"日"}
function card(c,i,showDays){
  var n=nextBd(c.bd),s="";
  if(n!=null&&(showDays||n<=30))s=n===0?"🎂 今日!":"あと"+n+"日";
  var av=c.imgs[0]?'<img src="'+esc(c.imgs[0].u)+'" alt="">':esc((c.name||"?")[0]);
  return '<div class="card" data-i="'+i+'"><div class="dot" style="background:'+col(c,i)+'">'+av+'</div><div><div class="nm">'+(c.fav?'★ ':'')+esc(c.name)+'</div><div class="sm">'+fmt(c.bd)+' '+age(c.bd)+(c.work?' ・ '+esc(c.work):'')+'</div></div><div class="soon">'+s+'</div></div>';
}
function render(){
  ["list","bd","menu","home"].forEach(function(p){$("pg-"+p).style.display=p===tab?"block":"none"});
  document.querySelectorAll("#nav button").forEach(function(b){b.className=b.getAttribute("data-t")===tab?"on":""});
  $("add").style.display=tab==="list"?"block":"none";
  if(tab==="list")renderList();else if(tab==="bd")renderBd();else if(tab==="home")renderHome(0);
}
function go(t){tab=t;render();window.scrollTo(0,0);if(t!=="home")bgm.pause();else playBgm()}
function renderList(){
  var q=$("q").value.trim().toLowerCase();
  var l=chars.map(function(c,i){return{c:c,i:i}}).filter(function(o){return!q||JSON.stringify(o.c).toLowerCase().indexOf(q)>=0});
  $("ls").innerHTML=l.length?l.map(function(o){return card(o.c,o.i,false)}).join(""):'<p class="sm">まだキャラクターがいません。右下の＋から追加できます。</p>';
}
function renderBd(){
  var l=chars.map(function(c,i){return{c:c,i:i}}).filter(function(o){return nextBd(o.c.bd)!=null}).sort(function(a,b){return nextBd(a.c.bd)-nextBd(b.c.bd)});
  $("bd").innerHTML=l.length?l.map(function(o){return card(o.c,o.i,true)}).join(""):'<p class="sm">誕生日が登録されたキャラクターがここに並びます。</p>';
}
var F=[["name","名前","text"],["kana","読み","text"],["bd","誕生日","date"],["work","職業・所属","text"],["rel","一人称・口調","text"],["look","外見・身長など","area"],["trait","性格","area"],["ship","人間関係","area"],["lines","セリフ（1行に1つ）\n表情を変えたいときは「表情名|セリフ」と書きます。例：笑顔|今日もよろしくね","area"],["memo","その他メモ","area"]];
function up(blob,opt,done){done(putBlob(blob))}
function pick(file,done,ref){
  if(!file)return;
  var anim=file.type==="image/gif";
  file.slice(0,4096).arrayBuffer().then(function(b){
    if(file.type==="image/png"&&String.fromCharCode.apply(null,new Uint8Array(b)).indexOf("acTL")>=0)anim=true;
    var u=URL.createObjectURL(file),R,mode,sx,sy,o;
    var cr=$("cr");cr.style.display="flex";
    $("cw").innerHTML='<img id="ci" src="'+u+'"><div id="cb"><div id="ch"></div></div>';
    $("cn").textContent=anim?"動く画像（GIF/APNG）は、切り抜くと静止画になります。動きを残すなら「そのまま登録」を選んでください。":"白い枠をドラッグで移動、右下の丸で大きさを変えます。";
    var im=$("ci"),bx=$("cb"),RW=0,RH=0;
    $("rk").checked=false;$("rw").style.display="none";
    if(ref){var ri=new Image();ri.onload=function(){RW=ri.naturalWidth;RH=ri.naturalHeight;$("rt").textContent="1枚目と同じサイズ（"+RW+"×"+RH+" px）で出力";$("rw").style.display="block";if(R)draw()};ri.src=ref}
    function lock(){if(!$("rk").checked||!RW)return;var r=RW/RH;R.h=R.w/r;if(R.y+R.h>im.height){R.h=im.height-R.y;R.w=R.h*r}if(R.x+R.w>im.width){R.w=im.width-R.x;R.h=R.w/r}}
    function dm(){if($("rk").checked&&RW)return[RW,RH];var s=im.naturalWidth/im.width,w=R.w*s,h=R.h*s,k=Math.min(1,1600/Math.max(w,h));return[Math.round(w*k),Math.round(h*k)]}
    function draw(){bx.style.left=R.x+"px";bx.style.top=R.y+"px";bx.style.width=R.w+"px";bx.style.height=R.h+"px";var d=dm();$("sz").textContent="出力サイズ："+d[0]+" × "+d[1]+" px"}
    $("rk").onchange=function(){lock();draw()};
    im.onload=function(){R={x:0,y:0,w:im.width,h:im.height};draw()};
    function dn(e,m){mode=m;sx=e.clientX;sy=e.clientY;o={x:R.x,y:R.y,w:R.w,h:R.h};e.stopPropagation();e.preventDefault();e.target.setPointerCapture(e.pointerId)}
    bx.onpointerdown=function(e){dn(e,"m")};$("ch").onpointerdown=function(e){dn(e,"r")};
    var cl=function(v,a,z){return Math.max(a,Math.min(z,v))};
    cr.onpointermove=function(e){if(!mode)return;var dx=e.clientX-sx,dy=e.clientY-sy;
      if(mode==="m"){R.x=cl(o.x+dx,0,im.width-R.w);R.y=cl(o.y+dy,0,im.height-R.h)}
      else{R.w=cl(o.w+dx,30,im.width-R.x);R.h=cl(o.h+dy,30,im.height-R.y);lock()}draw()};
    cr.onpointerup=function(){mode=null};
    var close=function(){cr.style.display="none";URL.revokeObjectURL(u)};
    $("c0").onclick=close;
    $("c1").onclick=function(){close();up(file,{},done)};
    $("c2").onclick=function(){
      var s=im.naturalWidth/im.width,w=R.w*s,h=R.h*s,d=dm(),cv=document.createElement("canvas");
      cv.width=d[0];cv.height=d[1];
      cv.getContext("2d").drawImage(im,R.x*s,R.y*s,w,h,0,0,cv.width,cv.height);
      close();cv.toBlob(function(bl){up(bl,{},done)},"image/png");
    };
  });
}
function edit(i){
  var c=i==null?{imgs:[]}:chars[i],ims=c.imgs.map(function(x){return{u:x.u,n:x.n}}),cb=c.bg||"",bm=c.bgm||"";
  function sync(){document.querySelectorAll(".nin").forEach(function(e,k){if(ims[k])ims[k].n=e.value})}
  function ri(){
    $("il").innerHTML=ims.map(function(x,k){return '<div class="ir"><img src="'+esc(x.u)+'"><input class="nin" value="'+esc(x.n)+'" placeholder="表情名"><button class="b d" data-d="'+k+'">×</button></div>'}).join("");
    document.querySelectorAll("[data-d]").forEach(function(b){b.onclick=function(){sync();ims.splice(+b.getAttribute("data-d"),1);ri()}});
  }
  var h='<button class="b g" id="cx" style="margin-bottom:12px">閉じる</button>';
  h+='<label>立ち絵（複数登録できます。1枚目が通常の表情です）</label><div id="il"></div><input id="fi" type="file" accept="image/png,image/gif,image/webp,image/jpeg"><div class="sm" style="margin-bottom:10px">背景が透明なPNG・APNG・WebPがおすすめです。</div>';
  h+='<label>ホームでの表示の大きさ：<span id="zv">'+(c.zoom||100)+'</span>％（大きくすると下側が画面外にはみ出します）</label><input type="range" id="zm" min="80" max="220" step="5" value="'+(c.zoom||100)+'" style="padding:0">';
  h+='<label>立ち絵の位置　横：<span id="pxv">'+(c.px||0)+'</span>　縦：<span id="pyv">'+(c.py||0)+'</span>（0が中央・下端。縦はプラスで下へ）</label><input type="range" id="px" min="-60" max="60" step="1" value="'+(c.px||0)+'" style="padding:0"><input type="range" id="py" min="-40" max="40" step="1" value="'+(c.py||0)+'" style="padding:0">';
  h+='<label>セリフの書体</label><select id="fo">'+FONTS.map(function(f,k){return'<option value="'+k+'"'+((c.font||0)===k?' selected':'')+'>'+f[0]+'</option>'}).join("")+'</select><div class="sm" id="fs" style="margin-bottom:10px;font-size:17px;font-family:'+esc((FONTS[c.font||0]||FONTS[0])[1])+'">表示例：今日もよろしくね</div>';
  h+='<label>イメージカラー（名前札や枠、アイコンの色になります）</label><input type="color" id="cc" value="'+col(c,i==null?chars.length:i)+'" style="height:44px;padding:4px">';
  h+='<label>このキャラ専用の背景（任意）</label><input id="fb" type="file" accept="image/*"><div class="sm" id="sb" style="margin-bottom:10px">'+(cb?'登録済み':'未登録（ホーム背景を使います）')+'</div>';
  h+='<label>BGM（mp3・m4aなどの音声ファイル）</label><input id="fm" type="file" accept="audio/*,.mp3,.m4a"><div class="sm" id="sm" style="margin-bottom:10px">'+(bm?'登録済み':'未登録')+'</div>';
  h+='<label style="display:flex;gap:8px;align-items:center;font-size:15px;color:var(--tx);margin-bottom:12px"><input type="checkbox" id="fav" style="width:auto;margin:0"'+(c.fav?' checked':'')+'>ホームに表示するお気に入り（最大5人）</label>';
  F.forEach(function(f){
    h+='<label style="white-space:pre-wrap">'+f[1]+'</label>'+(f[2]==="area"?'<textarea id="f_'+f[0]+'">'+esc(c[f[0]])+'</textarea>':'<input id="f_'+f[0]+'" type="'+f[2]+'" value="'+esc(c[f[0]])+'">');
  });
  h+='<div class="sm" style="margin-bottom:14px">誕生日の年が不明なら、年を0001などにすると年齢は表示されません。</div>';
  if(i!=null)h+='<button class="b d" id="dl" style="width:100%;margin-bottom:10px">削除</button>';
  h+='<button class="b" id="sv" style="width:100%">保存</button>';
  $("ov").innerHTML=h;$("ov").style.display="block";$("ov").scrollTop=0;ri();
  $("cx").onclick=function(){$("ov").style.display="none"};
  $("zm").oninput=function(){$("zv").textContent=this.value};
  $("px").oninput=function(){$("pxv").textContent=this.value};
  $("py").oninput=function(){$("pyv").textContent=this.value};
  $("fo").onchange=function(){$("fs").style.fontFamily=FONTS[+this.value][1]};
  $("fi").onchange=function(){var f=this.files[0];this.value="";pick(f,function(u){sync();ims.push({u:u,n:ims.length?"表情"+(ims.length+1):"通常"});ri()},ims[0]&&ims[0].u)};
  $("fb").onchange=function(){var f=this.files[0];pick(f,function(u){cb=u;$("sb").textContent="登録しました（保存を押すと反映されます）"})};
  $("fm").onchange=function(){
    var f=this.files[0];if(!f)return;
    up(f,{},function(u){bm=u;$("sm").textContent="登録しました（保存を押すと反映されます）"});
  };
  $("sv").onclick=function(){
    if(busyN>0){alert("アップロードが終わるまでお待ちください");return}
    sync();
    var o={};F.forEach(function(f){o[f[0]]=$("f_"+f[0]).value.trim()});
    if(!o.name){alert("名前を入力してください");return}
    o.imgs=ims.filter(function(x){return x.u});o.zoom=+$("zm").value;o.px=+$("px").value;o.py=+$("py").value;o.font=+$("fo").value;o.color=$("cc").value;o.bg=cb;o.bgm=bm;o.fav=$("fav").checked;
    var others=chars.filter(function(x,k){return k!==i&&x.fav}).length;
    if(o.fav&&others>=5){alert("お気に入りは5人までです。ほかのキャラのお気に入りを外してください。");return}
    if(i==null)chars.push(o);else chars[i]=o;
    save();render();$("ov").style.display="none";
  };
  if(i!=null)$("dl").onclick=function(){if(confirm("削除しますか？")){chars.splice(i,1);save();render();$("ov").style.display="none"}};
}
function prof(i){
  var c=chars[i],h='<div class="row" style="margin-bottom:12px"><button class="b g" id="cx">閉じる</button><button class="b g" id="fv">'+(c.fav?'★ 解除':'☆ お気に入り')+'</button><button class="b" id="ed">編集</button></div>';
  if(c.imgs[0])h+='<img src="'+esc(c.imgs[0].u)+'" style="display:block;max-height:240px;max-width:100%;margin:0 auto 8px">';
  h+='<h1>'+esc(c.name)+'</h1>';
  if(c.kana)h+='<div class="sm">'+esc(c.kana)+'</div>';
  h+='<p><b>誕生日</b>　'+fmt(c.bd)+' '+age(c.bd)+'</p>';
  F.slice(3).forEach(function(f){if(f[0]!=="lines"&&c[f[0]])h+='<label>'+f[1]+'</label><p class="f">'+esc(c[f[0]])+'</p>'});
  $("ov").innerHTML=h;$("ov").style.display="block";$("ov").scrollTop=0;
  $("cx").onclick=function(){$("ov").style.display="none"};
  $("ed").onclick=function(){edit(i)};
  $("fv").onclick=function(){
    if(!c.fav&&chars.filter(function(x){return x.fav}).length>=5){alert("お気に入りは5人までです");return}
    c.fav=!c.fav;save();render();prof(i);
  };
}
function favs(){var f=[];chars.forEach(function(c,i){if(c.fav)f.push(i)});return f.length?f:chars.map(function(c,i){return i}).slice(0,5)}
function speak(i){
  var c=chars[i],L=(c.lines||"").split("\n").map(function(s){return s.trim()}).filter(Boolean),t,raw,u=c.imgs[0]&&c.imgs[0].u;
  if(!L.length)t="（セリフが未登録です。「編集」から追加できます）";
  else{
    do{raw=L[Math.floor(Math.random()*L.length)]}while(L.length>1&&raw===last[i]);last[i]=raw;t=raw;
    var m=raw.match(/^(.+?)[|｜]([\s\S]*)$/);
    if(m){var f=c.imgs.filter(function(x){return x.n===m[1].trim()})[0];if(f){u=f.u;t=m[2].trim()}}
  }
  var b=$("bub"),im=$("im");b.style.animation="none";void b.offsetWidth;b.style.animation="";b.textContent=t;
  if(u&&im&&im.tagName==="IMG")im.src=u;
}
function playBgm(){
  var L=favs(),c=chars[L[hi]];
  if(bgmOn&&c&&c.bgm){if(bgm.getAttribute("data-u")!==c.bgm){bgm.setAttribute("data-u",c.bgm);bgm.src=c.bgm}bgm.play().catch(function(){})}
  else bgm.pause();
}
function renderHome(dir){
  var el=$("pg-home"),L=favs(),n=L.length;
  if(!n){bgm.pause();el.style.background="linear-gradient(160deg,#f3d9cc,#c9d8e4)";el.innerHTML='<div class="empty"><div>キャラクターを登録すると<br>ホーム画面に表示されます</div><button class="b" id="e1">キャラクターを追加</button></div>';$("e1").onclick=function(){edit(null)};return}
  hi=((hi%n)+n)%n;
  var i=L[hi],c=chars[i],bg=c.bg||cfg.bg||"";
  el.style.background=bg?"url('"+bg+"') center/cover no-repeat":"linear-gradient(160deg,#f3d9cc,#c9d8e4)";
  var nb=null;chars.forEach(function(x){var d=nextBd(x.bd);if(d!=null&&(nb==null||d<nb.d))nb={d:d,n:x.name}});
  var dots="";for(var k=0;k<n;k++)dots+=k===hi?"●":"○";
  var h='<div class="top"><button id="bm">♪ '+(bgmOn?'ON':'OFF')+'</button><span class="sp0">'+(n>1?dots:'')+'</span><button id="ed">編集</button></div>';
  if(nb)h+='<div class="chip">🎂 '+esc(nb.n)+'　'+(nb.d===0?'今日!':'あと'+nb.d+'日')+'</div>';
  h+='<div class="sp" style="--d:'+dir*60+'px">'+(c.imgs[0]?'<img id="im" src="'+esc(c.imgs[0].u)+'" style="transform:'+tf(c)+'" alt="">':'<div class="bigd" id="im" style="background:'+col(c,i)+'">'+esc((c.name||"?")[0])+'</div>')+'</div>';
  h+='<div class="dlg" style="border-color:'+col(c,i)+'"><div class="who" style="background:'+col(c,i)+'">'+esc(c.name)+'</div><div class="tx" id="bub" style="font-family:'+esc((FONTS[c.font||0]||FONTS[0])[1])+'"></div></div>';
  el.innerHTML=h;
  $("ed").onclick=function(){edit(i)};
  $("im").onclick=function(){speak(i)};
  $("bm").onclick=function(){bgmOn=!bgmOn;$("bm").textContent="♪ "+(bgmOn?"ON":"OFF");if(bgmOn&&!c.bgm)alert("このキャラにはBGMが登録されていません（編集から登録できます）");playBgm()};
  speak(i);
}
var tx0,ty0;
$("pg-home").addEventListener("touchstart",function(e){tx0=e.touches[0].clientX;ty0=e.touches[0].clientY},{passive:true});
$("pg-home").addEventListener("touchend",function(e){
  if(e.target.closest&&e.target.closest(".top"))return;
  var dx=e.changedTouches[0].clientX-tx0,dy=e.changedTouches[0].clientY-ty0;
  if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5){var d=dx<0?1:-1;hi+=d;renderHome(d);playBgm()}
});
document.addEventListener("click",function(e){
  var el=e.target.closest&&e.target.closest(".card");
  if(el)prof(+el.getAttribute("data-i"));
  var nb=e.target.closest&&e.target.closest("#nav button");
  if(nb)go(nb.getAttribute("data-t"));
});
$("add").onclick=function(){edit(null)};
$("q").oninput=renderList;
$("bgb").onclick=function(){$("bgf").click()};
$("bgf").onchange=function(){var f=this.files[0];this.value="";pick(f,function(u){cfg.bg=u;save();alert("ホーム背景を登録しました")})};
$("bgx").onclick=function(){cfg.bg="";save();alert("ホーム背景を外しました")};
(async function(){
  DB=await idb();await loadBlobs();
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
  chars=lsGet();norm();try{cfg=des(localStorage.getItem(LS+"c")||"{}")}catch(e){}
  render();
})();
