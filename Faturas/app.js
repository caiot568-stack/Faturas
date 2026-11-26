const FIREBASE_CONFIG={
  apiKey:"AIzaSyDk8FofZ516-sy_hdG7WB8yTfPUu91_Zvc",
  authDomain:"faturas-f8cdc.firebaseapp.com",
  projectId:"faturas-f8cdc",
  storageBucket:"faturas-f8cdc.firebasestorage.app",
  messagingSenderId:"696161254208",
  appId:"1:696161254208:web:e6d169f7d827600ac8d8a5"
};

const $=id=>document.getElementById(id);
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fd=s=>{if(!s)return'-';const[a,m,d]=s.split('-');return`${d}/${m}/${a}`};
const total=f=>f.itens.reduce((s,i)=>s+i.q*i.p,0);
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const COLS=[{k:'preparo',n:'Em preparo',c:'#e0a526'},{k:'concluida',n:'Concluídas',c:'#1f6f5c'}];
const me=Math.random().toString(36).slice(2);

let F=new Map(),P=new Map(),cur=null,coll=null,pcoll=null,timers={},Q='',MORE={};

function board(){
$('cols').innerHTML=COLS.map(c=>{
const all=[...F.entries()].filter(([,f])=>f.status===c.k&&norm(f.cli).includes(norm(Q))).sort((a,b)=>(b[1].moved||b[1].created)-(a[1].moved||a[1].created));
const l=(Q||MORE[c.k])?all:all.slice(0,5);
return`<div class="col" data-k="${c.k}" style="--c:${c.c}"><h2>${c.n} (${all.length})</h2><div class="sum">${brl(all.reduce((s,[,f])=>s+total(f),0))}</div>
${l.map(([id,f])=>`<div class="card" draggable="true" data-id="${id}"><b>${esc(f.cli||'Sem cliente')}</b><span class="v">${brl(total(f))}</span><br><small>${fd(f.data)}${f.ven?' · vence '+fd(f.ven):''}</small>
<div class="act"><button data-mv="${id}" type="button">${c.k==='preparo'?'Concluir →':'← Reabrir'}</button></div></div>`).join('')||`<div class="empty">${Q?'Nenhuma fatura encontrada':'Arraste uma fatura para cá'}</div>`}
${all.length>5&&!Q?`<button data-more="${c.k}" type="button" style="width:100%">${MORE[c.k]?'Ver menos':'Ver mais ('+(all.length-5)+')'}</button>`:''}</div>`}).join('');
}
function persist(id,now){
const f=F.get(id);if(!f||!coll)return;
f.by=me;clearTimeout(timers[id]);
const go=async()=>{try{await coll.doc(id).set({...f});$('st').textContent='Sincronizado'}catch(e){$('st').textContent='Erro ao salvar (confira as regras do Firestore)'}};
if(now)go();else timers[id]=setTimeout(go,400);
}
function move(id,k){const f=F.get(id);if(!f||f.status===k)return;f.status=k;f.moved=Date.now();persist(id,true);board();if(cur===id)edHead()}

