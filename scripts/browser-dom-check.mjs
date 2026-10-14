// Browser-level structural and scroll regression check.
// Injected into a temporary copy of the built Home page inside GitHub Actions.
// It is NOT shipped in the production dist/ deployment.
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);
const original=await readFile(new URL('index.html',root),'utf8');
const test=String.raw`
<script>
window.addEventListener('load',()=>{
  setTimeout(()=>{
    const checks={};
    const page=document.querySelector('.card.card-page');
    const nav=page?.querySelector(':scope > .card.card-nav');
    const main=page?.querySelector(':scope > .card.card-main');
    const footer=page?.querySelector(':scope > .card.card-footer');
    checks.semanticCards=Boolean(page&&nav&&main&&footer);
    checks.directSections=(main?.querySelectorAll(':scope > .card.card-section').length||0)>=8;
    checks.noBlockNodes=!document.querySelector('.block,.q-entry,.b-query');
    const work=main?.querySelector('.card.card-query');
    const recordCards=work?[...work.querySelectorAll(':scope > .card.card-record')]:[];
    checks.recordCards=recordCards.length>=4 && recordCards.every(card=>
      card.querySelectorAll(':scope > .item').length>=3 &&
      card.querySelector(':scope > .item.item-image') &&
      card.querySelector(':scope > .item.item-text')
    );
    const figure=document.querySelector('.item.item-image');
    checks.defaultClipping=Boolean(figure&&getComputedStyle(figure).overflowY==='clip');
    let contained=false;
    for(let element=document.elementFromPoint(innerWidth/2,innerHeight/2);element;element=element.parentElement)
      if(getComputedStyle(element).overscrollBehaviorY==='contain')contained=true;
    checks.noScrollTrap=!contained;
    const rootScroll=document.scrollingElement;
    checks.longDocument=rootScroll.scrollHeight>innerHeight+150;
    scrollTo(0,500);
    checks.documentScrolls=scrollY>100;
    const hero=document.querySelector('.card-hero');
    checks.heroHasTwoTracks=Boolean(hero&&getComputedStyle(hero).gridTemplateColumns.split(' ').filter(Boolean).length===2);
    const failures=Object.keys(checks).filter(k=>!checks[k]);
    const status=failures.length?'TA_DOM_FAIL '+JSON.stringify(checks):'TA_DOM_OK '+JSON.stringify(checks);
    const pre=document.createElement('pre');pre.id='ta-dom-result';pre.textContent=status;document.body.append(pre);
  },200);
});
</script>
`;
const output=original.replace('</body>',test+'</body>');
if(output===original)throw Error('The generated HTML has no </body>');
await writeFile(new URL('__layoutcheck.html',root),output);
