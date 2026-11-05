// My Bot server for Cloudflare Workers (free plan).
// The strategy code below is copied from index.html. Do not edit it.
// Needs: KV binding named KV, variables TD_KEY, NTFY_TOPIC (BAL and RISK are optional now; the app sends them).

const MK={
BTC:{n:'Bitcoin',ct:1,sym:'BTCUSDT',cb:'BTC-USD',kind:'BTC',max:6,thr:3,q:.1},
ETH:{n:'Ethereum',ct:1,sym:'ETHUSDT',cb:'ETH-USD',kind:'ETH',max:8,thr:4,q:.12},
XAU:{n:'Gold',ct:100,td:'XAU/USD',fut:'XAUUSDT',sym:'PAXGUSDT',kind:'XAU',wk:1,max:5,thr:3,q:.04},
XAG:{n:'Silver',ct:5000,td:'XAG/USD',fut:'XAGUSDT',kind:'XAU',wk:1,max:5,thr:3,q:.08}};
const ORDER=['XAU','XAG','BTC','ETH'];

// ---- strategy (copied from index.html) ----
const ema=(a,n)=>{const k=2/(n+1);let q=a[0];return a.map((v,i)=>i?(q=v*k+q*(1-k)):v)};
const sma=(a,n,i)=>{let s=0;for(let j=i-n+1;j<=i;j++)s+=a[j];return s/n};
const sd=(a,n,i)=>{const m=sma(a,n,i);let s=0;for(let j=i-n+1;j<=i;j++)s+=(a[j]-m)**2;return Math.sqrt(s/n)};
function rsi(c,n=14){const r=Array(c.length).fill(50);let g=0,l=0;for(let i=1;i<c.length;i++){const d=c[i]-c[i-1],u=Math.max(d,0),w=Math.max(-d,0);if(i<=n){g+=u/n;l+=w/n}else{g=(g*(n-1)+u)/n;l=(l*(n-1)+w)/n}if(i>=n)r[i]=l?100-100/(1+g/l):100}return r}
function atr(x,n=14){const r=[];let a=0;x.forEach((k,i)=>{const t=i?Math.max(k.h-k.l,Math.abs(k.h-x[i-1].c),Math.abs(k.l-x[i-1].c)):k.h-k.l;a=i<n?(a*i+t)/(i+1):(a*(n-1)+t)/n;r.push(a)});return r}
const closed=()=>{const d=new Date(),w=d.getUTCDay(),h=d.getUTCHours();return w===6||(w===5&&h>=22)||(w===0&&h<22)};
const p=n=>{const d=Math.abs(n)<10?5:2;return n.toFixed(d)};
function analyze(k,x,bx){
const M=MK[k],c=x.map(a=>a.c),v=x.map(a=>a.v),i=c.length-1,px=c[i],F=[],add=(n,r)=>F.push({n,s:r[0],t:r[1]});
const e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),a12=ema(c,12),a26=ema(c,26),ml=a12.map((a,j)=>a-a26[j]),sg=ema(ml,9),h=ml.map((a,j)=>a-sg[j]);
const R=rsi(c)[i],A=atr(x)[i],mid=sma(c,20,i),s2=sd(c,20,i),bu=mid+2*s2,bl=mid-2*s2,pb=(px-bl)/(bu-bl||1),f=(z,d=0)=>z.toFixed(d);
const tr=()=>px>e20[i]&&e20[i]>e50[i]?[2,'Price is above the 20 and 50 averages and they are stacked upward: clear uptrend.']:px<e20[i]&&e20[i]<e50[i]?[-2,'Price is below the 20 and 50 averages and they are stacked downward: clear downtrend.']:px>e50[i]?[1,'Price is above the 50 average but the short-term trend is mixed.']:[-1,'Price is below the 50 average and the short-term trend is mixed.'];
const mc=()=>h[i]>0?(h[i]>h[i-1]?[2,'MACD momentum is positive and getting stronger.']:[1,'MACD momentum is positive but fading.']):(h[i]<h[i-1]?[-2,'MACD momentum is negative and getting stronger.']:[-1,'MACD momentum is negative but recovering.']);
if(M.kind==='BTC'){
add('Trend',tr());add('Momentum (MACD)',mc());
add('RSI '+f(R),R>70?[-1,'RSI is above 70: overheated, a pullback is likely.']:R>=55?[1,'RSI is between 55 and 70: healthy bullish strength.']:R>=45?[0,'RSI is neutral (45 to 55).']:R>=30?[-1,'RSI is between 30 and 45: bearish pressure.']:[1,'RSI is below 30: oversold, a bounce is possible.']);
const vr=v[i]/sma(v,20,i),gr=c[i]>x[i].o;
add('Volume',vr>1.5?[gr?1:-1,`Volume is ${f(vr,1)}x normal on a ${gr?'green':'red'} candle: ${gr?'buyers':'sellers'} are pushing.`]:[0,isFinite(vr)?`Volume is ${f(vr,1)}x normal: no strong confirmation.`:'Volume data is not available from this source.'])}
if(M.kind==='ETH'){
let lc=0;const bw=j=>4*sd(c,20,j)/sma(c,20,j);for(let j=i-99;j<i;j++)if(bw(j)<bw(i))lc++;
add('Breakout (Bollinger)',px>bu?[2,'Price closed above the upper band: upside breakout.']:px<bl?[-2,'Price closed below the lower band: downside breakout.']:pb>.8?[1,'Price is pushing against the upper band.']:pb<.2?[-1,'Price is pressing the lower band.']:[0,'Price is inside the bands: no breakout yet.']);
if(lc<20)F[F.length-1].t+=' The bands are unusually tight, so a big move may be building.';
add('Trend',tr());add('Momentum (MACD)',mc());
if(bx){const b=bx.map(a=>a.c),bi=b.length-1,ch=(c[i]/b[bi])/(c[i-12]/b[bi-12])-1;
add('ETH vs BTC',ch>.005?[1,`ETH gained ${f(ch*100,2)}% on BTC over 12 candles: it is leading.`]:ch<-.005?[-1,`ETH lost ${f(-ch*100,2)}% against BTC over 12 candles: it is lagging.`]:[0,'ETH is moving in line with BTC.'])}
add('RSI '+f(R),R>75?[-1,'RSI is above 75: stretched, a pullback is likely.']:R<25?[1,'RSI is below 25: oversold, a bounce is likely.']:[0,'RSI is not at an extreme.'])}
if(M.kind==='XAU'){
const hh=Math.max(...x.slice(-14).map(a=>a.h)),ll=Math.min(...x.slice(-14).map(a=>a.l)),K=(px-ll)/(hh-ll||1)*100;
add('RSI '+f(R),R<30?[2,'RSI is below 30: oversold, a bounce is likely.']:R<40?[1,'RSI is below 40: leaning oversold.']:R>70?[-2,'RSI is above 70: overbought, a drop is likely.']:R>60?[-1,'RSI is above 60: leaning overbought.']:[0,'RSI is neutral.']);
add('Bollinger position',pb<.05?[2,'Price is at the bottom of its normal range.']:pb<.2?[1,'Price is near the bottom of its range.']:pb>.95?[-2,'Price is at the top of its normal range.']:pb>.8?[-1,'Price is near the top of its range.']:[0,'Price is mid-range.']);
add('Stochastic '+f(K),K<20?[1,'Stochastic is below 20: short-term oversold.']:K>80?[-1,'Stochastic is above 80: short-term overbought.']:[0,'Stochastic is neutral.']);
const raw=F.reduce((q,z)=>q+z.s,0),up=e50[i]>e200[i],dn=e50[i]<e200[i];
add('Trend filter',raw>0&&dn?[-1,'The 50 average is below the 200: the main trend is down, so buying dips is riskier.']:raw<0&&up?[1,'The 50 average is above the 200: the main trend is up, so selling rallies is riskier.']:[0,'This call does not fight the main trend.'])}
const sc=F.reduce((q,z)=>q+z.s,0),quiet=A/px*100<M.q;
let sig=sc>=M.thr?'BUY':sc<=-M.thr?'SELL':'WAIT',note='';
if(quiet&&sig!=='WAIT'){sig='WAIT';note='The market is too quiet right now: expected moves are too small to cover trading costs.'}
else if(sig==='WAIT')note=`Score ${sc>0?'+':''}${sc} has not reached ±${M.thr}. The factors are mixed or weak, so waiting is the better move.`;
return{sig,sc,note,F,A,conf:Math.round(Math.min(1,Math.abs(sc)/M.max)*100)}}


