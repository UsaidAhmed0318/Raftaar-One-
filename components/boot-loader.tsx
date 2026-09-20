'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import './boot-loader.css';

const MESSAGES = ['Loading cargo…', 'Checking the route…', 'On the road…', 'Almost there…'];
type Face = 'f' | 'k' | 'r' | 'l' | 't' | 'b';

function Cuboid({x, y, w, h, d, cls = '', faces = {}}: {x: number; y: number; w: number; h: number; d: number; cls?: string; faces?: Partial<Record<Face, ReactNode>>}) {
  const style = {'--x': x + 'px', '--y': y + 'px', '--w': w + 'px', '--h': h + 'px', '--d': d + 'px'} as CSSProperties;
  return <div className={'cb ' + cls} style={style}>
    {(['f', 'k', 'r', 'l', 't', 'b'] as Face[]).map(face => <i key={face} className={face}>{faces[face]}</i>)}
  </div>;
}

function Skyline({layer,d}: {layer: string; d: string}) {
  return <div className={"boot-city " + layer} aria-hidden="true">{[0, 1].map(i => <svg key={i} viewBox="0 0 1200 160" preserveAspectRatio="none"><path d={d}/></svg>)}</div>;
}

function Wheel({x, side}: {x: number; side: 1 | -1}) {
  return <div className="wheel" style={{left: x, transform: 'translateZ(' + side * 33 + 'px)'}}><b/><span/></div>;
}

export default function BootLoader() {
  const [phase, setPhase] = useState<'run' | 'exit' | 'gone'>('run');
  const [message, setMessage] = useState(0);
  const fill = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minimum = reduced ? 500 : 2200;
    const start = 0; // performance.now() counts from navigation start, so the timer includes download time
    let loaded = document.readyState === 'complete';
    let progress = 0, raf = 0, leaving = false;
    const onLoad = () => { loaded = true; };
    window.addEventListener('load', onLoad);
    document.documentElement.style.overflow = 'hidden';

    const leave = () => {
      if (leaving) return;
      leaving = true;
      setPhase('exit');
      window.setTimeout(() => { setPhase('gone'); document.documentElement.style.overflow = ''; }, reduced ? 200 : 900);
    };
    const frame = (now: number) => {
      const elapsed = now - start;
      const eased = 1 - Math.pow(1 - Math.min(elapsed / minimum, 1), 3);
      const target = loaded && elapsed >= minimum ? 1 : Math.min(eased, 0.94);
      progress += (target - progress) * 0.25;
      fill.current?.style.setProperty('--p', progress.toFixed(4));
      if (label.current) label.current.textContent = Math.round(progress * 100) + '%';
      if (progress > 0.995) { leave(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const failsafe = window.setTimeout(leave, 9000);
    const rotate = window.setInterval(() => setMessage(m => (m + 1) % MESSAGES.length), 700);
    return () => { cancelAnimationFrame(raf); clearTimeout(failsafe); clearInterval(rotate); window.removeEventListener('load', onLoad); document.documentElement.style.overflow = ''; };
  }, []);

  if (phase === 'gone') return null;
  return <div className={'boot' + (phase === 'exit' ? ' boot-exit' : '')} role="status" aria-live="polite" aria-label="Loading Raftaar One">
    <div className="boot-glow" aria-hidden="true"/>
    <div className="boot-particles" aria-hidden="true">{Array.from({length: 16}, (_, i) => <span key={i} style={{'--i': i} as CSSProperties}/>)}</div>
    <Skyline layer="far" d="M0 160V96h40V60h50v36h30V40h60v56h40V70h70v26h30V30h56v66h44V80h60v16h40V50h64v46h30V72h50v24h40V44h60v52h46V84h60v12h30V56h56v40h44V90h50v70z"/>
    <Skyline layer="near" d="M0 160V110h60V80h40v30h50V90h70v20h40V60h50v50h60V96h50v14h60V70h70v40h40V88h60v22h50V64h60v46h40V92h70v18h50V76h60v34h60z"/>

    <div className="boot-main">
      <div className="boot-logo" aria-hidden="true">
        <i className="ring r1"/><i className="ring r2"/>
        <div className="logo-tilt"><img src="/images/logo-transparent.png" alt="" width="291" height="230" decoding="async" fetchPriority="high"/><span className="shine"/></div>
      </div>

      <div className="boot-stage" aria-hidden="true">
        <div className="truck-wrap">
          <div className="world">
            <div className="boot-road"><i/></div>
            <div className="truck">
              <div className="truck-shadow"/>
              <Cuboid x={4} y={78} w={232} h={12} d={46} cls="chassis"/>
              <Cuboid x={0} y={4} w={166} h={76} d={68} cls="cargo" faces={{
                f: <><span className="cargo-stripe"/><img className="cargo-logo" src="/images/logo-transparent.png" alt="" width="291" height="230"/><em>CARGO · PAKISTAN</em></>,
                t: <span className="cargo-top"/>, l: <span className="cargo-doors"/>, k: <span className="cargo-doors"/>
              }}/>
              <Cuboid x={170} y={26} w={66} h={54} d={64} cls="cab" faces={{
                f: <span className="cab-window side"/>, r: <span className="cab-window front"><b/></span>, t: <span className="cab-roof"/>
              }}/>
              <Cuboid x={236} y={54} w={12} h={26} d={58} cls="bumper"/>
              <span className="beam"/>
              {[34, 70, 206].map(x => <Wheel key={x} x={x} side={1}/>)}
              {[34, 70, 206].map(x => <Wheel key={'b' + x} x={x} side={-1}/>)}
            </div>
          </div>
          <div className="speed" aria-hidden="true"><i/><i/><i/><i/><i/></div>
        </div>
      </div>

      <div className="boot-progress">
        <div className="route">
          <span className="pt a">A</span>
          <div className="track"><div className="fill" ref={fill}><b className="mini-truck"/></div></div>
          <span className="pt b">B</span>
        </div>
        <p><strong>{MESSAGES[message]}</strong><span ref={label}>0%</span></p>
        <small>Raftaar One · Move anything, anywhere in Pakistan</small>
      </div>
    </div>
  </div>;
}
