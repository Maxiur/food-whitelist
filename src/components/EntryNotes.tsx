import { useEffect, useRef, useState } from 'react';
export default function EntryNotes({ text }: { text: string }) {
  const paragraph = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  useEffect(() => {
    const measure = () => { if (paragraph.current && !expanded) setOverflow(paragraph.current.scrollHeight > paragraph.current.clientHeight + 1); };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (paragraph.current) observer?.observe(paragraph.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [text, expanded]);
  if (!text.trim()) return null;
  return <div className="entry-notes"><p ref={paragraph} className={`card-notes ${expanded ? 'notes-expanded' : 'notes-collapsed'}`}>{text}</p>{(overflow || expanded) && <button type="button" className="notes-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Zwiń notatkę' : 'Rozwiń notatkę'}</button>}</div>;
}
