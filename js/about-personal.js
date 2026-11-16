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
  /* bigger screens: rather than scrolling past, each fact's photo glitches in and holds still at a random spot out toward the screen's edge, clear of the words,
     once the text is pinned in place, and glitches out when the next fact takes over. Photos are only ever seen on the section's black: as it scrolls away they are cut off at its edge. It may overlap the words, just never sit centred on them. The scrolling photos stay in the page, hidden, as the markers that say when each fact takes over. Phones keep the scrolling photos */
  var EDGE='4rem';     /* from the screen's edge to the photo */
  var MAX_W=480;       /* px: the widest, until it has loaded and its size in the page is known */
  var MAX_H=.7;        /* the tallest a photo gets, as a share of the room between the nav and the bottom */
  var TOP=96;          /* px: photos stay below the nav */
  var SIZE=[.85,1];    /* each photo's size, as a random share of its size in the page */
  var DRIFT=48;        /* px: the furthest in from EDGE a photo may land */
  var IN={ms:650,block:28,tear:40,flicker:true},OUT={ms:320,block:16,tear:26};
  function still(wrap,pin,marks,n){
    var mq=window.matchMedia('(min-width: 768px)');
    var css=document.createElement('style');
    css.textContent='html.nt-pstill .personal_image_wrapper img{visibility:hidden !important}'+
      '.nt-pstage{position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;z-index:5}'+
      '.nt-pstage img{position:absolute;max-width:none;object-fit:cover;visibility:hidden}.nt-pstage img.is-on{visibility:visible}';
    document.head.appendChild(css);
    /* the stage is fixed to the screen, so a photo never moves once it is in; photos show only while the text is pinned in place (behind the text, in front of the section) */
    var box=document.createElement('div');box.className='nt-pstage';box.setAttribute('aria-hidden','true');
    document.body.appendChild(box);
    /* everything is cut to the section's black: the photos, and the glitch's own layers (the site's image effects draw those on the page, so they are moved into the stage) */
    var sec=wrap.closest('.personal_wrapper_2')||marks[0].closest('section')||wrap.parentNode,catchUntil=0,watching=0;
    function clip(){
      var r=sec.getBoundingClientRect(),vh=innerHeight,t=Math.max(0,r.top),b=Math.min(vh,r.bottom);
      box.style.clipPath='inset('+Math.round(t)+'px 0 '+Math.round(Math.max(0,vh-b))+'px 0)';
    }
    var catcher=new MutationObserver(function(list){
      if(performance.now()>catchUntil){catcher.disconnect();watching=0;return;}
      list.forEach(function(m){[].forEach.call(m.addedNodes,function(c){if(c.tagName==='CANVAS')box.appendChild(c);});});
    });
    function glitchIt(im,o){
      /* any glitch layer the site's image effects add to the page in the next moment is ours: it moves into the stage, so it sits under the words and is cut to the section with the screenshots */
      catchUntil=performance.now()+1200;
      if(!watching){watching=1;catcher.observe(document.body,{childList:true});}
      window.__ntGlitch(im,o);
    }
    var sets=[];
    for(var i=0;i<n;i++){
      var imgs=[].slice.call(marks[i].querySelectorAll('img'));
      sets.push(imgs.map(function(o,k){
        var c=document.createElement('img');c.alt='';c.decoding='async';
        c.src=o.currentSrc||o.src;
        return {img:c,src:o};
      }));
    }
    var on=-1,timers=[];
    function edge(){var t=document.createElement('div');t.style.width=EDGE;box.appendChild(t);var v=t.getBoundingClientRect().width;t.remove();return v;}
    /* where a fact's words actually sit (each line measured tight to its letters), from a hidden copy so the fact on screen is left alone */
    var probe=null;
    function textBox(i){
      if(!probe){probe=pin.cloneNode(true);probe.removeAttribute('data-nt-fact');probe.style.cssText='position:absolute;left:0;right:0;top:0;visibility:hidden;pointer-events:none';probe.setAttribute('aria-hidden','true');wrap.appendChild(probe);}
      var pt=probe.querySelector('.personal_text');
      pt.children[0].textContent=window.__ntFacts[i].label;pt.children[1].textContent=window.__ntFacts[i].text;
      var L=1e9,R=-1e9,T=1e9,B=-1e9,w=document.createTreeWalker(pt,NodeFilter.SHOW_TEXT),t,r=document.createRange();
      while((t=w.nextNode())){r.selectNodeContents(t);[].forEach.call(r.getClientRects(),function(q){if(!q.width)return;L=Math.min(L,q.left);R=Math.max(R,q.right);T=Math.min(T,q.top);B=Math.max(B,q.bottom);});}
      /* as it sits once pinned */
      var o=wrap.getBoundingClientRect(),dy=pin.getBoundingClientRect().top-probe.getBoundingClientRect().top-o.top+pinTop();
      return {left:L,right:R,top:T+dy,bottom:B+dy};
    }
    /* each time a fact comes up, its photo lands somewhere new: a random side, out near the screen's edge (EDGE in, plus up to DRIFT more), at a random height and a
       random size close to its size in the page. It may overlap the words, but never with them running through its middle. A pair (fact three) takes one side each.
       The roll is kept, so a resize only refits it */
    function roll(i){
      var flip=Math.random()<.5;
      sets[i].forEach(function(p,k){p.r={side:sets[i].length>1?(k+(flip?1:0))%2:(Math.random()<.5?0:1),size:SIZE[0]+Math.random()*(SIZE[1]-SIZE[0]),x:Math.random(),ys:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0].map(Math.random)};});
    }
    function lay(i){
      var e=edge(),vw=document.documentElement.clientWidth,vh=innerHeight,tb=textBox(i);
      var top=Math.max(e,TOP),bot=vh-e;
      sets[i].forEach(function(p,k){
        var R=p.r,r=p.src.getBoundingClientRect(),nw=p.src.naturalWidth||r.width||1,nh=p.src.naturalHeight||r.height||1,ratio=nh/nw;
        var w=Math.min((r.width||MAX_W)*R.size,vw*.4,(bot-top)*MAX_H/ratio,(bot-top)/ratio),h=w*ratio;
        var x=R.side===0?e+DRIFT*R.x:vw-e-w-DRIFT*R.x;
        /* the words may cross the photo's outer parts, but not its middle (the middle third each way) */
        function bad(y){
          var mx0=x+w/3,mx1=x+w*2/3,my0=y+h/3,my1=y+h*2/3;
          return tb.right>mx0&&tb.left<mx1&&tb.bottom>my0&&tb.top<my1;
        }
        var y=null,span=Math.max(0,bot-top-h);
        for(var j=0;j<R.ys.length&&y===null;j++){var t=top+span*R.ys[j];if(!bad(t))y=t;}
        /* nowhere clear at that height: as far from the words as it can get */
        if(y===null)y=(tb.top+tb.bottom)/2-top>bot-(tb.top+tb.bottom)/2?top:bot-h;
        var s=p.img.style;s.width=Math.round(w)+'px';s.height=Math.round(h)+'px';s.left=Math.round(x)+'px';s.top=Math.round(y)+'px';
      });
    }
    function hide(i){
      if(i<0)return;
      sets[i].forEach(function(p){
        var im=p.img;if(!im.parentNode)return;
        if(window.__ntGlitch&&!reduce){glitchIt(im,OUT);timers.push(setTimeout(function(){im.classList.remove('is-on');},OUT.ms*.45),setTimeout(function(){if(on!==i)im.remove();},OUT.ms+200));}
        else im.remove();
      });
    }
    function show(i){
      if(!mq.matches)return;
      if(i===on)return;
      var was=on;on=i;hide(was);
      if(i<0)return;
      roll(i);
      sets[i].forEach(function(p){
        var im=p.img;
        var go=function(){
          if(on!==i)return;
          im.remove();im.classList.remove('is-on');box.appendChild(im);lay(i);
          requestAnimationFrame(function(){if(on!==i)return;im.classList.add('is-on');if(window.__ntGlitch&&!reduce)glitchIt(im,IN);});
        };
        if(im.complete&&im.naturalWidth)go();else im.addEventListener('load',go,{once:true});
      });
    }
    function pinTop(){return parseFloat(getComputedStyle(wrap).top)||0;}
    /* photos come in once the text is pinned at its sticky spot, and stay as the section scrolls away (cut to its black), until it has gone */
    function pinned(){return wrap.getBoundingClientRect().top<pinTop()+2&&sec.getBoundingClientRect().bottom>0;}
    var want=-1;
    function sync(){clip();show(pinned()?want:-1);}
    /* the hidden scrolling photos are held (nt-hold), so the site's reveal glitch never plays on them as they pass; phones let them go again */
    var holder=marks[0].parentNode;
    function check(){
      document.documentElement.classList.toggle('nt-pstill',mq.matches);
      if(mq.matches)holder.classList.add('nt-hold');
      else{if(window.__ntRelease)window.__ntRelease(holder);else holder.classList.remove('nt-hold');if(on>=0){hide(on);on=-1;}}
    }
    check();
    var rt=0;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){check();if(on>=0)lay(on);},150);});
    return {show:function(i){want=i;sync();},sync:sync};
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
    window.__ntFacts=facts;

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

    var stage=still(wrap,pin,marks,n);

    /* each fact takes over once its photo's top edge has come a fifth of the way up the screen (SWITCH_AT is measured from the top, so 0.8); -1 until the first photo gets there */
    var SWITCH_AT=0.8;
    var cur=-2;
    function update(){
      if(stage)stage.sync();
      var mid=innerHeight*SWITCH_AT,idx=-1;
      for(var i=0;i<n;i++){if(marks[i].getBoundingClientRect().top<mid)idx=i;}
      if(idx===cur)return;
      cur=idx;
      var f=idx<0?{label:'',text:''}:facts[idx];
      pin.setAttribute('data-nt-fact',idx+1);
      morphLabel(f.label);morphText(f.text);
      if(stage)stage.show(idx);
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
