import Y from"./C_YG0P7i.js";import J from"./IXISarhh.js";import G from"./B73DOkr9.js";import{_ as Q}from"./YxgHDUC3.js";import Z from"./DofAvxwj.js";import ee from"./eEENVTRp.js";import{d as te,L as se,M as oe,e as ne,r as ae,c as n,t as l,v as d,x as t,y as o,N as a,z as i,A as r,O as y,P as b,B as u,Q as A,R as le,_ as ie}from"./CuLIi3DJ.js";import{u as re,a as ce}from"./D_saRyfo.js";import{u as de}from"./CuyHNDRV.js";import"./A78aUN5O.js";import"./CUhIDeNe.js";import"./D28xU0fP.js";import"./9gRgTphd.js";import"./CbYM_GPi.js";import"./DwQ_Tg1i.js";import"./r1T_7WMe.js";import"./3CBZku6y.js";import"./GH14ZU82.js";import"./D33MxN_b.js";import"./C4n0BqlV.js";import"./CbhYrYak.js";import"./CKaL2sZj.js";import"./ewzjBDtO.js";const me={class:"grid"},pe={class:"col-12"},ue={class:"card"},he={class:"flex align-items-start justify-content-between gap-3 flex-wrap"},fe={class:"mt-0 mb-1"},ge={class:"text-color-secondary m-0"},ye={class:"col-12 lg:col-8"},be={class:"card"},we={class:"mt-0 text-color-secondary"},ve={class:"relative"},ke={class:"col-12 lg:col-4"},_e={class:"card"},Ce={class:"mt-0"},Se={class:"list-none p-0 m-0"},Ae={class:"text-primary"},Ie={class:"text-color-secondary text-sm mt-1"},xe={class:"list-none p-0 m-0 mt-3"},Te={class:"text-primary"},Ee={class:"text-color-secondary text-sm mt-1"},Re={class:"card mt-3"},We={class:"mt-0"},Ue={class:"text-color-secondary text-sm mt-0"},Be={class:"relative"},Ne={class:"card mt-3"},Oe={class:"mt-0"},je={class:"text-color-secondary text-sm pl-3 m-0"},Pe={class:"mb-2"},$e={class:"mb-2"},De={class:"mb-2"},I=`import type {
  WahaCallsOptions, CallsConfig, ChannelConfig, RelayConfig,
  RecordingConfig, CallMode, CallStatus, CallDirection,
  CallPeer, CallStats, CallRecord, RecordingInfo,
  ListCallsQuery, RawCallData, WahaCallsEvents,
  OfferEvents, CallEvents, PcmCallEvents, Unsubscribe,
} from 'waha-calls';`,Ke=te({__name:"calls-sdk",setup(Le){const{t:e}=se(),w=oe(),h=re(),x=ce(),{base:c,session:f}=de();ne(()=>{h.$dispose()});const v=ae(0);async function k(m){try{await navigator.clipboard.writeText(m),w.add({severity:"success",summary:e("calls.sdk.copied"),life:1500})}catch{w.add({severity:"warn",summary:e("calls.examples.copyFailed"),life:2e3})}}const T=n(()=>`npm install waha-calls

# In Node, also install a WebSocket implementation:
npm install waha-calls ws`),E=n(()=>`import { WahaCalls } from 'waha-calls';

const client = new WahaCalls({
  baseUrl: '${c.value}',
  apiKey: '<API_KEY>',
  session: '${f.value}',
});
// The constructor already connects - do not call connect() after it.

client.on('connectionStatus', (s) => console.log(s));  // connected | disconnected | reconnecting
client.on('error', (e) => console.error(e));

// In Node there is no global WebSocket - inject one:
// import { WebSocket } from 'ws';
// new WahaCalls({ baseUrl, apiKey, session, webSocketImpl: WebSocket });`),R=n(()=>`interface WahaCallsOptions {
  baseUrl: string;               // required, e.g. '${c.value}'
  apiKey?: string;               // sent as X-Api-Key
  session?: string;              // omit for a multi-session client
  iceConfig?: RTCConfiguration;  // STUN/TURN for the softphone (default: none)
  autoReconnect?: boolean;       // default true, reopens the socket with backoff
  webSocketImpl?: WebSocketCtor; // required in Node - pass \`ws\`
}

// Reconnecting does NOT replay what you missed: events that happened during
// the gap are gone. Reconcile with listCalls() after coming back.

client.close();   // deliberate: it will NOT reconnect behind your back

// In Node, a script that skips close() NEVER EXITS: the constructor opens the
// events socket, and an open socket keeps the event loop alive. A one-shot
// script that only calls REST methods hangs after its last line, silently.
// A long-running listener does not need it - that process is meant to stay up.`),W=n(()=>`// configure() RESTARTS the WhatsApp session: the voice-calls app is restartOnChange,
// so any call in progress drops. Configure at startup, not per call.
// It keeps what the app already had - omitting \`recording\` leaves an existing
// recording setting alone, and disable() is not undone.
//
// One mode per channel. There is NO \`reject: boolean\` field - the mode is the switch.
//   'reject'  declines the call
//   'allow'   lets it ring so a client can answer
//   'ivr'     answers by itself and plays audio, nobody has to be connected
//   'relay'   answers and bridges the audio to your WebSocket

// Decline politely, after letting it ring for 2 s
await client.configure({
  dm: { mode: 'reject', message: 'Send a message instead.', waitBeforeDecline: 2 },
  group: { mode: 'reject' },
});

// Answer with a recorded message - no client needed
await client.configure({
  dm: { mode: 'ivr', waitBeforeAnswer: 3, ivrAudioUrl: 'https://host/greeting.mp3' },
  group: { mode: 'reject' },
});

// Every field, with what it applies to:
interface ChannelConfig {
  mode: 'reject' | 'allow' | 'ivr' | 'relay';
  message?: string;             // reject   - text sent to the caller
  waitBeforeDecline?: number;   // reject   - seconds of ringing before declining
  waitBeforeResponse?: number;  // reject   - seconds before sending \`message\`
  waitBeforeAnswer?: number;    // ivr/relay- seconds of ringing before answering
  ivrAudioUrl?: string;         // ivr      - audio played to the caller
  messageOnAnswer?: string;     // ivr/relay- text sent to the chat on answer
  relay?: RelayConfig;          // relay
}

await client.getConfig();   // CallsConfig | null
await client.isEnabled();   // boolean`),U=n(()=>`client.on('offer', async (offer) => {
  // peer.phone is empty when WhatsApp addressed the call by LID.
  console.log('ringing from', offer.peer.phone || offer.peer.lid, 'on', offer.session);
  showRingingUI(offer);

  // The call can also be settled somewhere else - on the phone, or by another
  // agent. Listen BEFORE accepting, or you will keep showing a dead call.
  offer.on('acceptedElsewhere', () => hideRingingUI());
  offer.on('rejectedElsewhere', () => hideRingingUI());
  offer.on('ended', (reason) => hideRingingUI(reason));

  // In the browser: answers and opens the audio.
  const { call, err } = await offer.accept();
  if (err) return console.error(err);

  audioElement.srcObject = call.stream;
});

// offer.reject()  -> declines without answering            -> { err? }
// offer.answer()  -> answers WITHOUT the softphone (Node)  -> { err? }
//                    pair it with grabPcm()
//
// Fields: offer.callId, offer.session, offer.peer,
//         offer.escalated, offer.summary, offer.intent`),B=n(()=>`const { callId, peerJid } = await client.placeCall('5511999990000');

client.on('call', (c) => console.log(c.state));  // Calling -> Ringing -> Connecting -> Active
client.on('ended', (i) => console.log('ended:', i.reason));

// Take over the audio of a call that is already active (browser):
const { call } = await client.grab(callId);

// Hang up without needing the Call object:
await client.hangup(callId);

// The SDK sends chatId as you give it; WAHA normalises it server-side, so a bare
// number becomes a WhatsApp JID and @lid / group JIDs pass through untouched.`),N=n(()=>`call.mute();
call.unmute();
call.toggleMute();
call.isMuted;      // boolean
call.stream;       // MediaStream | null - attach to an <audio> element
call.callId;
call.session;
call.peer;         // { phone, lid?, displayName? }

await call.end();  // hangs up AND releases the microphone

call.on('connectionStatus', (s) => {});  // connecting | connected | disconnected
call.on('ended', () => {});`),O=n(()=>`// By default the softphone uses NO ICE servers: it relies on the server's
// WAHA_CALLS_WEBRTC_PUBLIC_IP and the open UDP port, which is enough when the
// browser can reach that address directly. Behind symmetric NAT or a strict
// firewall, pass your own RTCConfiguration:

const client = new WahaCalls({
  baseUrl: '${c.value}',
  apiKey: '<API_KEY>',
  session: '${f.value}',
  iceConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turns:turn.example.com:5349', username: 'user', credential: 'pass' },
    ],
    // iceTransportPolicy: 'relay',   // force TURN
  },
});

// iceConfig is a plain RTCConfiguration and is handed to every Call the client
// builds - through offer.accept() and through grab().`),j=n(()=>`const stats = await call.getStats();

interface CallStats {
  rtt?: number;             // round-trip time, seconds
  rxLoss?: number;          // packet loss fraction, received
  txLoss?: number;          // packet loss fraction, sent
  rxBitrateKbps?: number;
  txBitrateKbps?: number;
  jitterMs?: number;
}

// rxBitrateKbps: 0 on a live call is usually NOT a bug - it is Opus DTX:
// a silent peer nearly stops transmitting.`),P=n(()=>`// Raw audio, for transcription/synthesis. Works in Node and in the browser.
import { WebSocket } from 'ws';
const client = new WahaCalls({
  baseUrl: '${c.value}',
  apiKey: '<API_KEY>',
  session: '${f.value}',
  webSocketImpl: WebSocket,
});

client.on('offer', async (offer) => {
  await offer.answer();                        // answer WITHOUT the softphone
  const pcm = await client.grabPcm(offer.callId);

  const off = pcm.onAudio((frame) => stt.write(frame));  // caller -> you
  pcm.sendAudio(ttsFrame);   // you -> caller; returns false if the socket closed
  pcm.on('ended', cleanup);
  pcm.on('error', console.error);
  // off();       stop listening
  // pcm.end();   close the bridge
});

// PCM s16le, 16 kHz, mono - 1920 bytes (960 samples) per 60 ms frame.`),$=n(()=>`// A channel in 'relay' makes WAHA DIAL your WebSocket and bridge the audio
// both ways - you never hold a Call object.
await client.configure({
  dm: {
    mode: 'relay',
    waitBeforeAnswer: 3,
    relay: {
      url: 'wss://my-bot/voice',
      headers: { Authorization: 'Bearer ...' },  // sent when opening the socket
      greetingAudioUrl: 'https://host/hello.mp3', // played during the handshake
      holdAudioUrl: 'https://host/hold.mp3',      // looped while waiting for an agent
      holdTimeoutSec: 60,
      maxDurationSec: 600,
      hangupOnDisconnect: false,
    },
  },
  group: { mode: 'reject' },
});

// On your service: binary frames are PCM s16le 16 kHz (1920 B / 60 ms).
// WAHA sends call.start on connect, with format: "s16le;16000;mono;60ms".
// TEXT frames are control:
//   {"type":"barge_in"}                                drops your queued audio
//   {"type":"escalate","summary":"...","intent":"..."} hands over to a human
//   {"type":"hangup"}                                  ends the call

client.on('escalate', async ({ callId, session, peer, summary, intent, offer }) => {
  const { call } = await offer.accept();   // the agent takes over the same call
});`),D=n(()=>`await client.configure({
  dm: { mode: 'allow' },
  group: { mode: 'reject' },
  recording: { enabled: true, bitrate: 32000, separateChannels: true },
});

client.on('recording', (r) => {
  // Arrives AFTER 'ended': the file only closes when the call is over.
  console.log(r.durationMs, r.bytes, r.mimetype, r.url);
  console.log(r.s3);              // { Bucket, Key } - does not expire
  console.log(r.droppedSamples);  // normally 0; anything else means gaps
});

// Later, from the call record:
const record = await client.getCall(callId);
record?.recording?.s3;`),K=n(()=>`// History, with filters
await client.listCalls({
  direction: 'incoming',   // 'incoming' | 'outgoing'
  finalState: 'ended',
  limit: 20,
  offset: 0,
});

// A single record, with the recording when there is one
await client.getCall(callId);

interface CallRecord {
  id: string; session: string; peer: string;
  direction: 'incoming' | 'outgoing';
  finalState: string; reason?: string;
  isVideo: boolean; isGroup: boolean;
  startedAt: number;        // unix ms
  endedAt?: number; durationSeconds?: number;
  recording?: RecordingInfo;
}

// The app itself
await client.getConfig();
await client.isEnabled();
await client.disable();   // switches off KEEPING the configuration
await client.remove();    // deletes the app and everything in it - irreversible`),L=n(()=>`// Omit \`session\` and the client subscribes to ALL sessions ('*') over one
// events socket. Every event carries its session, and every method takes one.
const client = new WahaCalls({ baseUrl: '${c.value}', apiKey: '<API_KEY>' });

client.on('offer', async (offer) => {
  console.log('ringing on', offer.session, 'from', offer.peer.phone);
  const { call } = await offer.accept();   // the offer knows its own session
});

client.on('escalate', async ({ session, callId }) => {
  const { call } = await client.grab(callId, undefined, session);
});

await client.configure({ dm: { mode: 'relay', relay: { url: 'wss://my-bot/voice' } } }, 'sales');
await client.placeCall('5511999990000', 'support');
await client.listCalls({ limit: 20 }, 'support');

// Needs an API key with access to all sessions. With a single-session key the
// server scopes '*' down to that one. Calling a method WITHOUT a session throws
// here - there is no default.`),H=n(()=>[{key:"install",title:e("calls.sdk.install.title"),body:e("calls.sdk.install.body"),code:T.value},{key:"connect",title:e("calls.sdk.connect.title"),body:e("calls.sdk.connect.body"),code:E.value},{key:"options",title:e("calls.sdk.options.title"),body:e("calls.sdk.options.body"),code:R.value},{key:"modes",title:e("calls.sdk.modes.title"),body:e("calls.sdk.modes.body"),code:W.value},{key:"incoming",title:e("calls.sdk.incoming.title"),body:e("calls.sdk.incoming.body"),code:U.value},{key:"outgoing",title:e("calls.sdk.outgoing.title"),body:e("calls.sdk.outgoing.body"),code:B.value},{key:"active",title:e("calls.sdk.active.title"),body:e("calls.sdk.active.body"),code:N.value},{key:"webrtc",title:e("calls.sdk.webrtc.title"),body:e("calls.sdk.webrtc.body"),code:O.value},{key:"stats",title:e("calls.sdk.stats.title"),body:e("calls.sdk.stats.body"),code:j.value},{key:"pcm",title:e("calls.sdk.pcm.title"),body:e("calls.sdk.pcm.body"),code:P.value},{key:"relay",title:e("calls.sdk.relay.title"),body:e("calls.sdk.relay.body"),code:$.value},{key:"recording",title:e("calls.sdk.recording.title"),body:e("calls.sdk.recording.body"),code:D.value,note:e("calls.sdk.recording.note")},{key:"history",title:e("calls.sdk.history.title"),body:e("calls.sdk.history.body"),code:K.value},{key:"multisession",title:e("calls.sdk.multisession.title"),body:e("calls.sdk.multisession.body"),code:L.value}]),M=n(()=>[{name:"offer",when:e("calls.sdk.events.offer")},{name:"call",when:e("calls.sdk.events.call")},{name:"escalate",when:e("calls.sdk.events.escalate")},{name:"ended",when:e("calls.sdk.events.ended")},{name:"recording",when:e("calls.sdk.events.recording")},{name:"connectionStatus",when:e("calls.sdk.events.connectionStatus")},{name:"error",when:e("calls.sdk.events.error")}]),q=[{name:"Offer",when:"ended(reason?) · acceptedElsewhere · rejectedElsewhere"},{name:"Call",when:"connectionStatus · ended"},{name:"PcmCall",when:"audio(Uint8Array) · ended · error"}];function V(m){h.selectSession(m)}return(m,p)=>{const z=Y,_=J,C=G,S=Q,F=Z,X=ee;return l(),d("div",me,[t("div",pe,[t("div",ue,[t("div",he,[t("div",null,[t("h4",fe,o(a(e)("calls.sdk.title")),1),t("p",ge,o(a(e)("calls.sdk.subtitle")),1)]),i(z,{"model-value":a(h).selectedSession,options:a(x).visibleSessions,"option-label":s=>{var g;return`${s.name} (${((g=s.server)==null?void 0:g.name)??""})`},placeholder:a(e)("calls.page.selectSession"),"show-clear":"",style:{"min-width":"18rem"},"onUpdate:modelValue":V},null,8,["model-value","options","option-label","placeholder"])]),i(_,{severity:"info",class:"w-full mt-3"},{default:r(()=>[u(o(a(e)("calls.sdk.sessionHint")),1)]),_:1})])]),t("div",ye,[t("div",be,[i(X,{"active-index":v.value,"onUpdate:activeIndex":p[0]||(p[0]=s=>v.value=s)},{default:r(()=>[(l(!0),d(y,null,b(H.value,s=>(l(),A(F,{key:s.key,header:s.title},{default:r(()=>[t("p",we,o(s.body),1),t("div",ve,[i(C,{icon:"pi pi-copy",text:"",rounded:"",size:"small",class:"copy-btn","aria-label":a(e)("calls.sdk.copy"),onClick:g=>k(s.code)},null,8,["aria-label","onClick"]),i(S,null,{default:r(()=>[u(o(s.code),1)]),_:2},1024)]),s.note?(l(),A(_,{key:0,severity:"warn",class:"w-full mt-2"},{default:r(()=>[u(o(s.note),1)]),_:2},1024)):le("",!0)]),_:2},1032,["header"]))),128))]),_:1},8,["active-index"])])]),t("div",ke,[t("div",_e,[t("h5",Ce,o(a(e)("calls.sdk.events.title")),1),t("ul",Se,[(l(!0),d(y,null,b(M.value,s=>(l(),d("li",{key:s.name,class:"py-2 border-bottom-1 surface-border"},[t("code",Ae,o(s.name),1),t("div",Ie,o(s.when),1)]))),128))]),t("ul",xe,[(l(),d(y,null,b(q,s=>t("li",{key:s.name,class:"py-2 border-bottom-1 surface-border"},[t("code",Te,o(s.name),1),t("div",Ee,o(s.when),1)])),64))])]),t("div",Re,[t("h5",We,o(a(e)("calls.sdk.types.title")),1),t("p",Ue,o(a(e)("calls.sdk.types.body")),1),t("div",Be,[i(C,{icon:"pi pi-copy",text:"",rounded:"",size:"small",class:"copy-btn","aria-label":a(e)("calls.sdk.copy"),onClick:p[1]||(p[1]=s=>k(I))},null,8,["aria-label"]),i(S,null,{default:r(()=>[u(o(I))]),_:1})])]),t("div",Ne,[t("h5",Oe,o(a(e)("calls.sdk.requirements.title")),1),t("ul",je,[t("li",Pe,o(a(e)("calls.sdk.requirements.engine")),1),t("li",$e,o(a(e)("calls.sdk.requirements.webrtc")),1),t("li",De,o(a(e)("calls.sdk.requirements.https")),1),t("li",null,o(a(e)("calls.sdk.requirements.app")),1)])])])])}}}),mt=ie(Ke,[["__scopeId","data-v-c2192c73"]]);export{mt as default};
