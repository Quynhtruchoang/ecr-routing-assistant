import { useState, useRef, useEffect } from "react";

const DEPOTS = {
  "Rotterdam Waalhaven":   { lat: 51.8920, lng: 4.4120 },
  "Rotterdam ECT":         { lat: 51.9225, lng: 4.0555 },
  "Antwerp Noord":         { lat: 51.2892, lng: 4.3295 },
  "Antwerp Deurganckdok":  { lat: 51.3012, lng: 4.2588 },
  "Moerdijk":              { lat: 51.6912, lng: 4.6012 },
};

const DEPOT_STATUS = [
  { depot: "Antwerp Deurganckdok", type: "20FT", supply: 6,  demand: 10, gap: 4  },
  { depot: "Antwerp Deurganckdok", type: "40FT", supply: 15, demand: 15, gap: 0  },
  { depot: "Antwerp Deurganckdok", type: "LCL",  supply: 5,  demand: 3,  gap: -2 },
  { depot: "Antwerp Noord",        type: "20FT", supply: 9,  demand: 16, gap: 7  },
  { depot: "Antwerp Noord",        type: "40FT", supply: 14, demand: 10, gap: -4 },
  { depot: "Antwerp Noord",        type: "LCL",  supply: 3,  demand: 5,  gap: 2  },
  { depot: "Moerdijk",             type: "20FT", supply: 10, demand: 7,  gap: -3 },
  { depot: "Moerdijk",             type: "40FT", supply: 17, demand: 17, gap: 0  },
  { depot: "Moerdijk",             type: "LCL",  supply: 4,  demand: 2,  gap: -2 },
  { depot: "Rotterdam ECT",        type: "20FT", supply: 10, demand: 5,  gap: -5 },
  { depot: "Rotterdam ECT",        type: "40FT", supply: 15, demand: 16, gap: 1  },
  { depot: "Rotterdam ECT",        type: "LCL",  supply: 7,  demand: 6,  gap: -1 },
  { depot: "Rotterdam Waalhaven",  type: "20FT", supply: 6,  demand: 8,  gap: 2  },
  { depot: "Rotterdam Waalhaven",  type: "40FT", supply: 18, demand: 10, gap: -8 },
  { depot: "Rotterdam Waalhaven",  type: "LCL",  supply: 5,  demand: 4,  gap: -1 },
];

const NEWS = [
  { icon: "▲", color: "#E87722", text: "Rotterdam throughput +4.2% this week" },
  { icon: "!", color: "#1C3F6E", text: "Antwerp congestion — dwell times +1.5 days" },
  { icon: "▲", color: "#E87722", text: "Belgian imports +3.1% Q4" },
  { icon: "▼", color: "#1C3F6E", text: "Fuel costs -6% — repositioning window open" },
];

function haversine(a, b) {
  const R = 6371, dLat=(b.lat-a.lat)*Math.PI/180, dLng=(b.lng-a.lng)*Math.PI/180;
  const h = Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return +(R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))).toFixed(1);
}

function buildContext() {
  const status = DEPOT_STATUS.map(r=>`${r.depot}|${r.type}|Supply:${r.supply}|Demand:${r.demand}|Gap:${r.gap>0?'+'+r.gap:r.gap}${r.gap>0?' SHORTAGE':r.gap<0?' SURPLUS':' BALANCED'}`).join('\n');
  const dn = Object.keys(DEPOTS);
  const dist = [];
  for(let i=0;i<dn.length;i++) for(let j=i+1;j<dn.length;j++) dist.push(`${dn[i]} → ${dn[j]}: ${haversine(DEPOTS[dn[i]],DEPOTS[dn[j]])} km`);
  return `You are a professional ECR (Empty Container Repositioning) routing assistant for the Rotterdam–Antwerp–Moerdijk logistics corridor, developed at Breda University of Applied Sciences.\n\nDEPOT STATUS:\n${status}\n\nDISTANCES:\n${dist.join('\n')}\n\nMARKET CONTEXT:\n- Rotterdam throughput +4.2%\n- Belgian imports +3.1% — Antwerp shortages expected\n- Antwerp congestion — dwell times +1.5 days\n- Fuel costs -6%\n\nBe concise and professional. Always state: recommended depot, distance km, gap reduction, reasoning.`;
}

const SUGGESTIONS = [
  "Where should a 40FT from Rotterdam Waalhaven go?",
  "Which depot needs containers most urgently?",
  "Best route for LCL from Moerdijk?",
  "How does Antwerp congestion affect routing?",
];

