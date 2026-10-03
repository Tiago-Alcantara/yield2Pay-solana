import numpy as np, wave
SR=48000; T=20.0; n=int(SR*T); t=np.arange(n)/SR
bpm=112; beat=60/bpm
def note(m): return 440*2**((m-69)/12)
def env(x,a,r): return np.clip(x/a,0,1)*np.exp(-np.maximum(x-a,0)/r)
out=np.zeros(n)
# chords D A Bm G (2 bars each = 8 beats? use 4 beats each)
prog=[[62,66,69],[57,61,64],[59,62,66],[55,59,62]]
bar=4*beat
for i in range(int(T/bar)+1):
    ch=prog[i%4]; s=int(i*bar*SR); e=min(n,int((i+1)*bar*SR))
    if s>=n: break
    tt=t[s:e]-t[s]
    pad=sum(np.sin(2*np.pi*note(m)*tt)+0.3*np.sin(2*np.pi*note(m)*2.003*tt) for m in ch)
    out[s:e]+=0.05*pad*np.clip(tt/0.4,0,1)*np.clip((bar-tt)/0.3,0,1)
    b=note(ch[0]-24); out[s:e]+=0.10*np.sin(2*np.pi*b*tt)*np.clip(tt/0.02,0,1)
rng=np.random.default_rng(7)
for k in range(int(T/beat)):
    s=int(k*beat*SR)
    if 2.0<k*beat<20:  # kick
        L=int(0.25*SR); tt=np.arange(min(L,n-s))/SR
        out[s:s+len(tt)]+=0.32*np.sin(2*np.pi*(50+80*np.exp(-tt*30))*tt)*np.exp(-tt*12)
    hs=int((k+0.5)*beat*SR)
    if hs<n and k*beat>3.2:
        L=int(0.05*SR); m=min(L,n-hs)
        out[hs:hs+m]+=0.025*rng.standard_normal(m)*np.exp(-np.arange(m)/SR*80)
def plink(at,m,amp=0.12,dec=0.5):
    s=int(at*SR); L=int(1.2*SR); tt=np.arange(min(L,n-s))/SR
    out[s:s+len(tt)]+=amp*(np.sin(2*np.pi*note(m)*tt)+0.4*np.sin(2*np.pi*note(m)*3*tt))*np.exp(-tt/dec)*np.clip(tt/0.005,0,1)
for at,m in [(0.1,74),(0.42,78),(0.74,81),(2.05,69)]: plink(at,m)
# checks when coverage crosses (deposit easing): approx times computed in video
for at,m in [(8.33,74),(8.57,78),(9.2,81)]: plink(at,m,0.1)
for m in [74,78,81,86]: plink(9.25,m,0.06,1.2)   # chime 100%
for at in [12.1,12.55,13.0]:
    s=int(at*SR); L=int(0.4*SR); w=rng.standard_normal(L); tt=np.arange(L)/SR
    out[s:s+L]+=0.04*np.convolve(w,np.ones(40)/40,'same')*np.sin(np.pi*tt/0.4)
for m in [62,66,69,74]: plink(16.05,m,0.07,2.0)
out*=np.clip(t/0.4,0,1)*np.clip((T-t)/1.2,0,1)
out=np.tanh(out*1.2)/1.2
st=np.stack([out,out*0.98],1); st=(st/np.max(np.abs(st))*0.85*32767).astype(np.int16)
w=wave.open('music.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes()); w.close()
