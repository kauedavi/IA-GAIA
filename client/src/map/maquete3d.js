// ═════ MAQUETE ILUSTRADA (v2.1) ═════
// Estilo "corte isométrico" de escola: paredes baixas cinza (sem teto), pisos claros com lajotas,
// móveis desenhados por tipo de sala (carteiras, computadores, máquinas, estantes, mesas do refeitório),
// janelas azuis nas paredes que dão para corredor/área externa, quadra com linhas e traves, árvores redondas
// e pinheiros, arquibancada amarela. Tudo calculado a partir das MESMAS coordenadas da planta (nada foi movido).
// Desempenho: a cena parada vira uma imagem em cache; a cada quadro só a rota, os marcadores e os nomes são
// redesenhados. Móveis e lajotas aparecem conforme o zoom (nível de detalhe).
"use strict";
var YAW3=-0.42,PITCH3=0.9,PAR3={T:3.2,H:15};
M3.yaw=YAW3;M3.pitch=PITCH3;

// ── paleta ilustrada (tema claro = maquete diurna; escuro = maquete noturna) ──
var cor3Base=cor3;
cor3=function(){var k=cor3Base();if(k.il)return k;var c=k.claro;
  function e(h){return c?h:mix3(h,"#1b1e22",0.5)}
  var m={mesa:["#fbfbfb","#d6d8db","#c3c6ca"],cadAm:["#f5c518","#d4a50c","#c29509"],cadVd:["#8cc63f","#6fa22c","#5f8f22"],cadAz:["#3d8fd1","#2c72ad","#25639a"],
    cadVm:["#e53935","#b71c1c","#a01818"],tela:["#2d3946","#1c252e","#151c23"],quadro:["#ffffff","#cfd3d8","#bfc4ca"],madeira:["#c99f6e","#9c7547","#8a6740"],
    estante:["#8d6e63","#6d4c41","#5d4037"],livros:["#e57373","#5c6bc0","#43a047"],maq:["#90a4ae","#6b7f89","#5d6f78"],maqL:["#ff9800","#c66f00","#b06200"],
    bancada:["#b8c5cc","#8a9aa2","#7b8a92"],palco:["#f6c445","#d9a514","#c79611"],armario:["#f5c518","#d4a50c","#c29509"],armCinza:["#cfd8dc","#a3afb5","#94a1a8"],
    planta:["#5aa632","#3f7d22","#356b1c"],balcao:["#d50f1c","#a50c16","#8f0a13"],pia:["#eef1f3","#c5cbcf","#b0b8bd"],divisoria:["#cfd8dc","#a9b4b9","#98a4aa"],
    coluna:["#e3e5e8","#b4b9be","#a2a8ae"],carro1:["#d50f1c","#a50c16","#8f0a13"],carro2:["#3d8fd1","#2c72ad","#25639a"],carro3:["#f5f5f5","#c9cdd1","#b5babf"],carro4:["#f5c518","#d4a50c","#c29509"],
    trave:["#ffffff","#dfe3e6","#cfd5d9"],arq:["#f6c445","#d9a514","#c79611"]};
  if(!c)Object.keys(m).forEach(function(n){m[n]=m[n].map(e)});
  k.il={m:m,
    pisos:{aula:e("#f3e6c4"),info:e("#e4ebf2"),oficina:e("#dde2e6"),biblio:e("#ecd9b6"),refeit:e("#f3e6c4"),cantina:e("#f6edd6"),audit:e("#e7d2ab"),
      banh:e("#d4ebf2"),vest:e("#d4ebf2"),almox:e("#e3ded3"),hall:e("#f1ece2"),coberta:e("#ebe6dc"),adm:e("#efe2c8")},
    circ:c?"#a9adb3":"#454a51",circLinha:c?"#bcc0c5":"#51575e",calcada:c?"#c6c9ce":"#383d43",
    parTopo:c?"#f5f5f5":"#a1a6ac",par1:c?"#c9cbce":"#5f646a",par2:c?"#b1b4b8":"#4e5358",janela:c?"#3d8fd1":"#5aa7ec",janela2:c?"#8cc3ee":"#9fd0ff",
    grama:c?"#a4d56c":"#2f5d2c",grama2:c?"#8cc657":"#2a5427",campo:c?"#43a047":"#2f6f33",campo2:c?"#4caf50":"#357a39",quadraFora:c?"#3d8fd1":"#28577f",
    copa:c?"#5aa632":"#3d7a2a",copa2:c?"#7cc94a":"#4f9636",copa3:c?"#43862a":"#2f6020",pinho:c?"#2e7d5b":"#245f46",pinho2:c?"#3a9a6e":"#2e7a58",tronco:c?"#8d6e4f":"#5a4634",
    asfalto:c?"#8c9096":"#2c3035",faixa:"#ffffff",sombra:c?"rgba(30,40,50,.16)":"rgba(0,0,0,.35)"};
  // fundo, chão e ruas no estilo da maquete
  k.fundo=c?"#eef1f4":"#14171a";k.chao=c?"#dfe1e4":"#272b30";k.verde=k.il.grama;k.verde2=k.il.copa;k.rua=c?"#6f747b":"#1c1f23";k.ruaTx=c?"#ffffff":"#9aa3ab";
  k.caminho=k.il.circ;k.laje=c?"#b9bdc3":"#3b4047";k.lajeLado=c?"#9a9fa6":"#2b2f34";
  return k};

