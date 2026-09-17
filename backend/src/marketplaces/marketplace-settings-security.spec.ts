import { BadRequestException } from '@nestjs/common';
import { MarketplaceChannel } from '@prisma/client';
import { MarketplacesService } from './marketplaces.service';
jest.mock('../oms/oms.service',()=>({OmsService:class{}}));
jest.mock('../background-jobs/background-jobs.service',()=>({BackgroundJobsService:class{}}));
describe('Marketplace secrets single owner: mocked writes only',()=>{
 function fixture(){const prisma:any={marketplaceIntegration:{upsert:jest.fn().mockResolvedValue({id:'mock',channel:'OZON'})}};return{prisma,service:new MarketplacesService(prisma,{} as any,{} as any)};}
 it('rejects plaintext credentials before persisting anything',async()=>{const f=fixture();await expect(f.service.saveIntegration({channel:MarketplaceChannel.OZON,credentials:{apiKey:'mock-not-a-real-secret'}})).rejects.toBeInstanceOf(BadRequestException);expect(f.prisma.marketplaceIntegration.upsert).not.toHaveBeenCalled();});
 it('cabinet metadata does not clear or return historical secrets',async()=>{const f=fixture();await f.service.saveIntegration({channel:MarketplaceChannel.OZON,shopName:'Test',isActive:false});const input=f.prisma.marketplaceIntegration.upsert.mock.calls[0][0];expect(input.update).not.toHaveProperty('credentials');expect(input.create).not.toHaveProperty('credentials');expect(input.select).not.toHaveProperty('credentials');});
});
