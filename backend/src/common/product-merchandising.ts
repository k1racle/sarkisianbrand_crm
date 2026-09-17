/** Marketing prices never replace accounting prices, and never discount gift-card nominals. */
export function effectiveVariantPrice(variant: any, now = new Date()): any {
  if (variant.product?.productType === 'GIFT_CARD') return variant.price;
  const sale = Number(variant.salePrice), regular = Number(variant.price);
  const starts = variant.saleStartsAt ? new Date(variant.saleStartsAt).getTime() : -Infinity;
  const ends = variant.saleEndsAt ? new Date(variant.saleEndsAt).getTime() : Infinity;
  return variant.salePrice != null && Number.isFinite(sale) && sale >= 0 && sale < regular
    && starts <= now.getTime() && now.getTime() < ends ? variant.salePrice : variant.price;
}
export function pricedVariant<T extends {price:any}>(variant:T, now = new Date()):T & {regularPrice:any} {
  return {...variant, regularPrice:variant.price, price:effectiveVariantPrice(variant,now)};
}
type PricedItem<T extends {variant:{price:any}}>=Omit<T,'variant'>&{variant:T['variant']&{regularPrice:any}};
export function pricedCart<T extends {items:{variant:{price:any}}[]}>(cart:T, now = new Date()):Omit<T,'items'>&{items:PricedItem<T['items'][number]>[]} {
  return {...cart, items:cart.items.map(item=>({...item,variant:pricedVariant(item.variant,now)}))} as Omit<T,'items'>&{items:PricedItem<T['items'][number]>[]};
}
export const DEFAULT_PRODUCT_BADGES = [
  {id:'new',label:'Новинка',color:'#202127',textColor:'#ffffff',isActive:true,rule:'new',newDays:30},
  {id:'popular',label:'Популярное',color:'#202127',textColor:'#ffffff',isActive:true,rule:'manual',newDays:30},
  {id:'sale',label:'Скидка',color:'#ff5948',textColor:'#ffffff',isActive:true,rule:'sale',newDays:30},
];
export function activeCategoryTree<T extends {id:string;parentId:string|null;isActive:boolean}>(categories:T[]):T[]{
  const byId=new Map(categories.map(c=>[c.id,c]));
  return categories.filter(category=>{const seen=new Set<string>();let current:T|undefined=category;while(current){if(!current.isActive||seen.has(current.id))return false;seen.add(current.id);if(!current.parentId)return true;current=byId.get(current.parentId);}return false;});
}
export function categoryDescendantSlugs(categories:{id:string;parentId:string|null;slug:string}[],selected:string[]):string[]{
  const ids=new Set(categories.filter(c=>selected.includes(c.slug)).map(c=>c.id));
  for(let change=true;change;){change=false;for(const c of categories)if(c.parentId&&ids.has(c.parentId)&&!ids.has(c.id)){ids.add(c.id);change=true;}}
  return [...new Set(categories.filter(c=>ids.has(c.id)).map(c=>c.slug))];
}
export function resolveProductBadges(value:unknown): typeof DEFAULT_PRODUCT_BADGES {
  if (!Array.isArray(value)) return DEFAULT_PRODUCT_BADGES.map(b=>({...b}));
  return value.filter(b=>b && typeof b.id==='string' && /^[a-z][a-z0-9-]{0,39}$/.test(b.id)
    && typeof b.label==='string' && b.label.trim() && /^#[0-9a-f]{6}$/i.test(b.color)
    && /^#[0-9a-f]{6}$/i.test(b.textColor) && ['manual','new','sale'].includes(b.rule))
    .slice(0,30).map(b=>({...b,label:b.label.trim(),isActive:b.isActive===true,newDays:Math.min(365,Math.max(1,Number(b.newDays)||30))}));
}
