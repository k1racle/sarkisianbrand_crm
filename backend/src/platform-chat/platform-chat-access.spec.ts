import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PlatformChatService } from './platform-chat.service';
jest.mock('../auth/auth.service',()=>({AuthService:class{}}));
jest.mock('./platform-chat.gateway',()=>({PlatformChatGateway:class{}}));
describe('Platform entity access: mocked identity/data only',()=>{
 function fixture(permissions:string[]){
  const prisma:any={customer:{findMany:jest.fn().mockResolvedValue([{id:'old-customer',firstName:'Test',email:'mock@example.invalid'}])},task:{findMany:jest.fn().mockResolvedValue([{id:'task',title:'Task',status:'TODO',assignedTo:null}])},product:{findMany:jest.fn().mockResolvedValue([])},crmPipelineStage:{findMany:jest.fn().mockResolvedValue([])}};
  const auth:any={access:jest.fn().mockResolvedValue({permissions})};return{prisma,auth,service:new PlatformChatService(prisma,{} as any,auth)};
 }
 it('denies client searches even for an internal caller without customers.read',async()=>{const f=fixture(['crm.read']);await expect(f.service.searchEntities('CUSTOMER','','user')).rejects.toBeInstanceOf(ForbiddenException);expect(f.prisma.customer.findMany).not.toHaveBeenCalled();});
 it('uses effective permissions and current user identity',async()=>{const f=fixture(['customers.read']);await f.service.searchEntities('CUSTOMER','Test','user');expect(f.auth.access).toHaveBeenCalledWith('user');expect(f.prisma.customer.findMany).toHaveBeenCalledTimes(1);});
 it('checks the proper permission separately for each entity type',async()=>{for(const type of ['TASK','STAGE','PRODUCT']){const f=fixture(['customers.read']);await expect(f.service.searchEntities(type,'','user')).rejects.toBeInstanceOf(ForbiddenException);}});
 it('attaches an authorized old entity by ID, not only within the latest 20 records',async()=>{const f=fixture(['customers.read']);const rows=await (f.service as any).resolveEntities([{type:'CUSTOMER',id:'old-customer'}],'user');expect(rows[0].entityId).toBe('old-customer');expect(f.prisma.customer.findMany.mock.calls[0][0].where).toEqual({id:'old-customer'});});
 it('cannot bypass permission via a direct entity attachment',async()=>{const f=fixture([]);await expect((f.service as any).resolveEntities([{type:'CUSTOMER',id:'old-customer'}],'user')).rejects.toBeInstanceOf(ForbiddenException);expect(f.prisma.customer.findMany).not.toHaveBeenCalled();});
 it('unassigned task lookup does not crash',async()=>{const f=fixture(['crm.read']);expect((await f.service.searchEntities('TASK','','user'))[0].id).toBe('task');});
 it('unknown entity type is rejected before reading data',async()=>{const f=fixture([]);await expect(f.service.searchEntities('SECRET','','user')).rejects.toBeInstanceOf(BadRequestException);expect(f.auth.access).not.toHaveBeenCalled();});
});
