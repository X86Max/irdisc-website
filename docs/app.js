import { terminalRoute, focusTerminal } from './terminal.js';
import { renderClassic } from './classic.js';
const terminal = document.querySelector('.terminal');
const classic = document.querySelector('#classic');
let current, savedScroll=0, transition=0, renderId=0, lastRoute;
function mode() { return location.pathname.endsWith('/terminal.html') ? 'terminal' : 'classic'; }
async function render(focus=false, fromNavigation=false) {
  const request=++renderId; lastRoute=location.href;
  const next=mode();
  if (current==='terminal' && next!=='terminal') savedScroll=window.scrollY;
  terminal.hidden=next!=='terminal'; classic.hidden=next!=='classic';
  document.querySelector('#terminal-style').disabled=next!=='terminal';
  document.querySelector('#classic-style').disabled=next!=='classic';
  document.body.dataset.interface=next;
  document.title=next==='terminal'?'⇹ IRdisC Web Terminal':'IRdisC — IRC, discomplicated.';
  const changed=current!==next; current=next;
  if(next==='classic') {
    await renderClassic(location.hash.slice(1)||'home');
    if(request!==renderId)return;
    if(focus) document.querySelector('#classic-content').focus({preventScroll:true});
    window.scrollTo(0,0);
  } else {
    if (location.hash && (changed || fromNavigation)) terminalRoute();
    else window.scrollTo(0,savedScroll);
    focusTerminal();
  }
}
function navigate(url) {
  transition++; terminal.classList.remove('leaving');
  history.pushState(null,'',url); render(true,true);
}
document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[data-site],a[data-terminal]');
  if(!anchor || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault(); navigate(anchor.href);
});
window.addEventListener('popstate',()=>{transition++;terminal.classList.remove('leaving');render(true,true);});
// popstate covers back/forward; explicit fragment changes also route.
window.addEventListener('hashchange',()=>{if(lastRoute===location.href)return;render(true,true);});
window.addEventListener('irdisc:gui',async()=>{
  const token=++transition;
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    terminal.classList.add('leaving'); await new Promise(resolve=>setTimeout(resolve,800));
  }
  if(token!==transition) return;
  navigate(new URL('./index.html',location.href));
});
render();
