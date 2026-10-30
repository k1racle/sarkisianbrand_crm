import { CourseCoverController } from './course-cover.controller';

describe('LMS public course cover', () => {
  const courseId='00000000-0000-4000-8000-000000000001';
  const user={sub:'fixture-user',sid:'fixture-session',exp:Math.floor(Date.now()/1000)+3600};
  let db:any, media:any, roles:any, controller:CourseCoverController;
  beforeEach(() => {
    db={course:{findUnique:jest.fn().mockResolvedValue({id:courseId}),update:jest.fn().mockResolvedValue({})},session:{findFirst:jest.fn().mockResolvedValue({user:{id:user.sub,role:'CONTENT_MANAGER',isActive:true}})}};
    media={upload:jest.fn().mockResolvedValue({url:'/api/v1/media/files/00000000-0000-4000-8000-000000000002.png'})};roles={canActivate:jest.fn().mockResolvedValue(true)};
    controller=new CourseCoverController(db,media,roles);
  });
  it('stores the vetted public media URL and removes only the reference', async () => {
    const file={buffer:Buffer.from('fixture')};
    expect(await controller.upload(courseId,file,{user:{...user}})).toEqual({url:expect.stringMatching(/^\/api\/v1\/media\/files\//)});
    expect(media.upload).toHaveBeenCalledWith(file,user.sub);
    expect(db.course.update).toHaveBeenCalledWith({where:{id:courseId},data:{coverImageUrl:expect.stringMatching(/^\/api\/v1\/media\/files\//)}});
    await controller.remove(courseId);
    expect(db.course.update).toHaveBeenLastCalledWith({where:{id:courseId},data:{coverImageUrl:null}});
  });
  it('rejects a revoked session or permissions before storing the image', async () => {
    db.session.findFirst.mockResolvedValueOnce(null);
    await expect(controller.upload(courseId,{}, {user:{...user}})).rejects.toThrow();
    roles.canActivate.mockRejectedValueOnce(new Error('access revoked'));
    await expect(controller.upload(courseId,{}, {user:{...user}})).rejects.toThrow('access revoked');
    expect(media.upload).not.toHaveBeenCalled();
  });
});
