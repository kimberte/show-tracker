export default function TvBotMark({size=32}:{size?:number}) {
 return <svg viewBox="0 0 96 100" width={size} height={size*100/96} aria-hidden="true" focusable="false" style={{display:"block",flexShrink:0}}>
 <path d="M32 12 22 3 M64 12 74 3" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round"/>
 <rect x="8" y="13" width="80" height="65" rx="17" fill="#f59e0b"/>
 <rect x="16" y="21" width="64" height="49" rx="12" fill="#141821"/>
 <rect x="29" y="37" width="9" height="15" rx="4.5" fill="#fff"/><rect x="58" y="37" width="9" height="15" rx="4.5" fill="#fff"/>
 <path d="M41 57 Q48 64 55 57" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>
 <path d="M29 80v9 M67 80v9" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round"/>
 </svg>;
}
