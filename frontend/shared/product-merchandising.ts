export type ProductBadge={id:string;label:string;color:string;textColor:string;isActive:boolean;rule:string;newDays:number};
export const DEFAULT_PRODUCT_BADGES:ProductBadge[]=[
  {id:'new',label:'Новинка',color:'#202127',textColor:'#ffffff',isActive:true,rule:'new',newDays:30},
  {id:'popular',label:'Популярное',color:'#202127',textColor:'#ffffff',isActive:true,rule:'manual',newDays:30},
  {id:'sale',label:'Скидка',color:'#ff5948',textColor:'#ffffff',isActive:true,rule:'sale',newDays:30},
];
export function storefrontVariantPrice(variant:any,gift=false,now=Date.now()):number {
  const regular=Number(variant?.regularPrice??variant?.price??0),sale=Number(variant?.salePrice);
  const starts=variant?.saleStartsAt?new Date(variant.saleStartsAt).getTime():-Infinity;
  const ends=variant?.saleEndsAt?new Date(variant.saleEndsAt).getTime():Infinity;
  return !gift&&variant?.salePrice!=null&&Number.isFinite(sale)&&sale>=0&&sale<regular&&starts<=now&&now<ends?sale:regular;
}
export function storefrontBadges(product:any,definitions:ProductBadge[],now=Date.now()):ProductBadge[]{
  const created=new Date(product.createdAt).getTime(),age=now-created;
  return definitions.filter(b=>b.isActive && (b.rule==='manual'?product.badgeIds?.includes(b.id):b.rule==='new'?age>=0&&age<b.newDays*86400000:b.rule==='sale'&&product.productType!=='GIFT_CARD'&&product.variants?.some((v:any)=>v.isActive!==false&&storefrontVariantPrice(v,false,now)<Number(v.regularPrice??v.price)))).slice(0,3);
}