function edHead(){const f=F.get(cur);$('mover').textContent=f.status==='preparo'?'Concluir fatura →':'← Reabrir fatura'}
function sheet(){
const f=F.get(cur);if(!f)return;
$('sheet').innerHTML=`<div class="hd"><h1>FATURA</h1><div class="meta"><div>Data: ${fd(f.data)}</div><div>Vencimento: ${fd(f.ven)}</div></div></div>
<div class="cli"><h4>Cliente</h4><div class="n">${esc(f.cli||'-')}</div>${f.cnpj?`<div>CNPJ: ${esc(f.cnpj)}</div>`:''}</div>
<table><thead><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Preço unit.</th><th class="r">Total</th></tr></thead><tbody>
${f.itens.map(i=>`<tr><td>${esc(i.d)}</td><td class="r">${i.q}</td><td class="r">${brl(i.p)}</td><td class="r">${brl(i.q*i.p)}</td></tr>`).join('')}</tbody></table>
<div class="tot"><span>Total</span><span>${brl(total(f))}</span></div>${f.obs?`<div class="notes"><h4>Observações</h4>${esc(f.obs)}</div>`:''}`;
}
function list(){
const f=F.get(cur);
$('itens').innerHTML=f.itens.map((it,i)=>`<div class="item"><div class="ln"><div><label>Descrição</label><input list="dl-prod" autocomplete="off" data-i="${i}" data-k="d" value="${esc(it.d)}"></div><button class="x" data-del="${i}" type="button" aria-label="Remover item">✕</button></div>
<div class="row"><div><label>Qtd</label><input type="number" min="0" step="any" data-i="${i}" data-k="q" value="${it.q}"></div><div><label>Preço unit. (R$)</label><input type="number" min="0" step="0.01" data-i="${i}" data-k="p" value="${it.p}"></div></div></div>`).join('');
}
function fill(){
const f=F.get(cur);
for(const k of ['cli','cnpj','data','ven','obs'])if(document.activeElement!==$(k))$(k).value=f[k]||'';
if($('itens').children.length!==f.itens.length)list();
else document.querySelectorAll('#itens input').forEach(e=>{if(e!==document.activeElement)e.value=f.itens[e.dataset.i][e.dataset.k]});
}
function open(id){cur=id;$('ed').classList.add('on');list();fill();sheet();edHead()}
function close(){cur=null;$('ed').classList.remove('on');board()}
function create(){
const id=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
F.set(id,{cli:'',cnpj:'',data:new Date().toISOString().slice(0,10),ven:'',obs:'',itens:[{d:'',q:1,p:0}],status:'preparo',created:Date.now()});
persist(id,true);open(id);
}
function edit(){sheet();persist(cur)}

function prodOptions(){
$('dl-prod').innerHTML=[...P.values()].sort((a,b)=>a.nome.localeCompare(b.nome)).map(p=>`<option value="${esc(p.nome)}">${brl(p.preco)}</option>`).join('');
}
function prodList(){
const q=norm($('pbusca').value);
const l=[...P.entries()].filter(([,p])=>norm(p.nome).includes(q)).sort((a,b)=>a[1].nome.localeCompare(b[1].nome));
$('plist').innerHTML=l.map(([id,p])=>`<div class="prow"><span class="pn">${esc(p.nome)}</span><input type="number" min="0" step="0.01" value="${p.preco}" data-pid="${id}" aria-label="Preço"><button class="x" data-pdel="${id}" type="button" aria-label="Excluir produto">✕</button></div>`).join('')||'<div class="empty">Nenhum produto</div>';
}
function prodAdd(){
const nome=$('pnome').value.trim(),preco=parseFloat($('ppreco').value)||0;
if(!nome){$('pnome').focus();return}
const ex=[...P.entries()].find(([,p])=>norm(p.nome)===norm(nome));
const id=ex?ex[0]:Date.now().toString(36)+Math.random().toString(36).slice(2,5);
const p={nome,preco,created:ex?ex[1].created:Date.now()};
P.set(id,p);if(pcoll)pcoll.doc(id).set(p).catch(()=>{});
$('pnome').value='';$('ppreco').value='';prodOptions();prodList();$('pnome').focus();
}

