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
    var scrollToken=0;
    function goTo(i){
      var el=texts[i].nextElementSibling;
      if(!el)return;
      var token=++scrollToken;
      fitStops();
      el.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});
      addEventListener('scrollend',function(){
        if(token!==scrollToken)return;
        fitStops();
        if(isOff(el))el.scrollIntoView({behavior:'auto',block:'start'});
      },{once:true});
    }
    function cancelScroll(){scrollToken++;}
    addEventListener('wheel',cancelScroll,{passive:true});addEventListener('touchmove',cancelScroll,{passive:true});addEventListener('keydown',cancelScroll);addEventListener('mousedown',cancelScroll);

    /* the project labels live on the pinned text stage, one per project, in page order. Odd parts always show; even parts are the letters that type in on rollover. To add a project, add a line here in the same order as the page */
    var LABELS=[['Q','UALCOMM'],['I','SLAND ','W','AY'],['N','EXGRILL'],['R','UBIOS']];
    var TYPE_MS=25;   /* ms between letters typing in */
    var ERASE_MS=25;  /* ms between letters backspacing out */
    var dotWrap=document.createElement('nav');dotWrap.className='nt-dots';dotWrap.setAttribute('aria-label','Additional projects');
    var labelEls=[];
    var dots=projects.map(function(p,i){
      var label=LABELS[i]||[p.eyebrow];
      var d=document.createElement('button');d.type='button';d.className='nt-dot';d.setAttribute('aria-label',label.join(''));
      var t=document.createElement('span');t.className='nt-dot-text';
      d.appendChild(t);
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

    /* -1 until the first project scrolls up to 60% of the screen, so the first title melts in too */
    var cur=-2;
    function update(){
      var mid=innerHeight*0.6,idx=-1;
      for(var i=0;i<n;i++){if(texts[i].getBoundingClientRect().top<mid)idx=i;}
      if(idx===cur)return;
      if(cur>=0){blurs[cur].classList.remove('is-active');stageCards[cur].classList.remove('is-active');dots[cur].classList.remove('is-active');dots[cur].removeAttribute('aria-current');}
      cur=idx;
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
    /* poll each frame: Webflow sticky interactions keep moving things after scroll events stop */
    (function loop(){update();requestAnimationFrame(loop);})();
    addEventListener('scroll',update,{passive:true});addEventListener('resize',update);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