// ── tipo visual de cada sala (só para escolher piso e móveis) ──
var IL_INFO=/^(labprojman|labprojetos|labsoftware|labmicro|labcadcam|labeletronica|labei\d|lab1[678])$/;
function tipoIl(s){var id=s.id;
  if(id==="quadra"||id==="quadra_poliesportiva")return "quadra";
  if(id==="area_de_convivencia"||id==="areacoberta")return "coberta";
  if(id==="recepcao"||id==="hall")return "hall";
  if(id==="auditorio")return "audit";
  if(id==="refeitorio")return "refeit";
  if(id==="cantina")return "cantina";
  if(id==="biblioteca"||id==="leitura")return "biblio";
  if(id==="almox"||id==="saida_para_rampa")return "almox";
  if(/^san/.test(id)||s.tipo==="sanitario")return "banh";
  if(/^vest/.test(id))return "vest";
  if(s.tipo==="sala"||s.tipo==="sala_de_aula")return "aula";
  if(s.tipo==="lab"||s.tipo==="laboratorio"||s.tipo==="oficina")return IL_INFO.test(id)?"info":"oficina";
  if(s.tipo==="adm"||s.tipo==="administrativo"||s.tipo==="administrativo_tecnico")return "adm";
  return "aula"}
function hash3(t){var h=0;t=String(t);for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))|0;return Math.abs(h)}

// ── paredes: trechos curtos (para a ordem de desenho ficar certa), porta do lado do corredor, janelas onde não há outra sala ──
function dentroDeOutra(s,x,y){for(var i=0;i<D.salas.length;i++){var o=D.salas[i];if(o===s||!o.r||(+o.andar||0)!==(+s.andar||0))continue;
  if(x>=o.r[0]&&x<=o.r[0]+o.r[2]&&y>=o.r[1]&&y<=o.r[1]+o.r[3])return true}return false}