document.addEventListener('input',e=>{
const t=e.target,f=F.get(cur);if(!f)return;
if(['cli','cnpj','data','ven','obs'].includes(t.id))f[t.id]=t.value;
else if(t.dataset.k){
const i=+t.dataset.i,it=f.itens[i],k=t.dataset.k;
it[k]=k==='d'?t.value:(parseFloat(t.value)||0);
if(k==='d'){ 
const m=[...P.entries()].find(([,p])=>norm(p.nome)===norm(t.value));
if(m){if(it.pid!==m[0]){it.pid=m[0];it.p=m[1].preco;const pi=document.querySelector(`#itens input[data-i="${i}"][data-k="p"]`);if(pi)pi.value=m[1].preco}}
else delete it.pid;
}
}else return;
edit();
});
document.addEventListener('change',e=>{
const t=e.target;
if(t.dataset.pid){const p=P.get(t.dataset.pid);if(!p)return;p.preco=parseFloat(t.value)||0;if(pcoll)pcoll.doc(t.dataset.pid).set(p).catch(()=>{})}
});
document.addEventListener('click',e=>{
const t=e.target;
if(t.dataset.del!==undefined){F.get(cur).itens.splice(+t.dataset.del,1);list();edit();return}
if(t.dataset.pdel){P.delete(t.dataset.pdel);if(pcoll)pcoll.doc(t.dataset.pdel).delete().catch(()=>{});prodOptions();prodList();return}
if(t.dataset.more){MORE[t.dataset.more]=!MORE[t.dataset.more];board();return}
if(t.dataset.mv){const f=F.get(t.dataset.mv);move(t.dataset.mv,f.status==='preparo'?'concluida':'preparo');return}
const c=t.closest('.card');if(c&&!t.closest('button'))open(c.dataset.id);
});
$('nova').onclick=create;$('fechar').onclick=close;$('print').onclick=()=>window.print();
$('busca').oninput=e=>{Q=e.target.value;board()};
$('prods').onclick=()=>{$('prod').classList.add('on');prodList()};
$('pfechar').onclick=()=>$('prod').classList.remove('on');
$('padd').onclick=prodAdd;$('pbusca').oninput=prodList;
$('add').onclick=()=>{F.get(cur).itens.push({d:'',q:1,p:0});list();edit()};
$('mover').onclick=()=>{const f=F.get(cur);move(cur,f.status==='preparo'?'concluida':'preparo');close()};
$('del').onclick=async()=>{if(!confirm('Excluir esta fatura?'))return;const id=cur;F.delete(id);close();try{if(coll)await coll.doc(id).delete()}catch(e){}};
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.card');if(c)e.dataTransfer.setData('text/plain',c.dataset.id)});
document.addEventListener('dragover',e=>{const c=e.target.closest&&e.target.closest('.col');if(c){e.preventDefault();c.classList.add('over')}});
document.addEventListener('dragleave',e=>{const c=e.target.closest&&e.target.closest('.col');if(c)c.classList.remove('over')});
document.addEventListener('drop',e=>{const c=e.target.closest&&e.target.closest('.col');if(!c)return;e.preventDefault();const id=e.dataTransfer.getData('text/plain');move(id,c.dataset.k)});

board();
(()=>{
try{
if(!window.firebase){$('st').textContent='Firebase não carregou (modo local)';return}
firebase.initializeApp(FIREBASE_CONFIG);
const db=firebase.firestore();
coll=db.collection('faturas');pcoll=db.collection('produtos');
$('st').textContent='Conectando...';
const lim=setTimeout(()=>{$('st').textContent='Modo local (sem conexão)'},10000);
coll.onSnapshot(snap=>{
clearTimeout(lim);
const ids=new Set();
snap.docs.forEach(d=>{
const x=d.data();ids.add(d.id);
if(d.id===cur&&x.by===me)return;
F.set(d.id,{cli:x.cli||'',cnpj:x.cnpj||'',data:x.data||'',ven:x.ven||'',obs:x.obs||'',itens:Array.isArray(x.itens)&&x.itens.length?x.itens:[{d:'',q:1,p:0}],status:x.status==='concluida'?'concluida':'preparo',created:x.created||0,moved:x.moved||0,by:x.by});
});
[...F.keys()].forEach(k=>{if(!ids.has(k)&&k!==cur)F.delete(k)});
if(cur&&!F.has(cur))close();
board();if(cur){fill();sheet();edHead()}
$('st').textContent='Sincronizado';
},()=>{clearTimeout(lim);$('st').textContent='Erro de conexão (confira as regras do Firestore)'});
pcoll.onSnapshot(snap=>{
P=new Map();
snap.docs.forEach(d=>{const x=d.data();P.set(d.id,{nome:x.nome||'',preco:+x.preco||0,created:x.created||0})});
prodOptions();
if(!$('plist').contains(document.activeElement))prodList();
},()=>{$('st').textContent='Erro nos produtos (atualize as regras do Firestore)'});
}catch(e){$('st').textContent='Erro na configuração do Firebase'}
})();
