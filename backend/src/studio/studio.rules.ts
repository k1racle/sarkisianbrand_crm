import { BadRequestException } from '@nestjs/common';

// Business rewards are calculated here; browser scores and saved coins are never trusted.
const rows = [
  ['anna-french',180,'rose','french',null,'almond','natural'],['mila-evening',240,'wine','gold',3,'square','extended'],
  ['lera-holiday',200,'milk','plain',null],['sonya-sage',230,'sage','dots',2,'oval','natural'],
  ['eva-black',250,'black','gold',null,'almond','extended'],['ira-peach',190,'peach','plain',null],
  ['asya-lavender',290,'lavender','dots',null,'oval','extended'],['nina-blue',280,'blue','french',null],
  ['dasha-shoot',340,'red','gold',2,'square','extended'],['olga-wedding',360,'milk','dots',null,'oval','extended'],
  ['vika-marble',310,'latte','marble',null,'coffin','extended'],['alice-flowers',300,'ballet','flowers',null,'round','short'],
  ['polina-sky',320,'periwinkle','ombre',null,'oval','extended'],['rita-swirl',350,'fuchsia','swirl',null,'stiletto','long'],
  ['zoya-moon',300,'emerald','moon',null,'almond','natural'],['lisa-hearts',310,'raspberry','hearts',3,'square','short'],
  ['taya-geometric',350,'graphite','diagonal',null,'coffin','long'],['masha-summer',290,'coral','colored-french',null],
  ['yana-leopard',330,'sand','leopard',2,'almond','long'],['kira-stars',380,'midnight','stars',null,'stiletto','long'],
  ['nelli-checker',340,'lime','checker',null,'square','short'],['dina-aura',330,'lilac','aura',null,'oval','natural'],
] as const;
export const STUDIO_BRIEFS = rows.map(([id,reward,color,pattern,accent,shape,length]) => ({id,reward,color,pattern,accent,shape,length,kind:['lera-holiday','ira-peach','nina-blue','masha-summer'].includes(id)?'pedicure':'manicure'}));
export function stepsFor(technique: string) {
  const steps = ['clean','remove','push','pocket','cut','polish','shape','buff','base'];
  return steps.filter(s => technique === 'classic' ? !['pocket','polish'].includes(s) : technique === 'hardware' ? s !== 'polish' : true);
}
export function studioReward(briefId: string, design: {kind:string;shape?:string;length?:string;nails:{color:string;pattern:string}[]}) {
  const b = STUDIO_BRIEFS.find(b => b.id === briefId);
  if (!b || design.kind !== b.kind || design.nails.length !== 5 || design.nails.some(n => !n.color)) throw new BadRequestException('Заполните все ногти по текущему запросу.');
  const matches = design.nails.reduce((sum,n,i)=>sum+Number(n.color===b.color)+Number(n.pattern===(b.accent===null||i===b.accent?b.pattern:'plain')),0) + Number(!!b.shape&&design.shape===b.shape) + Number(!!b.length&&design.length===b.length);
  return Math.round(b.reward * (.3 + .7 * matches / (10+Number(!!b.shape)+Number(!!b.length))));
}
export const STUDIO_PRICES: Record<string,number> = {organizer:350,lamp:550,pastel:600,mousse:100,speed:90,polish:75};
