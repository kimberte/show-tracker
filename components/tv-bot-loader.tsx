export default function TvBotLoader({label="Finding great shows…"}:{label?:string}) {
 return <div className="tvbot-loading" role="status" aria-live="polite">
 <svg className="tvbot" viewBox="0 0 96 100" width="74" height="78" aria-hidden="true">
 <path d="M32 12 22 3 M64 12 74 3" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
 <rect x="8" y="13" width="80" height="65" rx="17" fill="#f59e0b"/>
 <rect x="16" y="21" width="64" height="49" rx="12" fill="#141821"/>
 <g className="tvbot-eyes"><rect x="29" y="37" width="9" height="15" rx="4.5" fill="#fff"/><rect x="58" y="37" width="9" height="15" rx="4.5" fill="#fff"/></g>
 <path d="M41 57 Q48 64 55 57" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>
 <path d="M29 80v9 M67 80v9" stroke="#f59e0b" strokeWidth="6" strokeLinecap="round"/>
 </svg><span>{label}</span></div>;
}
