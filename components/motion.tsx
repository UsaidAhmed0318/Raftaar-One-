'use client';
import {motion,type Variants} from 'framer-motion';
import Link from 'next/link';
export const MotionLink=motion.create(Link);
const easeOut=[0.16,1,0.3,1] as const;
export const fadeUp:Variants={hidden:{opacity:0,y:28},show:{opacity:1,y:0,transition:{duration:0.7,ease:easeOut}}};
export const stagger:Variants={hidden:{},show:{transition:{staggerChildren:0.09,delayChildren:0.05}}};
export function Reveal({children,className,delay=0,as='div'}:{children:React.ReactNode;className?:string;delay?:number;as?:'div'|'section'}){
 const El=as==='section'?motion.section:motion.div;
 return <El className={className} initial="hidden" whileInView="show" viewport={{once:true,margin:'-80px'}} variants={fadeUp} transition={{delay}}>{children}</El>;
}
export function RevealGroup({children,className}:{children:React.ReactNode;className?:string}){
 return <motion.div className={className} initial="hidden" whileInView="show" viewport={{once:true,margin:'-60px'}} variants={stagger}>{children}</motion.div>;
}
export function RevealItem({children,className}:{children:React.ReactNode;className?:string}){
 return <motion.div className={className} variants={fadeUp}>{children}</motion.div>;
}
