import N from"./DbA_S06p.js";import ee from"./DwoAxqKU.js";import te from"./WFn2QpKj.js";import V from"./BEEsPkCJ.js";import{r as E,d as P,L as z,M as K,t as _,v as b,x as e,y as u,N as o,z as y,O as se,P as B,_ as G,Q as ae,c as A,H as J,e as Z,R as D,S as L,B as O,C as oe,D as le,T as j,U as ne,V as ie,W as Q,X as re,A as F,Y as ce}from"./D97Kf9N-.js";import{u as U,a as H}from"./Bih--tqv.js";import{W as ue}from"./BJn_yK-r.js";import de from"./DjbUQe4A.js";import pe from"./Rj3u69kg.js";import"./G-FYUSHd.js";import"./DDXkyyHC.js";import"./CWh3JQQX.js";import"./C_sbrDqy.js";import"./BH41f0ib.js";import"./Bw-GhPxY.js";import"./CDJszhOf.js";import"./BKOgHRTO.js";import"./BVCkfMRg.js";import"./DMFP8ogT.js";import"./B9Hr2PTX.js";import"./DgN6dDd3.js";import"./BzuWUzDK.js";import"./Dtm3vRJw.js";import"./D8ihDnZI.js";import"./3b4sN_KU.js";import"./BaSghBv7.js";import"./tpk2BVSb.js";import"./CjHR5FIV.js";import"./Cnp_qmes.js";import"./B1yM1-tM.js";import"./B3blTfht.js";import"./7tYOlIsc.js";const _e=window.setInterval,fe=`
const TARGET_RATE = 16000;
const FRAME = 960; // 60 ms @ 16 kHz

// Streaming linear resampler — continuity preserved across blocks via fractional position.
function makeResampler(inRate, outRate) {
  let pos = 0;
  const step = inRate / outRate;
  return function (input) {
    if (input.length === 0) return new Float32Array(0);
    const out = [];
    while (pos < input.length) {
      const i = Math.floor(pos);
      const frac = pos - i;
      const a = input[i];
      const b = input[i + 1 < input.length ? i + 1 : input.length - 1];
      out.push(a + (b - a) * frac);
      pos += step;
    }
    pos -= input.length;
    return Float32Array.from(out);
  };
}

class PcmProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._rate = sampleRate; // actual AudioContext rate
    this._resample = Math.abs(this._rate - TARGET_RATE) > 1;
    this._capRs = this._resample ? makeResampler(this._rate, TARGET_RATE) : null;  // mic → 16k
    this._playRs = this._resample ? makeResampler(TARGET_RATE, this._rate) : null; // 16k → out

    this._capBuf = new Float32Array(0);  // 16 kHz float capture accumulator
    this._playBuf = new Float32Array(0); // context-rate float playback jitter buffer
    this._started = false;               // prebuffer gate
    this._lastVal = 0;                   // last output sample (click-free underrun)

    // Jitter buffer thresholds, in context-rate samples.
    this._prebuffer = Math.round(0.09 * this._rate); // ~90 ms before playback starts
    this._targetFill = Math.round(0.15 * this._rate); // ~150 ms target after overrun trim
    this._maxFill = Math.round(0.25 * this._rate);    // ~250 ms hard cap

    this.port.onmessage = (e) => {
      const raw = e.data;
      if (!raw) return;
      const buf = raw instanceof ArrayBuffer ? raw : raw.buffer;
      const int16 = new Int16Array(buf);
      let f = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) f[i] = int16[i] / 32768;
      if (this._resample) f = this._playRs(f); // store in context-rate domain
      const next = new Float32Array(this._playBuf.length + f.length);
      next.set(this._playBuf);
      next.set(f, this._playBuf.length);
      this._playBuf = next;
      // Latency cap: drop oldest beyond maxFill, back down to targetFill.
      if (this._playBuf.length > this._maxFill) {
        this._playBuf = this._playBuf.slice(this._playBuf.length - this._targetFill);
      }
    };
  }

  process(inputs, outputs) {
    // ── Capture: context rate → 16 kHz → 960-sample int16 frames ──
    const input = inputs[0] && inputs[0][0];
    if (input && input.length) {
      const s = this._resample ? this._capRs(input) : input;
      if (s.length) {
        const merged = new Float32Array(this._capBuf.length + s.length);
        merged.set(this._capBuf);
        merged.set(s, this._capBuf.length);
        this._capBuf = merged;
        while (this._capBuf.length >= FRAME) {
          const frame = this._capBuf.subarray(0, FRAME);
          const int16 = new Int16Array(FRAME);
          for (let i = 0; i < FRAME; i++) {
            const x = frame[i] < -1 ? -1 : frame[i] > 1 ? 1 : frame[i];
            int16[i] = x < 0 ? x * 0x8000 : x * 0x7fff;
          }
          this._capBuf = this._capBuf.slice(FRAME);
          this.port.postMessage(int16.buffer, [int16.buffer]);
        }
      }
    }

    // ── Playback: jitter buffer (context rate) → output ──
    const out = outputs[0] && outputs[0][0];
    if (out) {
      if (!this._started) {
        if (this._playBuf.length >= this._prebuffer) this._started = true;
        else { out.fill(0); return true; }
      }
      if (this._playBuf.length >= out.length) {
        out.set(this._playBuf.subarray(0, out.length));
        this._lastVal = out[out.length - 1];
        this._playBuf = this._playBuf.slice(out.length);
      } else {
        // Underrun: play what we have and conceal the rest with a click-free ramp to zero.
        // Keep _started=true so playback resumes seamlessly when frames arrive (no extra
        // latency from re-prebuffering on every transient hiccup).
        const have = this._playBuf.length;
        if (have > 0) {
          out.set(this._playBuf.subarray(0, have));
          this._playBuf = new Float32Array(0);
        }
        this._rampToZero(out, have);
      }
    }
    return true;
  }

  _rampToZero(out, from) {
    const start = from > 0 ? out[from - 1] : this._lastVal;
    const rem = out.length - from;
    for (let i = 0; i < rem; i++) out[from + i] = start * (1 - (i + 1) / rem);
    this._lastVal = 0;
  }
}

registerProcessor('pcm-processor', PcmProcessor);
`;function he(){const $=E(!1),t=E(!1),r=E(null);let c=null,d=null,i=null,n=null,f=null;function S(v,g,a){const w=v.connection.url.replace("https://","wss://").replace("http://","ws://").replace(/\/$/,""),C=new URLSearchParams({session:g,callId:a});return v.connection.key&&C.set("x-api-key",v.connection.key),`${w}/ws/calls/audio?${C}`}async function m(v,g,a){await s(),r.value=null;try{f=await navigator.mediaDevices.getUserMedia({audio:!0,video:!1});try{d=new AudioContext({sampleRate:16e3})}catch{d=new AudioContext}const w=new Blob([fe],{type:"application/javascript"}),C=URL.createObjectURL(w);try{await d.audioWorklet.addModule(C)}finally{URL.revokeObjectURL(C)}n=new AudioWorkletNode(d,"pcm-processor",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}),i=d.createMediaStreamSource(f),i.connect(n),n.connect(d.destination);const T=S(v,g,a);c=new WebSocket(T),c.binaryType="arraybuffer",c.onopen=()=>{$.value=!0},c.onerror=()=>{r.value="Erro na conexão de áudio"},c.onclose=()=>{$.value=!1},c.onmessage=R=>{if(!n||!(R.data instanceof ArrayBuffer)||R.data.byteLength===0)return;const I=R.data.slice(0);n.port.postMessage(I,[I])},n.port.onmessage=R=>{(c==null?void 0:c.readyState)===WebSocket.OPEN&&!t.value&&c.send(R.data)}}catch(w){r.value=(w==null?void 0:w.message)??"Erro ao iniciar áudio",console.error("[CallAudio] start error:",w),await s()}}async function s(){n==null||n.disconnect(),n=null,i==null||i.disconnect(),i=null,f==null||f.getTracks().forEach(v=>v.stop()),f=null,d&&(await d.close().catch(()=>{}),d=null),c&&(c.onclose=null,c.close(),c=null),$.value=!1,t.value=!1}function k(){t.value=!t.value,f==null||f.getTracks().forEach(v=>{v.enabled=!t.value})}return{isActive:$,isMuted:t,error:r,start:m,stop:s,toggleMute:k}}const me={class:"call-dialer"},ve={class:"mb-3"},ge={class:"flex gap-2 align-items-end"},ye={class:"flex-1"},be={class:"block mb-1",for:"chatId"},we={key:0,class:"p-message-secondary"},xe=P({__name:"CallDialer",setup($){const{t}=z(),r=U(),c=H(),d=K(),i=E(""),n=E(!1);function f(m){const s=m.trim();return s.includes("@")?s:s+"@s.whatsapp.net"}async function S(){const m=r.selectedSession;if(!(!m||!i.value.trim())){n.value=!0;try{const s=await c.placeCall(m.server.id,m.name,f(i.value));r.setActiveCall({id:s.callId??s.id,from:s.peerJid,direction:"outgoing",state:"Calling"}),i.value="",d.add({severity:"success",summary:t("calls.dialer.callPlaced"),life:2e3})}catch(s){d.add({severity:"error",summary:t("calls.dialer.callFailed"),detail:s==null?void 0:s.message,life:4e3})}finally{n.value=!1}}}return(m,s)=>{const k=te,v=V;return _(),b("div",me,[e("h5",ve,u(o(t)("calls.dialer.title")),1),e("div",ge,[e("div",ye,[e("label",be,u(o(t)("calls.dialer.chatIdLabel")),1),y(k,{id:"chatId",modelValue:i.value,"onUpdate:modelValue":s[0]||(s[0]=g=>i.value=g),placeholder:o(t)("calls.dialer.chatIdPlaceholder"),class:"w-full",disabled:o(r).isCallActive||!o(r).selectedSession,onKeydown:se(S,["enter"])},null,8,["modelValue","placeholder","disabled"])]),y(v,{icon:"pi pi-phone",label:o(t)("calls.dialer.call"),severity:"success",loading:n.value,disabled:!i.value.trim()||o(r).isCallActive||!o(r).selectedSession,onClick:S},null,8,["label","loading","disabled"])]),o(r).selectedSession?B("",!0):(_(),b("small",we,u(o(t)("calls.dialer.selectSessionFirst")),1))])}}}),$e=G(xe,[["__scopeId","data-v-a1717526"]]),X=$=>(oe("data-v-6a760d86"),$=$(),le(),$),Se={class:"call-active-panel"},ke={key:0,class:"call-card"},Ae={class:"call-header"},Ce={class:"avatar"},Be={key:0,class:"pulse-ring"},Re={class:"call-meta"},Te={class:"contact-row"},Me={class:"contact-id"},Ee={class:"state-row"},Fe={key:0,class:"audio-row"},Ie={class:"audio-label"},Le={key:0,class:"audio-error"},De={class:"duration-badge"},Pe=X(()=>e("i",{class:"pi pi-clock"},null,-1)),ze={class:"call-actions"},Ue={key:1,class:"no-call"},Oe=X(()=>e("i",{class:"pi pi-phone"},null,-1)),Ve=P({__name:"CallActivePanel",setup($){const{t}=z(),r=U(),c=H(),d=K(),i=ae(he()),n=A(()=>r.activeCall),f=A(()=>{var l;return((l=n.value)==null?void 0:l.state)==="Active"}),S=A(()=>{var l;return["Ringing","Calling"].includes(((l=n.value)==null?void 0:l.state)??"")}),m=E(0);let s=null;function k(){m.value=0,s=_e(()=>{m.value++},1e3)}function v(){s&&(clearInterval(s),s=null)}const g=A(()=>{const l=m.value,p=Math.floor(l/60),h=l%60;return`${String(p).padStart(2,"0")}:${String(h).padStart(2,"0")}`}),a=A(()=>{var l;return(((l=n.value)==null?void 0:l.from)??"").replace(/@[^@]*$/,"")||"—"}),w=A(()=>a.value.replace(/\D/g,"").slice(0,2)||"??"),C=A(()=>{var p;const l=(p=n.value)==null?void 0:p.state;return l?t(`calls.panel.state.${l.toLowerCase()}`,l):""}),T=A(()=>{var l;switch((l=n.value)==null?void 0:l.state){case"Active":return"success";case"Calling":case"Ringing":return"warn";case"Ended":return"secondary";default:return"info"}}),R=A(()=>{var h;const l=(h=n.value)==null?void 0:h.reason;if(!l)return null;const p=`calls.panel.reason.${l.toLowerCase().replace(/[\s-]/g,"_")}`;return t(p,l)}),I=A(()=>{var l,p;switch((p=(l=n.value)==null?void 0:l.reason)==null?void 0:p.toLowerCase()){case"declined":case"rejected":return"danger";case"busy":case"do_not_disturb":return"warn";case"timeout":case"cancelled":return"secondary";default:return"secondary"}});J(()=>{var l;return(l=r.activeCall)==null?void 0:l.state},async(l,p)=>{if(l==="Active"){k();const h=r.selectedSession,M=r.activeCall;h!=null&&h.server&&(M!=null&&M.id)&&await i.start(h.server,h.name,M.id)}else p==="Active"&&(v(),await i.stop())}),Z(()=>{v(),i.stop()});const W=A(()=>r.isIncoming&&S.value),x=A(()=>!!n.value&&n.value.state!=="Ended");async function Y(){const l=r.selectedSession,p=n.value;if(!(!l||!(p!=null&&p.id)))try{await c.answerCall(l.server.id,l.name,p.id)}catch(h){d.add({severity:"error",summary:t("calls.panel.answerFailed"),detail:h==null?void 0:h.message,life:4e3})}}async function q(){const l=r.selectedSession,p=n.value;if(!(!l||!(p!=null&&p.id)))try{await c.hangupCall(l.server.id,l.name,p.id)}catch(h){d.add({severity:"error",summary:t("calls.panel.hangupFailed"),detail:h==null?void 0:h.message,life:4e3})}}return(l,p)=>{const h=N,M=V;return _(),b("div",Se,[n.value?(_(),b("div",ke,[e("div",Ae,[e("div",{class:D(["avatar-wrap",o(r).isOutgoing?"avatar-wrap--outgoing":"avatar-wrap--incoming"])},[e("div",Ce,u(w.value),1),S.value?(_(),b("div",Be)):B("",!0)],2),e("div",Re,[e("div",Te,[e("i",{class:D([o(r).isOutgoing?"pi pi-arrow-up-right":"pi pi-arrow-down-left","direction-icon"])},null,2),e("span",Me,u(a.value),1)]),e("div",Ee,[y(h,{value:C.value,severity:T.value},null,8,["value","severity"]),R.value?(_(),L(h,{key:0,value:R.value,severity:I.value,class:"reason-tag"},null,8,["value","severity"])):B("",!0)])])]),f.value?(_(),b("div",Fe,[e("span",{class:D(["status-dot",i.isActive?"dot-live":"dot-connecting"])},null,2),e("span",Ie,u(i.isActive?o(t)("calls.audio.live"):o(t)("calls.audio.connecting")),1),i.error?(_(),b("span",Le,"⚠ "+u(i.error),1)):B("",!0),e("span",De,[Pe,O(" "+u(g.value),1)])])):B("",!0),e("div",ze,[f.value?(_(),L(M,{key:0,icon:i.isMuted?"pi pi-microphone-slash":"pi pi-microphone",label:i.isMuted?o(t)("calls.audio.unmute"):o(t)("calls.audio.mute"),severity:i.isMuted?"danger":"secondary",size:"small",rounded:"",onClick:p[0]||(p[0]=St=>i.toggleMute())},null,8,["icon","label","severity"])):B("",!0),W.value?(_(),L(M,{key:1,icon:"pi pi-phone",label:o(t)("calls.panel.answer"),severity:"success",size:"small",rounded:"",onClick:Y},null,8,["label"])):B("",!0),x.value?(_(),L(M,{key:2,icon:"pi pi-times",label:o(t)("calls.panel.hangup"),severity:"danger",size:"small",rounded:"",onClick:q},null,8,["label"])):B("",!0)])])):(_(),b("div",Ue,[Oe,e("p",null,u(o(t)("calls.panel.noActiveCall")),1)]))])}}}),He=G(Ve,[["__scopeId","data-v-6a760d86"]]),We={class:"call-history"},je={class:"flex justify-content-between align-items-center mb-3"},Ne={class:"m-0"},Ge={key:0,class:"text-color-secondary text-center py-3"},Ke={key:1,class:"history-list"},Je={class:"flex-1 min-w-0"},Ze={class:"flex align-items-center gap-1"},Qe={class:"text-sm font-semibold text-overflow-ellipsis overflow-hidden white-space-nowrap"},Xe={class:"text-xs text-color-secondary"},Ye={key:0},qe={class:"text-xs text-color-secondary white-space-nowrap"},et=P({__name:"CallHistory",setup($){const{t}=z(),r=U();function c(n){return ue[n]??"#94a3b8"}function d(n){return new Date(n).toLocaleTimeString()}function i(n){return n==="outgoing"?"pi pi-arrow-up-right":n==="incoming"?"pi pi-arrow-down-left":"pi pi-minus"}return(n,f)=>{const S=V,m=Q("tooltip");return _(),b("div",We,[e("div",je,[e("h5",Ne,u(o(t)("calls.history.title")),1),o(r).callHistory.length?j((_(),L(S,{key:0,icon:"pi pi-trash",text:"",severity:"secondary",size:"small",onClick:f[0]||(f[0]=s=>o(r).clearHistory())},null,512)),[[m,o(t)("calls.history.clear"),void 0,{top:!0}]]):B("",!0)]),o(r).callHistory.length?(_(),b("div",Ke,[(_(!0),b(ne,null,ie(o(r).callHistory,(s,k)=>(_(),b("div",{key:k,class:D(["history-entry flex align-items-start gap-2 py-2",{"border-top-1 surface-border":k>0}])},[e("span",{class:"event-badge text-xs font-bold px-2 py-1 border-round",style:re({background:c(s.event)+"33",color:c(s.event),border:`1px solid ${c(s.event)}`})},u(s.event),5),e("div",Je,[e("div",Ze,[e("i",{class:D([i(s.direction),"text-xs"])},null,2),j((_(),b("span",Qe,[O(u(s.fromPhone||s.from||s.id||"—"),1)])),[[m,s.from!==s.fromPhone&&s.from?s.from:void 0,void 0,{top:!0}]])]),e("div",Xe,[O(u(s.state)+" ",1),s.reason?(_(),b("span",Ye," · "+u(s.reason),1)):B("",!0)])]),e("span",qe,u(d(s.receivedAt)),1)],2))),128))])):(_(),b("div",Ge,[e("small",null,u(o(t)("calls.history.empty")),1)]))])}}}),tt=G(et,[["__scopeId","data-v-5d2973ca"]]),st={class:"flex justify-content-between align-items-center mb-3"},at={class:"m-0"},ot={class:"flex align-items-center gap-1"},lt={class:"font-semibold"},nt={class:"text-xs text-color-secondary"},it=P({__name:"CallLogTable",setup($){const{t}=z(),r=U(),c=H(),d=E([]),i=E(!1);J(()=>r.selectedSession,a=>{a?n():d.value=[]});async function n(){const a=r.selectedSession;if(a!=null&&a.server){i.value=!0;try{d.value=await c.getCalls(a.server.id,a.name,{limit:100})}catch{d.value=[]}finally{i.value=!1}}}function f(a){return t(a==="outgoing"?"calls.log.direction.outgoing":"calls.log.direction.incoming")}function S(a){return a==="outgoing"?"pi pi-arrow-up-right":"pi pi-arrow-down-left"}function m(a){switch(a){case"active":return"success";case"ended":return"secondary";case"missed":return"warn";case"rejected":return"danger";case"calling":case"ringing":return"info";default:return"secondary"}}function s(a){return t(`calls.log.state.${a}`,a)}function k(a){if(!a)return"—";if(a<60)return t("calls.log.duration.seconds",{n:a});const w=Math.floor(a/60),C=a%60;return t("calls.log.duration.minutes",{m:w,s:C})}function v(a){return a?new Date(a).toLocaleString():"—"}function g(a){return(a==null?void 0:a.replace(/@.*$/,""))??"—"}return(a,w)=>{const C=V,T=de,R=N,I=pe,W=Q("tooltip");return _(),b("div",null,[e("div",st,[e("h5",at,u(o(t)("calls.log.title")),1),j(y(C,{icon:"pi pi-refresh",text:"",severity:"secondary",size:"small",loading:i.value,disabled:!o(r).selectedSession,onClick:w[0]||(w[0]=x=>n())},null,8,["loading","disabled"]),[[W,o(t)("calls.log.refresh"),void 0,{top:!0}]])]),y(I,{value:d.value,loading:i.value,size:"small","striped-rows":"","scroll-height":"400px",scrollable:"","empty-message":o(t)("calls.log.empty")},{default:F(()=>[y(T,{field:"direction",header:o(t)("calls.log.col.direction"),style:{width:"110px"}},{body:F(({data:x})=>[e("div",ot,[e("i",{class:D([S(x.direction),"text-xs"])},null,2),e("span",null,u(f(x.direction)),1)])]),_:1},8,["header"]),y(T,{field:"peer",header:o(t)("calls.log.col.peer")},{body:F(({data:x})=>[e("span",lt,u(g(x.peer)),1)]),_:1},8,["header"]),y(T,{field:"finalState",header:o(t)("calls.log.col.state"),style:{width:"110px"}},{body:F(({data:x})=>[y(R,{value:s(x.finalState),severity:m(x.finalState)},null,8,["value","severity"])]),_:1},8,["header"]),y(T,{field:"durationSeconds",header:o(t)("calls.log.col.duration"),style:{width:"90px"}},{body:F(({data:x})=>[O(u(k(x.durationSeconds)),1)]),_:1},8,["header"]),y(T,{field:"startedAt",header:o(t)("calls.log.col.startedAt"),style:{width:"160px"}},{body:F(({data:x})=>[e("span",nt,u(v(x.startedAt)),1)]),_:1},8,["header"])]),_:1},8,["value","loading","empty-message"])])}}}),rt={class:"grid"},ct={class:"col-12"},ut={class:"card"},dt={class:"flex align-items-center gap-3 flex-wrap"},pt={class:"font-bold white-space-nowrap"},_t={class:"flex align-items-center gap-2"},ft=e("i",{class:"pi pi-whatsapp"},null,-1),ht={class:"text-color-secondary text-sm"},mt={class:"col-12 md:col-6 lg:col-5"},vt={class:"card mb-3"},gt={class:"card"},yt={class:"mt-0 mb-3"},bt={class:"col-12 md:col-6 lg:col-7"},wt={class:"card"},xt={class:"col-12"},$t={class:"card"},as=P({__name:"calls",setup($){const{t}=z(),r=H(),c=U();ce(()=>{r.refresh()}),Z(()=>{c.$dispose()});function d(i){c.selectSession(i)}return(i,n)=>{const f=N,S=ee,m=$e,s=He,k=tt,v=it;return _(),b("div",rt,[e("div",ct,[e("div",ut,[e("div",dt,[e("label",pt,u(o(t)("calls.page.session"))+":",1),y(S,{"model-value":o(c).selectedSession,options:o(r).visibleSessions,"option-label":g=>{var a;return`${g.name} (${((a=g.server)==null?void 0:a.name)??""})`},placeholder:o(t)("calls.page.selectSession"),class:"flex-1","show-clear":"","onUpdate:modelValue":d},{option:F(({option:g})=>{var a;return[e("div",_t,[ft,e("span",null,u(g.name),1),y(f,{value:g.status,severity:g.status==="WORKING"?"success":"secondary",class:"text-xs"},null,8,["value","severity"]),e("span",ht,u((a=g.server)==null?void 0:a.name),1)])]}),_:1},8,["model-value","options","option-label","placeholder"]),o(c).selectedSession?(_(),L(f,{key:0,value:o(c).selectedSession.status,severity:o(c).selectedSession.status==="WORKING"?"success":"warn"},null,8,["value","severity"])):B("",!0)])])]),e("div",mt,[e("div",vt,[y(m)]),e("div",gt,[e("h5",yt,u(o(t)("calls.panel.title")),1),y(s)])]),e("div",bt,[e("div",wt,[y(k)])]),e("div",xt,[e("div",$t,[y(v)])])])}}});export{as as default};