function paredesDe(s){var key=s.r.join(",");if(s.__parK===key)return s.__par;
  var T=PAR3.T,x0=s.r[0]+1,y0=s.r[1]+1,x1=s.r[0]+s.r[2]-1,y1=s.r[1]+s.r[3]-1,out=[];
  var L=[{e:"x",c:y0,a:x0,b:x1,n:[0,-1]},{e:"x",c:y1-T,a:x0,b:x1,n:[0,1]},{e:"y",c:x0,a:y0+T,b:y1-T,n:[-1,0]},{e:"y",c:x1-T,a:y0+T,b:y1-T,n:[1,0]}];
  var no=D.rede&&D.rede.nos[s.no],porta=-1;
  if(no){var md=1e9;L.forEach(function(l,i){var lin=l.e==="x"?no[1]:no[0],ao=l.e==="x"?no[0]:no[1],face=l.c+(l.n[0]+l.n[1]>0?T:0);
    var d=Math.abs(lin-face)+Math.max(0,l.a-ao,ao-l.b)*1.5;if(d<md){md=d;porta=i}})}
  L.forEach(function(l,i){var segs=[[l.a,l.b]];
    if(i===porta&&l.b-l.a>16){var ao=l.e==="x"?no[0]:no[1],g=Math.min(14,(l.b-l.a)*0.45),pc=Math.max(l.a+g/2+3,Math.min(l.b-g/2-3,ao));segs=[[l.a,pc-g/2],[pc+g/2,l.b]]}
    // janelas: a parede dá para fora/corredor (amostras do lado de fora não caem em outra sala)
    var fora=0;for(var t=1;t<=3;t++){var p=l.a+(l.b-l.a)*t/4,px=l.e==="x"?p:l.c+l.n[0]*12+(l.n[0]>0?T:0),py=l.e==="x"?l.c+l.n[1]*12+(l.n[1]>0?T:0):p;if(!dentroDeOutra(s,px,py))fora++}
    var jan=fora>=2&&s.tipo!=="convivencia";
    segs.forEach(function(sg){var a=sg[0],b=sg[1];if(b-a<1)return;var n=Math.max(1,Math.ceil((b-a)/30));
      for(var j=0;j<n;j++){var u0=a+(b-a)*j/n,u1=a+(b-a)*(j+1)/n;
        out.push({r:l.e==="x"?[u0,l.c,u1-u0,T]:[l.c,u0,T,u1-u0],e:l.e,jan:jan&&(u1-u0)>=9})}})});
  s.__parK=key;s.__par=out;return out}
function janelas3(ctx,k,p,z){var il=k.il,r=p.r,H=PAR3.H,sn=Math.sin(M3.yaw),cs=Math.cos(M3.yaw);
  // qual face longa está virada para a câmera
  var fx,fy,a,b;if(p.e==="x"){var cima=-cs>0;fy=cima?r[1]-0.05:r[1]+r[3]+0.05;a=r[0];b=r[0]+r[2];if(Math.abs(cs)<0.08)return}
  else{var esq=-sn>0;fx=esq?r[0]-0.05:r[0]+r[2]+0.05;a=r[1];b=r[1]+r[3];if(Math.abs(sn)<0.08)return}
  var n=Math.max(1,Math.floor((b-a-2)/10)),w=(b-a-2)/n;
  for(var i=0;i<n;i++){var u0=a+1+i*w+1.2,u1=a+1+(i+1)*w-1.2,q=p.e==="x"?[[u0,fy],[u1,fy]]:[[fx,u0],[fx,u1]];
    poli3(ctx,[P3(q[0][0],q[0][1],z+4.5),P3(q[1][0],q[1][1],z+4.5),P3(q[1][0],q[1][1],z+12),P3(q[0][0],q[0][1],z+12)],il.janela,null);
    var hi=p.e==="x"?[[u0,fy],[u0+(u1-u0)*0.35,fy]]:[[fx,u0],[fx,u0+(u1-u0)*0.35]];
    poli3(ctx,[P3(hi[0][0],hi[0][1],z+9),P3(hi[1][0],hi[1][1],z+9),P3(hi[1][0],hi[1][1],z+12),P3(hi[0][0],hi[0][1],z+12)],il.janela2,null)}}

