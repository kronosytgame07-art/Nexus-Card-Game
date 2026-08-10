import { Suspense, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import GoogleAccountSection from '../GoogleAccount';

export default function GoogleOptionsPortal(){
  const location=useLocation();
  const [host,setHost]=useState<Element|null>(null);
  useEffect(()=>{
    if(location.pathname!=='/paramètres'){setHost(null);return;}
    const find=()=>{
      const sections=[...document.querySelectorAll('#root section')];
      setHost(sections.find(el=>el.textContent?.includes('Paramètres')||el.textContent?.includes('Options'))??sections[0]??null);
    };
    find();
    const observer=new MutationObserver(find);
    observer.observe(document.getElementById('root')??document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[location.pathname]);
  if(!host)return null;
  return createPortal(<Suspense fallback={null}><div className="options-google-account"><GoogleAccountSection/></div></Suspense>,host);
}
