(function(){
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function host(cls){
    var h=document.createElement('div');h.className=cls;h.setAttribute('aria-hidden','true');
    var s=document.createElement('div');s.className='nt-stick';h.appendChild(s);return h;
  }
  var gooCount=0;
  /* a gooey filter whose strength can be dialed from 0 (off) up, so letters flow into each other mid-morph and still end crisp */
  function goo(){
    var id='nt-goo-h'+(++gooCount),d=document.createElement('div');
    d.innerHTML='<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="'+id+'" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0"/></filter></svg>';
    var svg=d.firstChild;document.body.appendChild(svg);
    var m=svg.querySelector('feColorMatrix');
    return {id:id,set:function(k){m.setAttribute('values','1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 '+(1+k*10).toFixed(2)+' '+(-k*4).toFixed(2));}};
  }
  var MELT_MS=1100;
  function blur(f){return f>=1?'none':'blur('+Math.min(3/Math.max(f,.001)-3,30)+'px)';}
  /* turns an element's text into two stacked spans that can melt from one string into another */
  function morpher(el){
    el.classList.add('nt-morph');
    var a=document.createElement('span'),b=document.createElement('span');
    el.textContent='';el.appendChild(a);el.appendChild(b);
    var raf=0,shown='',g=goo();
    function settle(to){a.textContent=to;b.textContent='';el.classList.remove('is-morphing');el.style.filter=a.style.filter=a.style.opacity=b.style.filter=b.style.opacity='';}
    return function(to){
      cancelAnimationFrame(raf);
      var from=shown;shown=to;
      if(reduce||from===to){settle(to);return;}
      a.textContent=from;b.textContent=to;el.classList.add('is-morphing');
      var t0=performance.now();
      /* both texts blur through each other while the goo peaks mid-way, then fades back to nothing */
      (function step(now){
        var f=Math.min(1,(now-t0)/MELT_MS),k=Math.sin(Math.PI*f);
        b.style.filter=blur(f);b.style.opacity=Math.pow(f,.4);
        a.style.filter=blur(1-f);a.style.opacity=Math.pow(1-f,.4);
        g.set(k);el.style.filter='url(#'+g.id+') blur('+(1.4*k).toFixed(2)+'px)';
        if(f<1){raf=requestAnimationFrame(step);return;}
        settle(to);
      })(t0);
    };
  }
  /* bigger screens: rather than floating past, two of each project's screenshots (S_PER) glitch in and hold still once the stage is pinned, one above the headline and one
     below it, on opposite sides out toward the screen's edges (which goes where is random), and glitch out when the next project takes over. They may overlap each other a little (OVERLAP) and the
     headline's edges, but never sit centred on the words, and they stay off the button and the project labels. They are only ever seen on the section: as it scrolls away they are cut off at its edge. The floating screenshots stay
     in the page, hidden, so the scroll still runs as before. Phones keep the floating screenshots */
  var S_PER=2;         /* screenshots shown per project: the first ones in the page */
  var S_EDGE='4rem';   /* from the screen's edge to the nearest screenshots */
  var S_DRIFT=64;      /* px: how much further in than S_EDGE a screenshot may land, on its first tries */
  var S_SIZE=[.85,1];  /* each screenshot's size, as a random share of its size in the page */
  var S_MAX_H=.42;     /* the tallest a screenshot gets, as a share of the room between the nav and the bottom (two stack, one above the other) */
  var S_TOP=96;        /* px: screenshots stay below the nav */
  var OVERLAP=.3;      /* the most of the smaller screenshot two may share */
  var S_CLEAR=16;      /* px kept clear around the button and the labels */
  var S_IN={ms:650,block:28,tear:40,flicker:true},S_OUT={ms:320,block:16,tear:26};
  function stills(wrap,groups,title,btn,dotWrap,stick){
    var mq=window.matchMedia('(min-width: 768px)'),n=groups.length;
    var css=document.createElement('style');
    css.textContent='html.nt-hstill .favorites_wrapper_1 .fav_images img{visibility:hidden !important}'+
      '.nt-hstage{position:fixed;left:0;top:0;width:100vw;height:100vh;overflow:hidden;pointer-events:none;z-index:40}'+
      '.nt-hstage img{position:absolute;max-width:none;object-fit:cover;visibility:hidden}.nt-hstage img.is-on{visibility:visible}';
    document.head.appendChild(css);
    /* fixed to the screen so a screenshot never moves once it is in; it sits in the section just under the title stage, so the words stay on top */
    var box=document.createElement('div');box.className='nt-hstage';box.setAttribute('aria-hidden','true');wrap.insertBefore(box,stick.parentNode);
    var sets=groups.map(function(g){return g.imgs.map(function(o){var c=document.createElement('img');c.alt='';c.decoding='async';c.src=o.currentSrc||o.src;return {img:c,src:o};});});
    var sec=wrap,catchUntil=0,watching=0;
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
    function edge(){var t=document.createElement('div');t.style.width=S_EDGE;box.appendChild(t);var v=t.getBoundingClientRect().width;t.remove();return v;}
    function tight(el){
      if(!el)return null;
      var L=1e9,R=-1e9,T=1e9,B=-1e9,w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),t,r=document.createRange();
      while((t=w.nextNode())){r.selectNodeContents(t);[].forEach.call(r.getClientRects(),function(q){if(!q.width)return;L=Math.min(L,q.left);R=Math.max(R,q.right);T=Math.min(T,q.top);B=Math.max(B,q.bottom);});}
      return R>L?{left:L,right:R,top:T,bottom:B}:null;
    }
    function grow(r,m){return r?{left:r.left-m,right:r.right+m,top:r.top-m,bottom:r.bottom+m}:null;}
    function area(a,b){var w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return w>0&&h>0?w*h:0;}
    /* each time a project comes up its screenshots are dealt new spots: sides alternate from a random start, and each one tries random spots near its edge first, then
       anywhere, keeping the one that breaks the fewest rules. The roll is kept, so a resize only refits it */
    function roll(i){
      /* the two take opposite sides, and which one goes on the left is random */
      var first=Math.random()<.5?0:1;
      sets[i].forEach(function(p,k){var tries=[];for(var j=0;j<120;j++)tries.push([Math.random(),Math.random()]);p.r={side:(k+first)%2,size:S_SIZE[0]+Math.random()*(S_SIZE[1]-S_SIZE[0]),tries:tries};});
    }
    function lay(i){
      var e=edge(),vw=document.documentElement.clientWidth,vh=innerHeight,top=Math.max(e,S_TOP),bot=vh-e;
      var words=[tight(title.querySelector('.work_samples_text')),tight(title.querySelector('.title_text'))].filter(Boolean);
      var keep=[btn&&grow(btn.getBoundingClientRect(),S_CLEAR),grow(dotWrap.getBoundingClientRect(),S_CLEAR)].filter(function(r){return r&&r.right>r.left;});
      var placed=[];
      sets[i].forEach(function(p,k){
        var R=p.r,o=p.src,nw=o.naturalWidth||p.img.naturalWidth||16,nh=o.naturalHeight||p.img.naturalHeight||10,ratio=nh/nw;
        var w=Math.min((o.offsetWidth||440)*R.size,vw*.4,(bot-top)*S_MAX_H/ratio),h=w*ratio;
        /* the first one sits above the headline (its middle no lower than the headline's top), the second below (its middle no higher than the headline's bottom) */
        var hb=words[0]||{top:vh/2,bottom:vh/2},y0=top,y1=bot-h;
        if(k===0)y1=Math.min(y1,hb.top-h/2);else y0=Math.max(y0,hb.bottom-h/2);
        if(y1<y0){if(k===0)y1=y0;else y0=y1;}
        var best=null,bestBad=1e9;
        for(var j=0;j<R.tries.length&&bestBad>0;j++){
          var a=R.tries[j][0],b=R.tries[j][1],x;
          if(j<80)x=R.side===0?e+S_DRIFT*a:vw-e-w-S_DRIFT*a;
          else x=e+(vw-2*e-w)*a;
          var y=y0+(y1-y0)*b,box={left:x,top:y,right:x+w,bottom:y+h};
          var mid={left:x+w/3,right:x+w*2/3,top:y+h/3,bottom:y+h*2/3},bad=0;
          words.forEach(function(t){if(area(mid,t)>0)bad+=10;});
          keep.forEach(function(k){if(area(box,k)>0)bad+=10;});
          placed.forEach(function(q){var s=area(box,q)/Math.min(w*h,(q.right-q.left)*(q.bottom-q.top));if(s>OVERLAP)bad+=1+s;});
          if(j>=80)bad+=.5;
          if(bad<bestBad){bestBad=bad;best=box;}
        }
        placed.push(best);
        var s=p.img.style;s.width=Math.round(w)+'px';s.height=Math.round(h)+'px';s.left=Math.round(best.left)+'px';s.top=Math.round(best.top)+'px';
      });
    }
    var on=-1,want=-1;
    function hide(i){
      if(i<0)return;
      sets[i].forEach(function(p){
        var im=p.img;if(!im.parentNode)return;
        if(window.__ntGlitch&&!reduce){glitchIt(im,S_OUT);setTimeout(function(){im.classList.remove('is-on');},S_OUT.ms*.45);setTimeout(function(){if(on!==i)im.remove();},S_OUT.ms+200);}
        else im.remove();
      });
    }
    function ready(i){return sets[i].every(function(p){return p.img.complete&&p.img.naturalWidth;});}
    function show(i){
      if(!mq.matches||i===on)return;
      var was=on;on=i;hide(was);
      if(i<0)return;
      roll(i);
      /* all of a project's screenshots are placed together, once they have all loaded, so none of them lands on another */
      var go=function(){
        if(on!==i||!ready(i))return;
        sets[i].forEach(function(p){p.img.remove();p.img.classList.remove('is-on');box.appendChild(p.img);});
        lay(i);
        sets[i].forEach(function(p,k){setTimeout(function(){if(on!==i)return;p.img.classList.add('is-on');if(window.__ntGlitch&&!reduce)glitchIt(p.img,S_IN);},k*90);});
      };
      if(ready(i))go();else sets[i].forEach(function(p){p.img.addEventListener('load',go,{once:true});});
    }
    /* screenshots come in once the stage is pinned, and stay as the section scrolls away (cut to it), until it has gone */
    function pinned(){return stick.getBoundingClientRect().top<2&&wrap.getBoundingClientRect().bottom>0;}
    /* the first-visit intro lets go of everything held on the page when it ends, these included, so they are held again as the page moves (they are far below the intro) */
    function hold(){if(mq.matches&&!document.documentElement.classList.contains('nt-intro'))groups.forEach(function(g){if(g.block)g.block.classList.add('nt-hold');});}
    function sync(){hold();clip();show(pinned()?want:-1);}
    /* the hidden floating screenshots are held (nt-hold), so the site's reveal glitch never plays on them as they pass; phones let them go again */
    function check(){
      document.documentElement.classList.toggle('nt-hstill',mq.matches);
      groups.forEach(function(g){
        if(!g.block)return;
        if(mq.matches)g.block.classList.add('nt-hold');
        else if(window.__ntRelease)window.__ntRelease(g.block);else g.block.classList.remove('nt-hold');
      });
      if(!mq.matches&&on>=0){hide(on);on=-1;}
    }
    check();
    var rt=0;addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){check();if(on>=0&&ready(on))lay(on);},150);});
    return {show:function(i){want=i;sync();},sync:sync};
  }
  function init(){
    var wrap=document.querySelector('.favorites_wrapper_1');
    if(!wrap||wrap.querySelector('.nt-stage'))return;
    var cards=[].slice.call(wrap.querySelectorAll('.favorites_bg_image'));
    var texts=[].slice.call(wrap.querySelectorAll('.fav_text'));
    var n=Math.min(cards.length,texts.length);if(!n)return;
    var projects=texts.slice(0,n).map(function(t){
      var eb=t.querySelector('.title_text'),hl=t.querySelector('.work_samples_text'),btn=t.querySelector('a');
      return {eyebrow:eb?eb.textContent.trim():'',headline:hl?hl.textContent.trim():'',headClass:hl?hl.className:'',href:btn?btn.getAttribute('href'):'#'};
    });

    /* cards sit under the floating screenshots, the title sits above them */
    var blurHost=host('nt-blurbg'),cardHost=host('nt-stage'),stage=host('nt-stage nt-stage-text');
    var blurs=[],stageCards=[];
    cards.slice(0,n).forEach(function(c){
      var m=getComputedStyle(c).backgroundImage.match(/url\((["']?)(.*?)\1\)/);
      var l=document.createElement('div');l.className='nt-blurbg-layer';
      if(m)l.style.backgroundImage='url("'+m[2]+'")';
      blurHost.firstChild.appendChild(l);blurs.push(l);
      var cc=c.cloneNode(true);cc.removeAttribute('data-w-id');cc.removeAttribute('style');
      cardHost.firstChild.appendChild(cc);stageCards.push(cc);
    });
    var title=texts[0].querySelector('.favorites_title_wrapper').cloneNode(true);
    title.removeAttribute('style');
    [].forEach.call(title.querySelectorAll('[data-w-id],[style]'),function(e){e.removeAttribute('data-w-id');e.removeAttribute('style');});
    stage.firstChild.appendChild(title);
    stage.removeAttribute('aria-hidden');
    var hl=title.querySelector('.work_samples_text'),eb=title.querySelector('.title_text'),btn=title.querySelector('a');
    var morphHead=hl?morpher(hl):function(){},morphEyebrow=eb?morpher(eb):function(){};

    /* a project's block near the end of the section would scroll the backdrop off the screen, so any block with less than a screen of section below its top gets a scroll margin that stops the scroll with the section's bottom at the screen's bottom. This covers the labels and links to the project's #id alike */
    function fitStops(){
      var end=wrap.getBoundingClientRect().bottom;
      texts.slice(0,n).forEach(function(t){
        var el=t.nextElementSibling;
        if(!el)return;
        var over=el.getBoundingClientRect().top+innerHeight-end;
        el.style.scrollMarginTop=over>0?over+'px':'';
      });
    }
    function isOff(el){return Math.abs(el.getBoundingClientRect().top-(parseFloat(el.style.scrollMarginTop)||0))>4;}

    /* clicking a label scrolls to that project's own block, the same place its X on the project page lands. Images load during the scroll and can move the block, so it checks again when the scroll ends; scrolling by hand cancels that */
    var scrollToken=0,jumping=-1;
    function goTo(i){
      var el=texts[i].nextElementSibling;
      if(!el)return;
      var token=++scrollToken;
      /* the title, card and backdrop go straight to the clicked project in one melt and hold there while the page scrolls past the ones in between */
      jumping=i;show(i);
      /* browsers that never say the scroll has ended let go after a moment anyway */
      setTimeout(function(){if(token===scrollToken&&jumping===i){jumping=-1;wake();}},2500);
      fitStops();
      el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
      addEventListener('scrollend',function(){
        if(token!==scrollToken)return;
        jumping=-1;
        fitStops();
        if(isOff(el))el.scrollIntoView({behavior:'auto',block:'start'});
        wake();
      },{once:true});
    }
    /* scrolling by hand mid-jump hands the stage back to the scroll */
    function cancelScroll(){scrollToken++;if(jumping>=0){jumping=-1;wake();}}
    addEventListener('wheel',cancelScroll,{passive:true});addEventListener('touchmove',cancelScroll,{passive:true});addEventListener('keydown',cancelScroll);addEventListener('mousedown',cancelScroll);

    /* the project labels live on the pinned text stage, one per project, in page order. Odd parts always show; even parts are the letters that type in on rollover. To add a project, add a line here in the same order as the page */
    var LABELS=[['Q','UALCOMM'],['I','SLAND ','W','AY'],['N','EXGRILL'],['R','UBIOS']];
    var TYPE_MS=25;   /* ms between letters typing in */
    var ERASE_MS=25;  /* ms between letters backspacing out */
    var dotWrap=document.createElement('nav');dotWrap.className='nt-dots';dotWrap.setAttribute('aria-label','Additional projects');
    var labelEls=[],rings=[];
    var RING=12,RING_W=2,RING_TRACK=.25,R0=(RING-RING_W)/2,CIRC=2*Math.PI*R0;
    /* the ring takes the place of the page's filled dot (page footer code), in the same spot and with the same pop in and out */
    var ringCss=document.createElement('style');
    ringCss.textContent='html body .nt-dots .nt-dot::after{display:none !important}'+
      'html body .nt-dots .nt-dot-ring{flex:none;display:block;width:'+RING+'px;height:'+RING+'px;line-height:0;opacity:0;scale:.4;transition:opacity .3s ease,scale .3s ease}'+
      'html body .nt-dots .nt-dot.is-active .nt-dot-ring{opacity:1;scale:1}'+
      '@media (prefers-reduced-motion:reduce){html body .nt-dots .nt-dot-ring{transition:none}}';
    document.head.appendChild(ringCss);
    var dots=projects.map(function(p,i){
      var label=LABELS[i]||[p.eyebrow];
      var d=document.createElement('button');d.type='button';d.className='nt-dot';d.setAttribute('aria-label',label.join(''));
      var t=document.createElement('span');t.className='nt-dot-text';
      d.appendChild(t);
      /* the active project's dot is a small ring, the size and stroke of the main nav's circles, that draws itself around as you scroll through the project,
         so it shows how far there is to go. A faint full ring sits under it as the track */
      var rg=document.createElement('span');rg.className='nt-dot-ring';rg.setAttribute('aria-hidden','true');
      rg.innerHTML='<svg width="'+RING+'" height="'+RING+'" viewBox="0 0 '+RING+' '+RING+'"><circle cx="'+RING/2+'" cy="'+RING/2+'" r="'+R0+'" fill="none" stroke="currentColor" stroke-width="'+RING_W+'" opacity="'+RING_TRACK+'"/>'+
        '<circle cx="'+RING/2+'" cy="'+RING/2+'" r="'+R0+'" fill="none" stroke="currentColor" stroke-width="'+RING_W+'" stroke-dasharray="'+CIRC.toFixed(2)+'" stroke-dashoffset="'+CIRC.toFixed(2)+'" transform="rotate(-90 '+RING/2+' '+RING/2+')"/></svg>';
      d.appendChild(rg);rings.push(rg.querySelectorAll('circle')[1]);
      labelEls.push({el:t,parts:label});
      d.addEventListener('click',function(){goTo(i);});
      dotWrap.appendChild(d);return d;
    });
    stage.firstChild.appendChild(dotWrap);

    /* the typewriter: every label shows its first letters plus up to "typed" of its hidden ones, and one timer steps that count up or down */
    var typed=0,typeGoal=0,typeTimer=0,typeMax=0;
    function render(){
      labelEls.forEach(function(l){
        var left=typed,out='';
        l.parts.forEach(function(part,k){
          if(k%2){var take=Math.min(left,part.length);out+=part.slice(0,take);left-=take;}
          else out+=part;
        });
        if(l.el.textContent!==out)l.el.textContent=out;
      });
    }
    labelEls.forEach(function(l){
      var hidden=l.parts.filter(function(part,k){return k%2;}).join('').length;
      if(hidden>typeMax)typeMax=hidden;
    });
    render();
    function typeStep(){
      typeTimer=0;
      if(typed===typeGoal)return;
      typed+=typed<typeGoal?1:-1;
      render();
      typeTimer=setTimeout(typeStep,typed<typeGoal?TYPE_MS:ERASE_MS);
    }
    function typeTo(goal){
      typeGoal=goal;
      if(reduce){typed=goal;render();return;}
      if(!typeTimer)typeStep();
    }
    if(window.matchMedia('(hover:hover)').matches){
      dotWrap.addEventListener('mouseenter',function(){typeTo(typeMax);});
      dotWrap.addEventListener('mouseleave',function(){typeTo(0);});
    }
    /* tabbing to a label types them out too, but a mouse click leaves them alone */
    dotWrap.addEventListener('focusin',function(e){if(e.target.matches(':focus-visible'))typeTo(typeMax);});
    dotWrap.addEventListener('focusout',function(e){if(!dotWrap.contains(e.relatedTarget)&&!dotWrap.matches(':hover'))typeTo(0);});

    /* the button melts on the same clock and curve as the text. Its label never changes, so between projects it dips through the same blur the text does, staying clickable with the new link */
    var btnRaf=0,btnShown=false;
    function meltBtn(show){
      cancelAnimationFrame(btnRaf);
      var from=btnShown;btnShown=show;
      stage.classList.toggle('is-ready',show);
      if(!btn||reduce||(!from&&!show))return;
      var t0=performance.now();
      btn.style.transition='none';
      (function step(now){
        var f=Math.min(1,(now-t0)/MELT_MS);
        if(f>=1){btn.style.opacity=btn.style.filter=btn.style.transition='';return;}
        btn.style.opacity=Math.max(show?Math.pow(f,.4):0,from?Math.pow(1-f,.4):0);
        btn.style.filter=show&&from?(f<.5?blur(1-f):blur(f)):blur(show?f:1-f);
        btnRaf=requestAnimationFrame(step);
      })(t0);
    }

    wrap.insertBefore(stage,wrap.firstChild);
    wrap.insertBefore(cardHost,wrap.firstChild);
    wrap.insertBefore(blurHost,wrap.firstChild);
    wrap.classList.add('nt-featured');
    /* the card's height sets where the brand title and button sit */
    function measure(){var h=stageCards[0].getBoundingClientRect().height;if(h)stage.style.setProperty('--nt-card-h',h+'px');}
    measure();addEventListener('resize',measure);
    fitStops();addEventListener('load',fitStops);addEventListener('resize',fitStops);
    if('ResizeObserver' in window)new ResizeObserver(fitStops).observe(wrap);

    /* arriving straight at a project (the X on its project page links to its #id): the browser jumps there before the images above have loaded and pushed the page down, so for a few seconds it stays on the project, until the visitor scrolls */
    var HOLD_MS=4000;
    var arrive=null;
    if(location.hash)texts.slice(0,n).forEach(function(t){var el=t.nextElementSibling;if(el&&'#'+el.id===location.hash)arrive=el;});
    if(arrive){
      var holdToken=scrollToken,holdUntil=performance.now()+HOLD_MS;
      (function hold(now){
        if(scrollToken!==holdToken||now>holdUntil)return;
        fitStops();
        if(isOff(arrive))arrive.scrollIntoView({behavior:'auto',block:'start'});
        requestAnimationFrame(hold);
      })(performance.now());
    }

    /* how far through the project on screen: from the moment it takes over to the moment the next one does (the last one runs until the section scrolls away) */
    function ringTo(idx){
      if(idx<0)return;
      var arc=rings[idx];
      var mid=innerHeight*0.6,a=texts[idx].getBoundingClientRect().top-mid,b;
      if(idx<n-1)b=texts[idx+1].getBoundingClientRect().top-mid;
      else b=wrap.getBoundingClientRect().bottom-innerHeight;
      var f=b>a?Math.max(0,Math.min(1,-a/(b-a))):1;
      arc.setAttribute('stroke-dashoffset',(CIRC*(1-f)).toFixed(2));
    }

    var still=stills(wrap,texts.slice(0,n).map(function(t){var b=t.nextElementSibling;return {block:b,imgs:b?[].slice.call(b.querySelectorAll('img')).slice(0,S_PER):[]};}),title,btn,dotWrap,stage.firstChild);

    /* -1 until the first project scrolls up to 60% of the screen, so the first title melts in too */
    var cur=-2;
    function update(){
      still.sync();
      ringTo(cur);
      if(jumping>=0)return;
      var mid=innerHeight*0.6,idx=-1;
      for(var i=0;i<n;i++){if(texts[i].getBoundingClientRect().top<mid)idx=i;}
      show(idx);
    }
    function show(idx){
      still.show(idx);
      if(idx===cur)return;
      if(cur>=0){blurs[cur].classList.remove('is-active');stageCards[cur].classList.remove('is-active');dots[cur].classList.remove('is-active');dots[cur].removeAttribute('aria-current');}
      cur=idx;
      ringTo(idx);
      dotWrap.classList.toggle('is-on',idx>=0);
      if(idx<0){morphHead('');morphEyebrow('');meltBtn(false);return;}
      blurs[idx].classList.add('is-active');stageCards[idx].classList.add('is-active');dots[idx].classList.add('is-active');dots[idx].setAttribute('aria-current','true');
      var p=projects[idx];
      if(hl)hl.className=p.headClass+' nt-morph'+(hl.classList.contains('is-morphing')?' is-morphing':'');
      if(btn)btn.setAttribute('href',p.href);
      morphEyebrow(p.eyebrow);
      morphHead(p.headline);
      meltBtn(true);
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
