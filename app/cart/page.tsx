import Checkout from '@/components/checkout';
export const metadata={title:'Cart & checkout',robots:{index:false,follow:false}};
export default function Page(){return <div className="container"><div className="page-head intro"><p className="eyebrow">ONE LAST LOOK</p><h1>Your good finds.</h1></div><div className="intro" style={{'--d':'0.08s'} as React.CSSProperties}><Checkout/></div></div>;}