export default function App() {
  const [tab, setTab] = useState("chat");
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: "Good morning. I am your ECR routing assistant for the Rotterdam–Antwerp–Moerdijk corridor.\n\nI have live depot status, real distance data, and market intelligence to help you make optimal container repositioning decisions.\n\nHow can I assist you today?"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  async function send(q) {
    const question = q || input.trim();
    if (!question || loading) return;
    setInput("");
    const newMsgs = [...messages, { role:"user", content:question }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":"Bearer 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",
          "HTTP-Referer":"https://ecr-routing-assistant.vercel.app"
        },
        body: JSON.stringify({
          model:"meta-llama/llama-3.1-8b-instruct:free",
          max_tokens:800,
          messages:[
            {role:"system", content:buildContext()},
            ...newMsgs.map(m=>({role:m.role, content:m.content}))
          ]
        })
      });
const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || data.error?.message || JSON.stringify(data);
      setMessages(p=>[...p,{role:"assistant",content:reply}]);
    } catch { setMessages(p=>[...p,{role:"assistant",content:"Connection error. Please try again."}]); }
    setLoading(false);
  }

  const shortages = DEPOT_STATUS.filter(r=>r.gap>0).sort((a,b)=>b.gap-a.gap);
  const surpluses = DEPOT_STATUS.filter(r=>r.gap<0).sort((a,b)=>a.gap-b.gap);
  const depotNodes = [
    { name:"Rotterdam Waalhaven", x:160, y:65,  short:"RTM Waalhaven" },
    { name:"Rotterdam ECT",       x:75,  y:115, short:"RTM ECT" },
    { name:"Moerdijk",            x:230, y:150, short:"Moerdijk" },
    { name:"Antwerp Noord",       x:310, y:238, short:"ANT Noord" },
    { name:"Antwerp Deurganckdok",x:268, y:260, short:"ANT Deur." },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:640,fontFamily:"'Segoe UI',Arial,sans-serif",background:"#f5f6f8",borderRadius:8,overflow:"hidden",border:"1px solid #dde2e8"}}>
      <div style={{background:"#1C3F6E",padding:"0",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:34,height:34,background:"#E87722",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#fff",lineHeight:1.1}}>ECR Intelligence</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,0.6)",letterSpacing:"0.3px"}}>Breda University of Applied Sciences</div>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:2}}>
            {[{id:"chat",label:"Routing Chat"},{id:"status",label:"Depot Status"},{id:"map",label:"Network"}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 14px",border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:tab===t.id?"#E87722":"transparent",color:tab===t.id?"#fff":"rgba(255,255,255,0.65)",borderRadius:4}}>{t.label}</button>
            ))}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#4ade80"}}/>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Live data</span>
          </div>
        </div>
        <div style={{background:"rgba(0,0,0,0.2)",padding:"5px 20px",display:"flex",gap:28,overflowX:"auto",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          {NEWS.map((n,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
              <span style={{fontSize:11,color:n.color,fontWeight:700}}>{n.icon}</span>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.65)"}}>{n.text}</span>
            </div>
          ))}
        </div>
      </div>

      {tab==="chat" && <>
        <div style={{flex:1,overflowY:"auto",padding:"20px",display:"flex",flexDirection:"column",gap:14,background:"#f5f6f8"}}>
          {messages.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",gap:10,alignItems:"flex-start"}}>
              {m.role==="assistant" && (
                <div style={{width:34,height:34,borderRadius:6,background:"#E87722",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
                </div>
              )}
              <div style={{maxWidth:"72%",padding:"12px 16px",borderRadius:8,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",background:m.role==="user"?"#1C3F6E":"#ffffff",color:m.role==="user"?"#fff":"#2d3748",boxShadow:"0 1px 3px rgba(0,0,0,0.08)",borderTopLeftRadius:m.role==="assistant"?2:8,borderTopRightRadius:m.role==="user"?2:8}}>{m.content}</div>
              {m.role==="user" && (
                <div style={{width:34,height:34,borderRadius:6,background:"#E87722",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2,fontSize:14}}>👤</div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <div style={{width:34,height:34,borderRadius:6,background:"#E87722",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 7V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="7" y1="12" x2="17" y2="12"/></svg>
              </div>
              <div style={{padding:"12px 16px",borderRadius:8,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.08)",display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#1C3F6E",opacity:0.4,animation:`pulse 1s ${i*0.25}s infinite`}}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        <div style={{padding:"8px 16px",background:"#fff",borderTop:"1px solid #e2e8f0",display:"flex",gap:6,flexWrap:"wrap"}}>
          {SUGGESTIONS.map((s,i)=>(
            <button key={i} onClick={()=>send(s)} style={{fontSize:11,padding:"4px 12px",borderRadius:20,border:"1px solid #1C3F6E",background:"transparent",color:"#1C3F6E",cursor:"pointer",fontWeight:500}}>{s}</button>
          ))}
        </div>
        <div style={{padding:"12px 16px",background:"#fff",borderTop:"1px solid #e2e8f0",display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
            placeholder="Ask about container routing, depot status, or market conditions..."
            style={{flex:1,padding:"10px 14px",borderRadius:6,fontSize:13,border:"1px solid #cbd5e0",background:"#f8fafc",color:"#2d3748",outline:"none"}}/>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{padding:"10px 20px",borderRadius:6,border:"none",background:loading?"#cbd5e0":"#E87722",color:"#fff",fontSize:13,cursor:loading?"not-allowed":"pointer",fontWeight:600}}>Send</button>
        </div>
      </>}

      {tab==="status" && (
        <div style={{flex:1,overflowY:"auto",padding:20,display:"flex",gap:16,background:"#f5f6f8"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1C3F6E",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.8px",borderBottom:"2px solid #E87722",paddingBottom:6}}>Shortages</div>
            {shortages.map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",marginBottom:6,borderRadius:6,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",borderLeft:"3px solid #e53e3e"}}>
                <div>
                  <div style={{fontSize:13,color:"#1C3F6E",fontWeight:600}}>{r.depot}</div>
                  <div style={{fontSize:11,color:"#718096"}}>{r.type} · Supply {r.supply} · Demand {r.demand}</div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:"#e53e3e"}}>+{r.gap}</div>
              </div>
            ))}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1C3F6E",marginBottom:10,textTransform:"uppercase",letterSpacing:"0.8px",borderBottom:"2px solid #E87722",paddingBottom:6}}>Surpluses</div>
            {surpluses.map((r,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",marginBottom:6,borderRadius:6,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.06)",borderLeft:"3px solid #38a169"}}>
                <div>
                  <div style={{fontSize:13,color:"#1C3F6E",fontWeight:600}}>{r.depot}</div>
                  <div style={{fontSize:11,color:"#718096"}}>{r.type} · Supply {r.supply} · Demand {r.demand}</div>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:"#38a169"}}>{r.gap}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="map" && (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20,background:"#f5f6f8"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#1C3F6E",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>Rotterdam–Antwerp–Moerdijk Corridor</div>
          <svg width="100%" viewBox="0 0 420 320">
            {depotNodes.map((a,i)=>depotNodes.slice(i+1).map((b,j)=>(
              <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e0" strokeWidth="1" strokeDasharray="4"/>
            )))}
            {depotNodes.map((d,i)=>{
              const total = DEPOT_STATUS.filter(r=>r.depot===d.name).reduce((s,r)=>s+r.gap,0);
              const col = total>2?"#e53e3e":total<-2?"#38a169":"#E87722";
              return (
                <g key={i}>
                  <circle cx={d.x} cy={d.y} r={22} fill="#fff" stroke={col} strokeWidth="2.5"/>
                  <text x={d.x} y={d.y+1} textAnchor="middle" dominantBaseline="central" fontSize={12} fill={col} fontWeight="700">{total>0?'+'+total:total}</text>
                  <text x={d.x} y={d.y+32} textAnchor="middle" fontSize={10} fill="#4a5568" fontWeight="500">{d.short}</text>
                </g>
              );
            })}
            <g transform="translate(10,290)">
              <circle cx={8} cy={6} r={5} fill="#e53e3e"/><text x={18} y={6} dominantBaseline="central" fontSize={10} fill="#4a5568">Shortage</text>
              <circle cx={78} cy={6} r={5} fill="#38a169"/><text x={88} y={6} dominantBaseline="central" fontSize={10} fill="#4a5568">Surplus</text>
              <circle cx={148} cy={6} r={5} fill="#E87722"/><text x={158} y={6} dominantBaseline="central" fontSize={10} fill="#4a5568">Balanced</text>
            </g>
          </svg>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:0.25}50%{opacity:1}}`}</style>
    </div>
  );
}