// ── móveis por tipo de sala (gerados uma vez, em coordenadas da planta) ──
function moveisDe(s){var key=s.r.join(",");if(s.__movK===key)return s.__mov;
  var T=PAR3.T,X=s.r[0]+T+4,Y=s.r[1]+T+4,W=s.r[2]-2*T-8,H=s.r[3]-2*T-8,t=tipoIl(s),o=[],h=hash3(s.id);
  function b(x,y,w,hh,z0,z1,c){if(w>0.5&&hh>0.5)o.push({r:[x,y,w,hh],z0:z0,z1:z1,c:c})}
  var cad=["cadAm","cadVd","cadAz"][h%3];
  if(W<8||H<6){s.__movK=key;s.__mov=o;return o}
  if(t==="aula"){b(X+W*0.25,s.r[1]+T+1.2,W*0.5,1.2,4,12,"quadro");b(X+3,Y+2,15,7,0,6.5,"madeira");b(X+7,Y-1,6,3,0,4,cad);
    for(var y=Y+18;y+12<=Y+H;y+=15)for(var x=X+2;x+13<=X+W;x+=17){b(x,y,13,6.5,0,6,"mesa");b(x+3.5,y+8,6,4,0,4,cad)}}
  else if(t==="info"){var ny=0;for(var y2=Y+2;y2+14<=Y+H;y2+=18){ny++;b(X+1,y2,W-2,7,0,6,"mesa");
      for(var x2=X+3;x2+7<=X+W-1;x2+=12){b(x2,y2+1.5,7,1.6,6,11.5,"tela");b(x2+0.5,y2+9.5,6,4,0,4,"cadAz")}}}
  else if(t==="oficina"){b(X+1,Y,W-2,6,0,6.5,"bancada");
    for(var y3=Y+14;y3+12<=Y+H;y3+=26)for(var x3=X+3;x3+14<=X+W;x3+=26){b(x3,y3,14,10,0,9,"maq");b(x3+2,y3+2,5,5,9,11.5,"maqL");b(x3+16>X+W?x3:x3+3,y3+12,6,4,0,4,"cadVd")}}
  else if(t==="biblio"){var wE=Math.max(10,W*0.5);for(var y4=Y+2;y4+4<=Y+H;y4+=13){b(X+1,y4,wE,4,0,13,"estante");b(X+1,y4+4,wE,0.6,1,12,"livros")}
    for(var y5=Y+4;y5+10<=Y+H;y5+=22)if(X+wE+8+14<=X+W){b(X+wE+8,y5,14,9,0,6,"madeira");b(X+wE+11,y5+11,6,4,0,4,"cadVd");b(X+wE+11,y5-6,6,4,0,4,"cadVd")}}
  else if(t==="refeit"){for(var y6=Y+6;y6+12<=Y+H;y6+=22)for(var x6=X+2;x6+34<=X+W;x6+=44){b(x6,y6,34,7,0,6,"mesa");b(x6,y6-4.5,34,3,0,3.5,"cadVm");b(x6,y6+8.5,34,3,0,3.5,"cadVm")}}
  else if(t==="cantina"){b(X,Y,W,7,0,9,"balcao");b(X,Y+7,7,H-7,0,9,"balcao");b(X+W-9,Y+H-9,8,8,0,15,"pia");b(X+12,Y+H-12,10,8,0,6,"mesa")}
  else if(t==="audit"){var hp=Math.max(14,H*0.17);b(X,Y,W,hp,0,5,"palco");b(X+W*0.15,s.r[1]+T+1.2,W*0.7,1.2,5,24,"quadro");
    var mid=X+W/2;for(var y7=Y+hp+10;y7+5<=Y+H;y7+=11)for(var x7=X+3;x7+7<=X+W-2;x7+=9){if(Math.abs(x7+3.5-mid)<7)continue;b(x7,y7,7,5,0,4.5,"cadVm")}}
  else if(t==="banh"){if(H>=16){for(var x8=X;x8+12<=X+W;x8+=12){b(x8,Y,1.2,13,0,10,"divisoria")}for(var x9=X+3;x9+8<=X+W;x9+=14)b(x9,Y+H-5,8,5,0,6,"pia")}
    else b(X+2,Y,Math.min(10,W-2),Math.max(1,H),0,6,"pia")}
  else if(t==="vest"){b(X,Y,W,5,0,13,"armario");if(H>24)b(X,Y+H-5,W,5,0,13,"armario");if(H>24)b(X+8,Y+H/2-2,Math.max(4,W-16),4,0,3.5,"madeira")}
  else if(t==="almox"){for(var y10=Y+2;y10+5<=Y+H;y10+=14)b(X+2,y10,W-4,5,0,14,"armCinza")}
  else if(t==="hall"){b(X+W*0.15,Y+H*0.28,W*0.7,7,0,8,"balcao");b(X+1,Y+1,6,6,0,9,"planta");b(X+W-7,Y+1,6,6,0,9,"planta");b(X+1,Y+H-7,6,6,0,9,"planta");
    for(var y11=Y+H*0.5;y11+5<=Y+H-10;y11+=14)b(X+W*0.3,y11,W*0.4,5,0,4,"cadAz")}
  else if(t==="adm"){b(X,Y,Math.min(W,12),4,0,12,"armCinza");
    for(var y12=Y+10;y12+12<=Y+H;y12+=24)for(var x12=X+2;x12+14<=X+W;x12+=26){b(x12,y12,14,8,0,6.5,"madeira");b(x12+4,y12+10,6,4,0,4,"cadAz");b(x12+2,y12+1.5,6,1.4,6.5,10.5,"tela")}
    b(X+W-6,Y+H-6,5,5,0,8,"planta")}
  s.__movK=key;s.__mov=o;return o}

