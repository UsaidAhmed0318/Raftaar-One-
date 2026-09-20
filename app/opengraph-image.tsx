import {ImageResponse} from 'next/og';
export const alt='Raftaar One — Your city. One connection.';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image(){return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'center',padding:80,background:'#0b2725',color:'#fff',fontFamily:'sans-serif'}}><div style={{fontSize:30,color:'#c4f26b',marginBottom:40}}>raftaar one.</div><div style={{fontSize:80,fontWeight:700}}>Your city.</div><div style={{fontSize:80,fontWeight:700,color:'#c4f26b'}}>One connection.</div><div style={{fontSize:26,marginTop:35}}>Rides · Food · Marketplace · Cargo</div></div>,{...size});}