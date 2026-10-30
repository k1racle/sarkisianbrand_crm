/* Isolated storefront fixture: only synthetic users, local frontend and PDF. */
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const origin=new URL(process.env.STOREFRONT_URL||'http://127.0.0.1:3019').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
function fixturePdf(){
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream='BT /F1 35 Tf 30 180 Td (PDF PREVIEW TEST) Tj ET';objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  let result='%PDF-1.4\n', offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(result));result+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}const start=Buffer.byteLength(result);result+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;return Buffer.from(result);
}
const pdf=fixturePdf(),courseId='10000000-0000-4000-8000-000000000001',lessonId='20000000-0000-4000-8000-000000000001',assetId='30000000-0000-4000-8000-000000000001';
const lesson={id:lessonId,title:'Тестовый урок',kind:'TEXT',sortOrder:0,isPreview:false,content:'Материал'},course={id:courseId,titleRu:'Тестовый курс',modules:[{id:'module',title:'Модуль',lessons:[lesson]}],tariffs:[]};
async function run(mode){
  const browser=await chromium.launch(),context=await browser.newContext({viewport:{width:1200,height:900},serviceWorkers:'block'}), page=await context.newPage(),bad=[];
  let revoked=false,mediaRequests=0;
  await context.addCookies([{name:'sb-customer-token',value:'fixture-token',url:origin}]);
  await context.route('**/*',async route=>{
    const q=route.request(),u=new URL(q.url()),e=u.pathname.replace(/^\/api\/v1/,'');
    if(u.pathname.startsWith('/api/v1/')){
      const reply=(json,status=200)=>route.fulfill({status,json});
      if(e==='/products/storefront-content')return reply({settings:{},categories:[],banners:[],socialLinks:[],menuItems:[]});
      if(e==='/cart'||e==='/storefront/cart/bind')return reply({items:[],total:0});
      if(e==='/auth/me')return reply({id:'student',role:'CUSTOMER_B2C',email:'test@example.invalid'});
      if(e==='/storefront/favorites'||e==='/lms/certificates/my')return reply([]);
      if(e===`/lms/certificates/course/${courseId}`)return reply(null);
      if(e===`/lms/my/${courseId}`)return reply({id:'enrollment',courseId,course,progress:0,isCompleted:false,lessonsProgress:[]});
      if(e===`/lms/my/${courseId}/lessons/${lessonId}`)return reply(lesson);
      if(e===`/lms/my/${courseId}/lessons/${lessonId}/quiz`)return reply(null);
      if(e===`/lms/my/${courseId}/lessons/${lessonId}/assets`)return reply([{id:assetId,lessonId,filename:'Презентация.pdf',mimeType:'application/pdf',size:mode==='large'?51*1024*1024:pdf.length}]);
      if(e===`/lms/my/${courseId}/lessons/${lessonId}/assets/${assetId}/session`) {
        assert.equal(q.headers().authorization,'Bearer fixture-token');
        if(revoked)return reply({message:'Нет доступа'},403);
        return route.fulfill({json:{url:`/api/v1/lms/media/${assetId}`,expiresIn:300},headers:{'Set-Cookie':`fixture_asset=ok; HttpOnly; SameSite=Strict; Path=/api/v1/lms/media/${assetId}`}});
      }
      if(e===`/lms/media/${assetId}`){mediaRequests++;assert.match(q.headers().cookie||'',/fixture_asset=ok/);assert.equal(q.headers().authorization,undefined);return route.fulfill({status:200,body:pdf,headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','Content-Security-Policy':"sandbox; default-src 'none'",'X-Content-Type-Options':'nosniff'}});}
      bad.push(`${q.method()} ${e}`);return route.fulfill({status:403,json:{}});
    }
    if(u.origin!==origin||!['GET','HEAD'].includes(q.method())){bad.push('external request');return route.abort();}
    return route.continue();
  });
  try{
    await page.goto(`${origin}/courses/my/${courseId}`);await page.getByRole('button',{name:'Тестовый урок'}).click();await page.getByText('Презентация.pdf').waitFor();
    await page.getByRole('button',{name:'Открыть',exact:true}).click();
    if(mode==='large'){await page.getByText('Этот PDF слишком большой',{exact:false}).waitFor();assert.equal(mediaRequests,0);}
    else {
      await page.getByText('Страница 1 из 1').waitFor();
      const canvas=page.locator('.crm-pdf-viewer canvas');await canvas.waitFor();
      const darkPixels=await canvas.evaluate(el=>{const d=el.getContext('2d').getImageData(0,0,el.width,el.height).data;let count=0;for(let i=0;i<d.length;i+=4)if(d[i]<100&&d[i+1]<100&&d[i+2]<100&&d[i+3]>0)count++;return count});assert.ok(darkPixels>100,'PDF page contains rendered text');assert.equal(mediaRequests,1);
      fs.mkdirSync(path.join(__dirname,'../.screenshots/lms-media'),{recursive:true});await page.screenshot({path:path.join(__dirname,'../.screenshots/lms-media/pdf.png')});
      revoked=true;await page.getByRole('button',{name:'Открыт',exact:true}).click();await page.getByText('Не удалось открыть файл или доступ к нему закончился.',{exact:false}).waitFor();assert.equal(await page.locator('.crm-pdf-viewer canvas').count(),0);
    }
    assert.equal(await page.getByRole('link',{name:'Скачать презентацию PDF'}).count(),mode==='large'?1:0);
    assert.deepEqual(bad,[]);console.log(mode==='large'?'Large PDF offers download without fetching body PASS':'PDF.js renders synthetic PDF using scoped cookie; revocation closes viewer PASS');
  }finally{await context.close();await browser.close();}
}
run('normal').then(()=>run('large')).catch(e=>{console.error(e);process.exitCode=1});