// ── desenho de uma sala ──
function salaMaquete(ctx,k,s,z,est){
  var il=k.il,t=tipoIl(s),cr=est.dest?k.dest:est.orig?k.azul:null,H=PAR3.H,det=M3.s;
  var piso=il.pisos[t]||il.pisos.aula;if(cr)piso=mix3(piso,cr,0.42);
  var rr=[s.r[0]+1,s.r[1]+1,s.r[2]-2,s.r[3]-2];
  chao3(ctx,retPts(rr),z+0.4,piso,cr||null,cr?2.2:0);
  // lajotas
  if(det>0.75&&t!=="coberta"){ctx.strokeStyle=mix3(piso,"#000",0.07);ctx.lineWidth=0.8*DPR3;ctx.beginPath();
    for(var x=rr[0]+12;x<rr[0]+rr[2];x+=12){var a=P3(x,rr[1],z+0.5),b=P3(x,rr[1]+rr[3],z+0.5);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y)}
    for(var y=rr[1]+12;y<rr[1]+rr[3];y+=12){var a2=P3(rr[0],y,z+0.5),b2=P3(rr[0]+rr[2],y,z+0.5);ctx.moveTo(a2.x,a2.y);ctx.lineTo(b2.x,b2.y)}ctx.stroke()}
  var itens=[];
  if(t==="coberta"){ // área de convivência externa: piso verde, mesas com guarda-sóis brancos e canteiros
    chao3(ctx,retPts(rr),z+0.45,il.grama,il.grama2,1);
    for(var px=rr[0]+14;px<=rr[0]+rr[2]-14;px+=(rr[2]-28)/3)for(var py=rr[1]+16;py<=rr[1]+rr[3]-16;py+=(rr[3]-32)/4){
      itens.push({r:[px-5,py-5,10,10],z0:0,z1:5,c:"mesa"});
      itens.push({r:[px-1,py-1,2,2],z0:5,z1:14,c:"coluna"});
      itens.push({r:[px-10,py-10,20,20],z0:14,z1:16,c:"quadro"})}
    if(det>0.22){itens.push({r:[rr[0]+6,rr[1]+6,14,rr[3]-12],z0:0,z1:4,c:"planta"});itens.push({r:[rr[0]+rr[2]-20,rr[1]+6,14,rr[3]-12],z0:0,z1:4,c:"planta"})}}
  else{paredesDe(s).forEach(function(p){itens.push({par:p})});if(det>0.22)itens=itens.concat(moveisDe(s))}
  itens.forEach(function(it){var r=it.r||it.par.r;it.d=proj3(r[0]+r[2]/2,r[1]+r[3]/2,z).d});
  itens.sort(function(p,q){return p.d-q.d});
  var topo=cr?mix3(il.parTopo,cr,0.6):il.parTopo,l1=cr?mix3(il.par1,cr,0.35):il.par1,l2=cr?mix3(il.par2,cr,0.35):il.par2,soTopo=det<0.4;
  itens.forEach(function(it){
    if(it.par){caixa3(ctx,it.par.r,z,z+H,topo,l1,l2,null,0);if(it.par.jan&&det>0.3)janelas3(ctx,k,it.par,z);return}
    var c=il.m[it.c]||il.m.mesa;
    if(soTopo)chao3(ctx,retPts(it.r),z+it.z1,c[0],null);else caixa3(ctx,it.r,z+it.z0,z+it.z1,c[0],c[1],c[2],null,0)});
  s.__h=H;
  return retPts(rr).map(function(q){return P3(q[0],q[1],z+H)})}