// ---- data ----
const TFS=['15m','30m','1h','4h'],TD_IV={'15m':'15min','30m':'30min','1h':'1h','4h':'4h'},CB_G={'15m':900,'1h':3600};
const jget=async u=>{const r=await fetch(u);if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
const kl=d=>d.map(a=>({t:a[0],o:+a[1],h:+a[2],l:+a[3],c:+a[4],v:+a[5]}));
async function candles(k,t,env,n=300){
const M=MK[k];
if(M.td&&env.TD_KEY)try{
const d=await jget(`https://api.twelvedata.com/time_series?symbol=${M.td}&interval=${TD_IV[t]}&outputsize=${n}&apikey=${encodeURIComponent(env.TD_KEY)}`);
if(d.status==='error')throw Error(d.message);
const r=d.values.reverse().map(a=>({t:Date.parse(a.datetime.replace(' ','T')+'Z')||0,o:+a.open,h:+a.high,l:+a.low,c:+a.close,v:0}));r.src='Twelve Data';return r}catch(e){M.err='Twelve Data: '+e.message}
const BL=[];if(M.fut)BL.push(['https://fapi.binance.com/fapi/v1/klines?symbol='+M.fut,'Binance '+M.fut+' futures']);
if(M.sym)BL.push(['https://data-api.binance.vision/api/v3/klines?symbol='+M.sym,'Binance '+M.sym],['https://api.binance.com/api/v3/klines?symbol='+M.sym,'Binance '+M.sym]);
for(const[u,src]of BL)try{const r=kl(await jget(`${u}&interval=${t}&limit=${n}`));r.src=src;return r}catch(e){}
if(M.cb&&CB_G[t]){const d=await jget(`https://api.exchange.coinbase.com/products/${M.cb}/candles?granularity=${CB_G[t]}`);const r=d.reverse().map(a=>({t:a[0]*1000,l:a[1],h:a[2],o:a[3],c:a[4],v:a[5]}));r.src='Coinbase '+M.cb;return r}
throw Error('Could not load prices for '+M.n+(M.err?' ('+M.err+')':''))}

// ---- settings: the app sends them to /config; variables are the fallback ----
const getC=async env=>(await env.KV.get('cfg','json'))||{};
const balOf=(C,env)=>+C.bal||+env.BAL||10000;
const riskOf=(C,env)=>+C.risk||+env.RISK||1;
const ctOf=(k,env,C)=>+((C.ct||{})[k])||+env['CT_'+k]||MK[k].ct;
const list=(v,d)=>(v||d).split(',').map(z=>z.trim()).filter(Boolean);
const wants=(C,env,k,tf)=>{if(C.nt===false)return false;
const mk=C.nm?C.nm[k]!==false:list(env.NOTIFY_MK,'XAU,XAG,BTC,ETH').includes(k);
const tfo=C.ntf?C.ntf.includes(tf):list(env.NOTIFY_TF,'15m,30m,1h,4h').includes(tf);return mk&&tfo};

// ---- paper trading (same rules as index.html) ----
const newPaper=(env,C)=>{const b=balOf(C,env);return{b0:b,b,open:{},hist:[]}};
function paperStep(P,k,x,r,fresh,env,C){
const ct=ctOf(k,env,C),px=x[x.length-1].c;let pos=P.open[k],changed=false;
const close=(price,why,tt)=>{const pnl=pos.d*(price-pos.e)*pos.l*ct-px*0.0003*pos.l*ct;P.b+=pnl;P.hist.push({k,d:pos.d,e:pos.e,x:price,l:pos.l,pnl,why,t:tt||Date.now(),et:pos.t,s:pos.s,g:pos.g});delete P.open[k];pos=null;changed=true};
if(pos){
for(const c of x){if((c.t||0)<=pos.t)continue;
if(pos.d>0?c.l<=pos.s:c.h>=pos.s){close(pos.s,'stop-loss hit',c.t);break}
if(pos.d>0?c.h>=pos.g:c.l<=pos.g){close(pos.g,'target hit',c.t);break}}
if(pos&&(pos.d>0?px<=pos.s:px>=pos.s))close(pos.s,'stop-loss hit');
if(pos&&(pos.d>0?px>=pos.g:px<=pos.g))close(pos.g,'target hit');
if(pos&&fresh&&r.sig!=='WAIT'&&(r.sig==='BUY'?1:-1)!==pos.d)close(px,'call reversed')}
if(!pos&&fresh&&r.sig!=='WAIT'){const d=r.sig==='BUY'?1:-1,sd=1.5*r.A,l=Math.floor(P.b*riskOf(C,env)/100/(sd*ct)*100)/100;
if(l>=0.01){P.open[k]={d,e:px,s:px-d*sd,g:px+d*2*sd,l,t:Date.now()};changed=true}}
P.hist=P.hist.slice(-100);return changed}

// ---- alerts ----
async function notify(env,k,r,px,tf){
const b=`The bot says ${r.sig} on the ${tf} chart at ${p(px)}. Suggested stop-loss ${p(px-(r.sig==='BUY'?1:-1)*1.5*r.A)}.`;
await fetch('https://ntfy.sh/'+encodeURIComponent(env.NTFY_TOPIC),{method:'POST',body:b,headers:{Title:`${r.sig} ${MK[k].n}`,Priority:'high',Tags:r.sig==='BUY'?'chart_with_upwards_trend':'chart_with_downwards_trend'}})}

// ---- one check: one market on one timeframe ----
const WIN={'15m':100,'30m':100,'1h':180,'4h':540};
async function run(k,tf,env,force){
const M=MK[k];
if(M.wk&&closed()&&!force)return{k,tf,skipped:'market closed'};
M.err='';
try{
const C=await getC(env);
const x=await candles(k,tf,env),b=k==='ETH'?await candles('BTC',tf,env):null;
const r=analyze(k,x.slice(0,-1),b&&b.slice(0,-1)),px=x[x.length-1].c,now=Date.now();
const lk=`last:${k}:${tf}`,old=await env.KV.get(lk,'json');
const fresh=!!old&&old.sig!==r.sig&&now-old.t<WIN[tf]*60000;
if(!old||old.sig!==r.sig||now-old.t>36e5)await env.KV.put(lk,JSON.stringify({sig:r.sig,t:now}));
if(env.NTFY_TOPIC&&fresh&&r.sig!=='WAIT'&&wants(C,env,k,tf))await notify(env,k,r,px,tf);
const pk='paper:'+tf;let P=await env.KV.get(pk,'json'),isNew=!P;if(!P)P=newPaper(env,C);
if(paperStep(P,k,x,r,fresh,env,C)||isNew)await env.KV.put(pk,JSON.stringify(P));
const xk='px:'+k,old2=await env.KV.get(xk,'json');
if(!old2||now-old2.t>18e5)await env.KV.put(xk,JSON.stringify({p:px,t:now,src:x.src}));
const ek='err:'+k,oe=await env.KV.get(ek);
if(M.err&&oe!==M.err)await env.KV.put(ek,M.err);else if(!M.err&&oe)await env.KV.delete(ek);
return{k,tf,sig:r.sig,score:r.sc,price:px,source:x.src,fresh,open:P.open[k]?1:0}
}catch(e){
try{const ek='err:'+k,oe=await env.KV.get(ek),m=e.message.slice(0,200);if(oe!==m)await env.KV.put(ek,m)}catch(z){}
return{k,tf,error:e.message}}}

// ---- Worker entry ----
export default{
async scheduled(c,env){
const k=ORDER[new Date(c.scheduledTime).getUTCMinutes()%5];if(!k)return;
const tf=TFS[Math.floor(c.scheduledTime/300000)%4];
await run(k,tf,env)},
async fetch(req,env){
const u=new URL(req.url),H={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
if(req.method==='OPTIONS')return new Response(null,{headers:{...H,'Access-Control-Allow-Headers':'*'}});
const ok=!!env.NTFY_TOPIC&&u.searchParams.get('k')===env.NTFY_TOPIC;
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:H});
const tfq=(v,d)=>TFS.includes(v)?v:d;
if(u.pathname==='/status'){
const C=await getC(env);
const rest=await Promise.all([...TFS.map(t=>env.KV.get('paper:'+t,'json')),...ORDER.map(k=>env.KV.get('px:'+k,'json')),...ORDER.map(k=>env.KV.get('err:'+k))]);
const paper={},px={},err={},ct={};TFS.forEach((t,i)=>paper[t]=rest[i]||newPaper(env,C));
ORDER.forEach((k,i)=>{if(rest[4+i])px[k]=rest[4+i];if(rest[8+i])err[k]=rest[8+i];ct[k]=ctOf(k,env,C)});
return J({v:2,now:Date.now(),paper,px,err,ct})}
if(u.pathname==='/config'){if(!ok)return J({error:'wrong password'},403);
if(req.method!=='POST')return J({error:'use POST'},405);
let d;try{d=JSON.parse(await req.text())}catch(e){return J({error:'bad data'},400)}
const o={};if(typeof d.nt==='boolean')o.nt=d.nt;
if(d.nm&&typeof d.nm==='object'){o.nm={};for(const k of ORDER)if(typeof d.nm[k]==='boolean')o.nm[k]=d.nm[k]}
if(Array.isArray(d.ntf))o.ntf=d.ntf.filter(t=>TFS.includes(t));
if(+d.bal>0)o.bal=+d.bal;if(+d.risk>0&&+d.risk<=100)o.risk=+d.risk;
if(d.ct&&typeof d.ct==='object'){o.ct={};for(const k of ORDER)if(+d.ct[k]>0)o.ct[k]=+d.ct[k]}
await env.KV.put('cfg',JSON.stringify(o));return J({saved:true})}
if(u.pathname==='/test'){if(!ok)return J({error:'wrong password'},403);
await fetch('https://ntfy.sh/'+encodeURIComponent(env.NTFY_TOPIC),{method:'POST',body:'Test from your bot server. Alerts work.',headers:{Title:'Bot test',Priority:'high'}});return J({sent:true})}
if(u.pathname==='/run'){if(!ok)return J({error:'wrong password'},403);
const k=(u.searchParams.get('m')||'').toUpperCase(),tf=tfq(u.searchParams.get('t'),'1h');
if(!MK[k])return J({error:'use m=XAU, XAG, BTC or ETH'},400);return J(await run(k,tf,env,true))}
if(u.pathname==='/reset'){if(!ok)return J({error:'wrong password'},403);
const tf=tfq(u.searchParams.get('tf'),'1h'),C=await getC(env);await env.KV.put('paper:'+tf,JSON.stringify(newPaper(env,C)));return J({reset:tf})}
return new Response('My Bot server is running.',{headers:{'Content-Type':'text/plain'}})}};
