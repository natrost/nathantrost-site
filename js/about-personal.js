(function(){
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gooCount=0;
  /* a gooey filter whose strength can be dialed from 0 (off) up, so letters flow into each other mid-morph and still end crisp */
  function goo(){
    var id='nt-goo-p'+(++gooCount),d=document.createElement('div');
    d.innerHTML='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="'+id+'" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></svg>';
    var svg=d.firstChild;document.body.appendChild(svg);
    var m=svg.querySelector('feColorMatrix');
    return {id:id,set:function(k){m.setAttribute('values','1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 '+(1+k*10).toFixed(2)+' '+(-k*4).toFixed(2));}};
  }
  /* turns an element's text into two stacked spans that can melt from one string into another */
  function morpher(el){
    el.classList.add('nt-morph');
    var a=document.createElement('span'),b=document.createElement('span');
    el.textContent='';el.appendChild(a);el.appendChild(b);
    var raf=0,shown='',g=goo();
    function blur(f){return f>=1?'none':'blur('+Math.min(3/Math.max(f,.001)-3,30)+'px)';}
    function settle(to){a.textContent=to;b.textContent='';el.classList.remove('is-morphing');el.style.filter=a.style.filter=a.style.opacity=b.style.filter=b.style.opacity='';}
    return function(to){
      cancelAnimationFrame(raf);
      var from=shown;shown=to;
      if(reduce||from===to){settle(to);return;}
      a.textContent=from;b.textContent=to;el.classList.add('is-morphing');
      var t0=performance.now(),dur=1100;
      /* both texts blur through each other while the goo peaks mid-way, then fades back to nothing */
      (function step(now){
        var f=Math.min(1,(now-t0)/dur),k=Math.sin(Math.PI*f);
        b.style.filter=blur(f);b.style.opacity=Math.pow(f,.4);
        a.style.filter=blur(1-f);a.style.opacity=Math.pow(1-f,.4);
        g.set(k);el.style.filter='url(#'+g.id+') blur('+(1.4*k).toFixed(2)+'px)';
        if(f<1){raf=requestAnimationFrame(step);return;}
        settle(to);
      })(t0);
    };
  }
  function init(){
    var wrap=document.querySelector('.personal_text_wrapper');
    var photos=document.querySelector('.personal_image_wrapper');
    if(!wrap||!photos||wrap.querySelector('.nt-personal'))return;
    var inners=[].slice.call(wrap.querySelectorAll(':scope > .personal_text_inner'));
    var marks=[].slice.call(photos.children);
    var n=Math.min(inners.length,marks.length);if(!n)return;
    var facts=inners.slice(0,n).map(function(inner){
      var t=inner.querySelector('.personal_text');
      return {label:t.children[0].textContent.trim(),text:t.children[1].textContent.trim()};
    });

    /* a clean copy of the first fact, without Webflow interactions or the site-wide melt */
    var pin=inners[0].cloneNode(true);
    [pin].concat([].slice.call(pin.querySelectorAll('*'))).forEach(function(e){
      e.removeAttribute('data-w-id');e.removeAttribute('style');
      e.classList.remove('nt-melt','nt-melt-soft','is-in','is-done');
    });
    pin.classList.add('nt-personal');
    var pt=pin.querySelector('.personal_text');
    var morphLabel=morpher(pt.children[0]),morphText=morpher(pt.children[1]);
    wrap.appendChild(pin);
    /* phones: the facts sit 3.5rem higher, so the five-line ones stay in the upper part of the screen; fact four's lines are balanced, so its last word never sits alone on a line (side padding just moved the lone word around) */
    var css=document.createElement('style');
    css.textContent='@media (max-width:767px){html body .nt-personal{padding-top:calc(38vh - 3.5rem) !important}html body .nt-personal[data-nt-fact="4"] .personal_text > :last-child > span{text-wrap:balance}}';
    document.head.appendChild(css);
    wrap.classList.add('nt-personal-on');

    /* each fact takes over once its photo's top edge has come a fifth of the way up the screen (SWITCH_AT is measured from the top, so 0.8); -1 until the first photo gets there */
    var SWITCH_AT=0.8;
    var cur=-2;
    function update(){
      var mid=innerHeight*SWITCH_AT,idx=-1;
      for(var i=0;i<n;i++){if(marks[i].getBoundingClientRect().top<mid)idx=i;}
      if(idx===cur)return;
      cur=idx;
      var f=idx<0?{label:'',text:''}:facts[idx];
      pin.setAttribute('data-nt-fact',idx+1);
      morphLabel(f.label);morphText(f.text);
    }
    /* checks every frame only while the page is moving: scrolling, resizing, or for a moment after, while Webflow's interactions finish easing things into place. At rest it does nothing */
    var awake=0,until=0;
    function wake(){until=performance.now()+1500;if(!awake){awake=1;requestAnimationFrame(function loop(now){update();if(now<until)requestAnimationFrame(loop);else awake=0;});}}
    ['scroll','resize','wheel','touchmove','keydown','load'].forEach(function(n){addEventListener(n,wake,{passive:true});});
    /* and when the page changes height, as images load or text reveals */
    if('ResizeObserver' in window)new ResizeObserver(wake).observe(document.body);
    wake();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