// ── chão do térreo: terreno, ruas, gramados, quadra, estacionamentos ──
function chaoTerreo3(ctx,k,z,todos){var C=cena3(),il=k.il;
  (D.ruas||[]).forEach(function(rr){var w=56,L=rr.rot?1250:1000,cx=rr.x,cy=rr.y,pts=rr.rot?[[cx-w/2,cy-L/2],[cx+w/2,cy-L/2],[cx+w/2,cy+L/2],[cx-w/2,cy+L/2]]:[[cx-L/2,cy-w/2],[cx+L/2,cy-w/2],[cx+L/2,cy+w/2],[cx-L/2,cy+w/2]];
    chao3(ctx,pts,z-1,k.rua,null);
    ctx.setLineDash([12*DPR3*M3.s,12*DPR3*M3.s]);ctx.strokeStyle="rgba(255,255,255,.75)";ctx.lineWidth=Math.max(1,2*M3.s)*DPR3;var a=rr.rot?P3(cx,cy-L/2,z-0.8):P3(cx-L/2,cy,z-0.8),b=rr.rot?P3(cx,cy+L/2,z-0.8):P3(cx+L/2,cy,z-0.8);
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([])});
  var al=ctx.globalAlpha;if(todos&&al===1)ctx.globalAlpha=0.9;
  // base do terreno com "espessura" (a maquete parece um bloco)
  if(C.terreno){var ter=C.terreno;for(var i=0;i<ter.length;i++){var A=ter[i],B=ter[(i+1)%ter.length],nx=B[1]-A[1],ny=-(B[0]-A[0]);
      if(nx*Math.sin(M3.yaw)+ny*Math.cos(M3.yaw)<=0)continue;poli3(ctx,[P3(A[0],A[1],z-8),P3(B[0],B[1],z-8),P3(B[0],B[1],z),P3(A[0],A[1],z)],k.claro?"#c3c7cc":"#1d2024",null)}
    chao3(ctx,ter,z,k.chao,null)}
  else chao3(ctx,[[20,115],[980,115],[980,1115],[20,1115]],z,k.chao,null);
  (C.verdes||[]).forEach(function(v){chao3(ctx,v,z+0.2,il.grama,il.grama2,1)});
  ctx.globalAlpha=al;
  (C.estacionamentos||[]).forEach(function(r,idx){chao3(ctx,retPts(r),z+0.3,il.asfalto,null);
    ctx.strokeStyle="rgba(255,255,255,.8)";ctx.lineWidth=Math.max(1,1.4*M3.s)*DPR3;ctx.beginPath();
    for(var xx=r[0]+12;xx<r[0]+r[2]-8;xx+=26){var p0=P3(xx,r[1]+6,z+0.4),p1=P3(xx,r[1]+34,z+0.4);ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y)}ctx.stroke();
    if(M3.s>0.22)for(var x2=r[0]+12,n=0;x2+26<r[0]+r[2]-8;x2+=26,n++){var hh=hash3("est"+idx+n);if(hh%3===0)continue;var cc=k.il.m["carro"+(1+hh%4)];
      caixa3(ctx,[x2+4,r[1]+8,18,25],z,z+5,cc[0],cc[1],cc[2],null,0);caixa3(ctx,[x2+6,r[1]+14,14,11],z+5,z+9,mix3(cc[0],"#9fd0ff",0.5),cc[1],cc[2],null,0)}});
  D.blocos.forEach(function(b){var r=[b.x,b.y,b.w,b.h];
    if(b.id==="quadra"){quadra3(ctx,k,r,z)}
    else if(b.id==="patio"||b.id==="recre"||b.id==="pisc"){chao3(ctx,retPts(r),z+0.3,il.grama,il.grama2,1)}
    else{chao3(ctx,retPts(r),z+0.3,il.circ,null);
      if(M3.s>0.5){ctx.strokeStyle=il.circLinha;ctx.lineWidth=0.8*DPR3;ctx.beginPath();
        for(var x=b.x+20;x<b.x+b.w;x+=20){var a=P3(x,b.y,z+0.35),c2=P3(x,b.y+b.h,z+0.35);ctx.moveTo(a.x,a.y);ctx.lineTo(c2.x,c2.y)}
        for(var y=b.y+20;y<b.y+b.h;y+=20){var a2=P3(b.x,y,z+0.35),c3=P3(b.x+b.w,y,z+0.35);ctx.moveTo(a2.x,a2.y);ctx.lineTo(c3.x,c3.y)}ctx.stroke()}}})}
