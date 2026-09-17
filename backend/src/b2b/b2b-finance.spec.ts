import { protectB2BFinance } from './b2b-finance';
describe('B2B historical financial visibility, no network/database',()=>{
 const date=new Date('2026-09-17T00:00:00Z');
 const order={id:'order',orderNumber:'SB-MOCK',createdAt:date,finalAmount:1000,totalAmount:1100,items:[{productName:'Gel',quantity:1,price:1000,total:1000}],history:[]};
 it('redacts order totals and line amounts but retains status/composition',()=>{
  const result=protectB2BFinance(order,false);expect(result.finalAmount).toBeNull();expect(result.items[0]).toMatchObject({productName:'Gel',quantity:1,price:null,total:null});expect(result.createdAt).toBe(date);expect(order.finalAmount).toBe(1000);
 });
 it('protects nested dashboard/client/profile totals',()=>{const result=protectB2BFinance({creditLimit:10000,serviceRevenueMonth:1500,purchasesMonth:2000,recentOrders:[order],client:{totalSpent:5000}},false);expect(result.creditLimit).toBeNull();expect(result.client.totalSpent).toBeNull();expect(result.recentOrders[0].finalAmount).toBeNull();});
 it('allowed viewers receive original values',()=>{expect(protectB2BFinance(order,true)).toBe(order);});
 it('list prices are not treated as historic finance',()=>{expect(protectB2BFinance({name:'Service',price:1000},false).price).toBe(1000);});
 it('preserves Prisma Decimal-style serialization',()=>{const decimal={toJSON:()=> '1000',d:[1000],s:1,e:3};expect(protectB2BFinance({price:decimal},false).price).toBe(decimal);});
});
