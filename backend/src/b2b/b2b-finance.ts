/** Historical financial data is protected at the API boundary, not by CSS.
 * Public procurement offers/service list prices remain usable independently.
 */
const financialKeys=new Set(['totalSpent','creditLimit','totalAmount','discountAmount','bonusAmount','giftCardAmount','shippingCost','finalAmount','serviceRevenueMonth','purchasesMonth']);
export function protectB2BFinance<T>(value:T,canSeeFinance:boolean):T {
 if(canSeeFinance||value===null||typeof value!=='object')return value;
 if(value instanceof Date||typeof (value as any).toJSON==='function')return value;
 if(Array.isArray(value))return value.map(item=>protectB2BFinance(item,false)) as T;
 const result:any={...value};
 for(const key of Object.keys(result)){
  if(financialKeys.has(key))result[key]=null;
  else if(key==='items'&&Array.isArray(result[key]))result[key]=result[key].map((line:any)=>({...protectB2BFinance(line,false),price:null,total:null}));
  else if(result[key]&&typeof result[key]==='object')result[key]=protectB2BFinance(result[key],false);
 }
 return result;
}
