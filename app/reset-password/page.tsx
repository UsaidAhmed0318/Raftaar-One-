import AuthForm from '@/components/auth-form';
export const metadata={title:'Reset password',robots:{index:false,follow:false}};
export default function Page(){return <div className="container section" style={{maxWidth:600}}><AuthForm initialMode="reset"/></div>;}