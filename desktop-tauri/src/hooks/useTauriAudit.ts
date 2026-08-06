import{useEffect,useState}from'react';
import{clearTauriAudit,loadTauriAudit,subscribeTauriAudit}from'../services/tauriAudit';
export function useTauriAudit(){const[entries,setEntries]=useState(loadTauriAudit);useEffect(()=>subscribeTauriAudit(()=>setEntries(loadTauriAudit())),[]);return{entries,clear:clearTauriAudit}}
