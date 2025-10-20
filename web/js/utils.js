
/* Utility helpers */
export function groupBy(arr, keyFn){
  return arr.reduce((m, x)=>{
    const k = keyFn(x); (m[k] ||= []).push(x); return m;
  }, {});
}
export function debounce(fn, wait=200){
  let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
}
export function uniq(arr){ return [...new Set(arr)]; }
export function byId(id){ return document.getElementById(id); }