function linha3(ctx,pts,z){ctx.beginPath();pts.forEach(function(q,i){var p=P3(q[0],q[1],z);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke()}
function quadra3(ctx,k,r,z){var il=k.il,m=14,q=[r[0]+m,r[1]+m,r[2]-2*m,r[3]-2*m];
  chao3(ctx,retPts(r),z+0.3,il.quadraFora,null);chao3(ctx,retPts(q),z+0.5,il.campo,null);
  // faixas do gramado
  var n=8;for(var i=0;i<n;i+=2)chao3(ctx,retPts([q[0],q[1]+q[3]*i/n,q[2],q[3]/n]),z+0.55,il.campo2,null);
  ctx.strokeStyle="rgba(255,255,255,.92)";ctx.lineWidth=Math.max(1,1.6*M3.s)*DPR3;
  linha3(ctx,retPts(q).concat([retPts(q)[0]]),z+0.6);linha3(ctx,[[q[0],q[1]+q[3]/2],[q[0]+q[2],q[1]+q[3]/2]],z+0.6);
  var cx=q[0]+q[2]/2,cy=q[1]+q[3]/2,cir=[];for(var t=0;t<=24;t++){var an=t/24*Math.PI*2;cir.push([cx+Math.cos(an)*26,cy+Math.sin(an)*26])}linha3(ctx,cir,z+0.6);
  var ga=q[2]*0.5;[q[1],q[1]+q[3]].forEach(function(yy,j){var dir=j?-1:1;linha3(ctx,[[cx-ga/2,yy],[cx-ga/2,yy+dir*40],[cx+ga/2,yy+dir*40],[cx+ga/2,yy]],z+0.6)});
  // traves (brancas, em pé)
  var tv=il.m.trave;[q[1],q[1]+q[3]].forEach(function(yy,j){var w=36,d=j?1:-1;
    caixa3(ctx,[cx-w/2,Math.min(yy,yy+d*7),1.6,7],z,z+12,tv[0],tv[1],tv[2],null,0);caixa3(ctx,[cx+w/2-1.6,Math.min(yy,yy+d*7),1.6,7],z,z+12,tv[0],tv[1],tv[2],null,0);
    caixa3(ctx,[cx-w/2,Math.min(yy,yy+d*1.6),w,1.6],z+10.4,z+12,tv[0],tv[1],tv[2],null,0)})}

// ── escadas (degraus) e elevador ──
function escadaMaquete(ctx,k,e,z,usa){var el=e.tipo==="elevador",r=e.r;
  if(el){var tp=caixa3(ctx,r,z,z+PAR3.H*1.6,k.claro?"#dfe5ea":"#4a5560",k.il.janela,mix3(k.il.janela,"#000",0.15),usa?k.rota:(k.claro?"#7d8a96":"#9aa6b0"),usa?2:0.8);return tp}
  var hor=r[2]>=r[3],n=7,cores=k.claro?["#f1f2f4","#c4c8cd","#b0b5bb"]:["#8c939a","#5a6168","#4d535a"];
  for(var i=0;i<n;i++){var rr=hor?[r[0]+r[2]*i/n,r[1],r[2]/n,r[3]]:[r[0],r[1]+r[3]*i/n,r[2],r[3]/n];
    caixa3(ctx,rr,z,z+2+i*1.6,i%2?cores[0]:mix3(cores[0],"#f6c445",0.25),cores[1],cores[2],usa?k.rota:null,usa?1.2:0)}
  return retPts(r).map(function(q){return P3(q[0],q[1],z+8)})}

// ── árvores: redondas e pinheiros, com sombra ──
function arvoreMaquete(ctx,k,q,z){var il=k.il,b=P3(q[0],q[1],z),s=Math.max(0.15,M3.s)*DPR3,pinho=hash3(q[0]*7+q[1]*13)%3===0;
  ctx.beginPath();ctx.ellipse(b.x+4*s,b.y+2*s,14*s,14*s*Math.max(0.35,Math.cos(M3.pitch)),0,0,7);ctx.fillStyle=il.sombra;ctx.fill();
  if(pinho){var t0=P3(q[0],q[1],z+8);ctx.strokeStyle=il.tronco;ctx.lineWidth=Math.max(1,3*M3.s)*DPR3;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(t0.x,t0.y);ctx.stroke();
    for(var i=0;i<3;i++){var base=P3(q[0],q[1],z+8+i*9),topo=P3(q[0],q[1],z+24+i*9),w=(13-i*3)*s;
      ctx.beginPath();ctx.moveTo(base.x-w,base.y);ctx.lineTo(topo.x,topo.y);ctx.lineTo(base.x+w,base.y);ctx.closePath();ctx.fillStyle=il.pinho;ctx.fill();
      ctx.beginPath();ctx.moveTo(base.x,base.y);ctx.lineTo(topo.x,topo.y);ctx.lineTo(base.x+w,base.y);ctx.closePath();ctx.fillStyle=il.pinho2;ctx.fill()}}
  else{var tt=P3(q[0],q[1],z+22),rr=13*s;ctx.strokeStyle=il.tronco;ctx.lineWidth=Math.max(1,3*M3.s)*DPR3;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(tt.x,tt.y);ctx.stroke();
    ctx.beginPath();ctx.arc(tt.x,tt.y,rr,0,7);ctx.fillStyle=il.copa;ctx.fill();
    ctx.beginPath();ctx.arc(tt.x+rr*0.25,tt.y+rr*0.3,rr*0.75,0,7);ctx.fillStyle=il.copa3;ctx.globalAlpha*=0.6;ctx.fill();ctx.globalAlpha/=0.6;
    ctx.beginPath();ctx.arc(tt.x-rr*0.3,tt.y-rr*0.35,rr*0.5,0,7);ctx.fillStyle=il.copa2;ctx.fill()}}
