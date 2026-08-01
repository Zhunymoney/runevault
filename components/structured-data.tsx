import Link from "next/link";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items }: { items: Array<{ name: string; href?: string }> }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://runevault-beta.vercel.app";
  return <><nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap gap-2 text-sm text-white/40">{items.map((item,index)=><span key={`${item.name}-${index}`} className="flex items-center gap-2">{index>0&&<span aria-hidden="true">/</span>}{item.href?<Link href={item.href} className="hover:text-amber-300">{item.name}</Link>:<span aria-current="page" className="text-white/65">{item.name}</span>}</span>)}</nav><JsonLd data={{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:items.map((item,index)=>({"@type":"ListItem",position:index+1,name:item.name,item:item.href?`${base}${item.href}`:undefined}))}}/></>;
}
