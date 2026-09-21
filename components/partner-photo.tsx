'use client';
import {useEffect,useState} from 'react';
import {browserDB} from '@/lib/supabase';

// Application photos live in a private bucket; admins open them through a short-lived signed link.
export default function PartnerPhoto({path}: {path: string}) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let live = true;
    browserDB().storage.from('partners').createSignedUrl(path, 300).then(({data}) => { if (live && data?.signedUrl) setUrl(data.signedUrl); }, () => undefined);
    return () => { live = false; };
  }, [path]);
  return url ? <a href={url} target="_blank" rel="noopener noreferrer"><img className="thumb" src={url} alt="Applicant photo"/></a> : null;
}
