/* LMS authoring acceptance against a loopback frontend. Every API is mocked. */
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const { fixtures: baseFixtures } = require('./crm-rich-fixtures.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const origin = new URL(process.env.ADMIN_DESIGN_URL || 'http://127.0.0.1:3017').origin;
assert.ok(['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname));
const output = path.resolve(__dirname, '../.screenshots/crm-courses');
const access = { role:'ADMIN', permissions:[...new Set([...(baseFixtures.get('/auth/access')?.permissions || []),'lms.read','lms.write'])], denied:[] };
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch();
  try {
    for (const [width,dark] of [[1440,false],[390,true]]) {
      const f = await isolatedContext(browser,width,false,false,{ allowFixtureForms:true, fixtures:new Map([['/auth/access',access]]) });
      const {page,context}=f, calls=[];
      let course=null, fail=false, liveEnabled=false, live=null, sequence=0, cleanupPending=false, assetRows=[{id:'published-asset',lessonId:'lesson-2',filename:'Уже опубликовано.pdf',mimeType:'application/pdf',size:12,isPublished:false,everPublished:true,createdAt:new Date().toISOString()}];
      const clone = value => JSON.parse(JSON.stringify(value));
      await context.route('**/api/v1/lms/admin/**',async route=>{
        const request=route.request(), url=new URL(request.url()), endpoint=url.pathname, method=request.method();
        if(request.headers().authorization!=='Bearer mock-admin-design-not-a-valid-jwt') return route.fulfill({status:403,json:{message:'No fixture token'}});
        let body={};try{body=request.postDataJSON()||{};}catch{}
        calls.push({endpoint,method,body});
        if(fail){fail=false;return route.fulfill({status:503,json:{message:'Сервис временно недоступен'}});}
        if(/\/lessons\/lesson-\d+\/quiz$/.test(endpoint) && method==='GET') return route.fulfill({json:{revision:0,enabled:false,passingPercent:70,questions:[],isPublished:false,hasDraftChanges:false}});
        if(endpoint.endsWith('/lessons/lesson-2/assets')) {
          if(method==='GET')return route.fulfill({json:clone(assetRows)});
          if(method==='POST') { assert.equal(request.headers()['content-type'],'application/octet-stream'); assert.equal(decodeURIComponent(request.headers()['x-file-name']),'урок.pdf'); assert.equal(request.postDataBuffer().toString(),'%PDF-fixture'); const row={id:'asset-1',lessonId:'lesson-2',filename:'урок.pdf',mimeType:'application/pdf',size:12,isPublished:false,everPublished:false,createdAt:new Date().toISOString()};assetRows.push(row);const lesson=course?.modules[0]?.lessons.find(item=>item.id==='lesson-2');if(lesson){lesson.assets=clone(assetRows);if(lesson.isPublished)lesson.hasDraftChanges=true;}return route.fulfill({json:clone(row)}); }
        }
        if(/\/lessons\/lesson-\d+\/assets$/.test(endpoint) && method==='GET') return route.fulfill({json:[]});
        if(endpoint.endsWith('/lessons/lesson-2/assets/asset-1')&&method==='DELETE'){ assetRows=assetRows.filter(item=>item.id!=='asset-1');const lesson=course?.modules[0]?.lessons.find(item=>item.id==='lesson-2');if(lesson)lesson.assets=clone(assetRows);return route.fulfill({json:{status:cleanupPending?'cleanup_pending':'deleted'}}); }
        if(endpoint.includes('/live/') || endpoint.endsWith('/live')) {
          if(!liveEnabled)return route.fulfill({status:503,json:{message:'Эфиры временно недоступны'}});
          if(endpoint.endsWith('/hosts'))return route.fulfill({json:[{id:'mock-admin',name:'Дизайн Проверка'}]});
          if(endpoint.endsWith('/course/test-course'))return route.fulfill({json:live?[clone(live)]:[]});
          if(endpoint.endsWith('/live')&&method==='POST'){live={id:'live-1',...body,status:'SCHEDULED'};return route.fulfill({json:clone(live)});}
          if(endpoint.endsWith('/live-1/start')&&method==='POST'){live.status='LIVE';return route.fulfill({json:{id:live.id,status:live.status}});}
          if(endpoint.endsWith('/live-1/end')&&method==='POST'){live.status='ENDED';return route.fulfill({json:{id:live.id,status:live.status,disconnectPending:true}});}
          if(endpoint.endsWith('/live-1/join')&&method==='POST')return route.fulfill({status:503,json:{message:'Эфир пока недоступен'}});
          if(endpoint.endsWith('/live-1/chat')&&method==='GET')return route.fulfill({json:[{id:'message-1',authorId:'student',authorName:'Ученик',body:'Здравствуйте!',createdAt:new Date().toISOString()}]});
          return route.fulfill({status:404,json:{message:'Unexpected live fixture endpoint'}});
        }
        if(endpoint.endsWith('/courses')&&method==='GET')return route.fulfill({json:{items:course?[clone(course)]:[],total:course?1:0,page:1,pages:1}});
        if(endpoint.endsWith('/courses')&&method==='POST'){course={id:'test-course',status:'DRAFT',...body,tariffs:[],modules:[]};return route.fulfill({json:clone(course)});}
        if(endpoint.endsWith('/courses/test-course/cover')&&method==='POST') { assert.match(request.headers()['content-type'],/^multipart\/form-data;/);assert.ok(request.postDataBuffer().includes(Buffer.from('filename="cover.png"')));course.coverImageUrl='/api/v1/media/files/123e4567-e89b-42d3-a456-426614174001.png';return route.fulfill({json:{coverImageUrl:course.coverImageUrl}}); }
        if(endpoint.endsWith('/courses/test-course')&&method==='GET')return route.fulfill({json:clone(course)});
        if(endpoint.endsWith('/courses/test-course')&&method==='PATCH'){Object.assign(course,body);if(body.status==='PUBLISHED')for(const module of course.modules)for(const lesson of module.lessons){lesson.isPublished=true;lesson.hasDraftChanges=false;lesson.revision++;}return route.fulfill({json:clone(course)});}
        if(endpoint.endsWith('/courses/test-course/modules')&&method==='POST'){const row={id:'test-module',...body,lessons:[]};course.modules.push(row);return route.fulfill({json:clone(row)});}
        if(endpoint.endsWith('/modules/test-module/lessons')&&method==='POST'){const row={id:'lesson-'+(++sequence),...body,revision:0,isPublished:false,hasDraftChanges:false,assets:sequence===2?clone(assetRows):[]};course.modules[0].lessons.push(row);return route.fulfill({json:clone(row)});}
        if(/\/lessons\/lesson-[12]$/.test(endpoint)&&method==='PATCH'){const row=course.modules[0].lessons.find(item=>endpoint.endsWith('/'+item.id));if(body.revision!==row.revision)return route.fulfill({status:409,json:{message:'Урок изменён другим сотрудником'}});Object.assign(row,body,{revision:row.revision+1,hasDraftChanges:row.isPublished});return route.fulfill({json:clone(row)});}
        if(endpoint.endsWith('/courses/test-course/tariffs')&&method==='POST'){const row={id:'test-tariff',...body};course.tariffs.push(row);return route.fulfill({json:clone(row)});}
        if(endpoint.endsWith('/tariffs/test-tariff')&&method==='PATCH'){Object.assign(course.tariffs[0],body);return route.fulfill({json:clone(course.tariffs[0])});}
        return route.fulfill({status:404,json:{message:'Unexpected LMS fixture endpoint'}});
      });
      try {
        await context.addCookies([{name:'sarkisian-crm-theme',value:dark?'dark':'light',url:origin}]);
        await page.goto(origin+'/crm/courses');
        await page.getByRole('heading',{name:'Пока нет курсов'}).waitFor();
        fail=true; await page.getByRole('button',{name:'Обновить'}).click();
        await page.getByRole('alert').getByText('Сервис временно недоступен').waitFor();
        await page.getByRole('button',{name:'Обновить'}).click(); await page.getByRole('heading',{name:'Пока нет курсов'}).waitFor();
        await page.getByRole('button',{name:'Создать курс'}).first().click();
        await page.getByLabel('Название курса *').fill('Работа с гелем');
        await page.getByLabel('Описание',{exact:true}).fill('Обучение для мастеров');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('region',{name:'Обложка курса'}).waitFor();
        await page.getByLabel('Выбрать обложку').setInputFiles({name:'cover.png',mimeType:'image/png',buffer:Buffer.from('fixture-image')});
        await page.getByRole('button',{name:'Загрузить обложку'}).click();
        await page.getByText('Обложка обновлена.').waitFor();
        await page.getByRole('img',{name:'Обложка курса'}).waitFor();
        await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByRole('heading',{name:'Работа с гелем'}).waitFor();
        await page.getByRole('button',{name:'Добавить модуль'}).click();
        await page.getByLabel('Название модуля *').fill('Подготовка');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('heading',{name:'Подготовка'}).waitFor();
        await page.getByRole('button',{name:'Урок',exact:true}).click();
        await page.getByLabel('Название урока *').fill('Материалы');
        await page.getByLabel('Текст урока').fill('Выбираем материалы для работы.');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('region',{name:'Тест урока'}).waitFor();
        await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByText('Материалы',{exact:true}).waitFor();
        await page.getByRole('button',{name:'Урок',exact:true}).click();
        await page.getByLabel('Название урока *').fill('Презентация');
        await page.getByLabel('Тип урока').selectOption('PRESENTATION');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('region',{name:'Тест урока'}).waitFor();
        // Simulate another employee saving while this editor remains open.
        // Upload refreshes course data, but cannot refresh the form's revision.
        course.modules[0].lessons.find(item=>item.id==='lesson-2').revision++;
        await page.getByLabel('Выбрать файл').setInputFiles({name:'урок.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-fixture')});
        await page.getByText('Выбран файл: урок.pdf · 1 КБ').waitFor(); await page.getByRole('button',{name:'Отменить выбор'}).click(); assert.equal(await page.getByRole('button',{name:'Добавить файл'}).isDisabled(),true);
        await page.getByLabel('Выбрать файл').setInputFiles({name:'урок.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-fixture')});
        await page.getByRole('button',{name:'Добавить файл'}).click();
        await page.getByText('Файл добавлен к уроку.').waitFor(); await page.getByText('урок.pdf').waitFor();
        assert.equal(await page.getByRole('button',{name:'Удалить файл Уже опубликовано.pdf'}).count(),0);
        page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Удалить файл урок.pdf'}).click();await page.getByText('Файл удалён.').waitFor();assert.equal(await page.getByText('урок.pdf',{exact:true}).count(),0);
        await page.getByLabel('Выбрать файл').setInputFiles({name:'урок.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-fixture')});await page.getByRole('button',{name:'Добавить файл'}).click();await page.getByText('Файл добавлен к уроку.').waitFor();cleanupPending=true;page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Удалить файл урок.pdf'}).click();await page.getByText('Файл убран из урока. Очистка хранилища завершится позже.').waitFor();
        await page.getByLabel('Название урока *').fill('Несохранённый заголовок');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('alert').getByText('Урок изменился или был опубликован',{exact:false}).waitFor();
        assert.equal(await page.getByLabel('Название урока *').inputValue(),'Несохранённый заголовок','Conflict keeps the unsaved form');
        assert.equal(await page.getByRole('button',{name:'Сохранить',exact:true}).isDisabled(),true);
        page.once('dialog',dialog=>dialog.accept());
        await page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-assets.png`),fullPage:true});
        await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByRole('button',{name:'Урок',exact:true}).click();
        await page.getByLabel('Название урока *').fill('Вопросы и ответы');
        await page.getByLabel('Тип урока').selectOption('LIVE');
        await page.getByLabel('Описание эфира *').fill('Разбор вопросов участников.');
        assert.equal(await page.getByLabel('Разрешить открытый просмотр').count(),0);
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('region',{name:'Тест урока'}).waitFor();
        await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByText('Вопросы и ответы',{exact:true}).waitFor();
        await page.getByRole('tab',{name:'Эфиры'}).click();
        await page.getByRole('alert').getByText('Прямые эфиры готовятся.',{exact:false}).waitFor();
        assert.equal(await page.getByRole('button',{name:'Запланировать'}).count(),0);
        await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-live-unavailable.png`),fullPage:true});
        liveEnabled=true; await page.getByRole('button',{name:'Обновить',exact:true}).last().click();
        await page.getByRole('button',{name:'Запланировать',exact:true}).click();
        await page.getByLabel('Название эфира').fill('Вопросы с преподавателем');
        await page.getByLabel('Ведущий').selectOption('mock-admin');
        await page.getByLabel('Начало').fill('2027-01-02T10:00'); await page.getByLabel('Окончание').fill('2027-01-02T11:00');
        await page.getByRole('button',{name:'Запланировать',exact:true}).last().click();
        await page.getByText('Эфир запланирован.',{exact:true}).waitFor();
        await page.getByRole('button',{name:'Начать',exact:true}).click(); await page.getByText('Идёт эфир',{exact:true}).waitFor();
        await page.getByRole('button',{name:'Открыть студию',exact:true}).click();
        await page.getByRole('button',{name:'Подключиться к эфиру',exact:true}).click();
        await page.getByRole('alert').getByText('Не удалось подключиться к эфиру.',{exact:false}).waitFor();
        assert.equal(await page.getByRole('button',{name:'Включить камеру'}).count(),0,'No camera controls until media server confirms access');
        await page.locator('.course-live-studio').getByRole('button',{name:'Закрыть',exact:true}).click();
        await page.getByRole('button',{name:'Чат',exact:true}).click(); await page.getByText('Здравствуйте!',{exact:true}).waitFor();
        await page.evaluate(()=>window.scrollTo(0,0)); await page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-live-chat.png`),fullPage:true});
        page.removeAllListeners('dialog'); page.once('dialog', dialog=>dialog.accept()); await page.getByRole('button',{name:'Завершить',exact:true}).click(); await page.getByText('Завершён',{exact:true}).waitFor();
        await page.getByRole('status').filter({hasText:'отключение участников видеосервером ещё не подтверждено'}).waitFor();
        assert.equal(await page.getByRole('heading',{name:'Чат: Вопросы с преподавателем'}).count(),0,'Chat closes only after the server confirms the end');
        await page.getByRole('tab',{name:'Тарифы'}).click();
        await page.getByRole('button',{name:'Добавить тариф'}).click();
        await page.getByLabel('Название тарифа *').fill('Самостоятельно');
        await page.getByLabel('Цена, ₽ *').fill('4500');
        await page.getByLabel('Срок доступа, дней').fill('90');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByText('Самостоятельно',{exact:true}).waitFor();
        await page.getByRole('button',{name:'Опубликовать'}).click();
        await page.getByText('Курс опубликован',{exact:true}).waitFor();
        await page.getByRole('tab',{name:'Программа'}).click();
        assert.equal(await page.getByRole('button',{name:'Опубликовать изменения'}).count(),0);
        await page.getByRole('button',{name:'Изменить урок Материалы'}).click();
        await page.getByText('Вы редактируете черновик урока').waitFor();
        await page.getByText('После сохранения ученики продолжат видеть опубликованную версию.',{exact:false}).waitFor();
        await page.getByLabel('Текст урока').fill('Обновлённые материалы.');
        const firstLesson = course.modules[0].lessons.find(item=>item.id==='lesson-1');
        firstLesson.revision++; firstLesson.content='Текст другого сотрудника';
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('alert').getByText('Урок изменился или был опубликован',{exact:false}).waitFor();
        assert.equal(await page.getByLabel('Текст урока').inputValue(),'Обновлённые материалы.','Conflict keeps entered text');
        assert.equal(firstLesson.content,'Текст другого сотрудника','Stale form did not overwrite the newer version');
        page.once('dialog',dialog=>dialog.accept()); await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByRole('button',{name:'Изменить урок Материалы'}).click();
        assert.equal(await page.getByLabel('Текст урока').inputValue(),'Текст другого сотрудника');
        await page.getByLabel('Текст урока').fill('Обновлённые материалы.');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByText('Есть неопубликованные уроки или изменения').waitFor();
        await page.getByText('Есть неопубликованные изменения',{exact:true}).waitFor();
        await page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}-lesson-changes.png`),fullPage:true});
        page.removeAllListeners('dialog');page.once('dialog',dialog=>dialog.accept());
        await page.getByRole('button',{name:'Опубликовать изменения'}).click();
        await page.getByRole('status').getByText('Изменения уроков опубликованы').waitFor();
        assert.equal(await page.getByText('Есть неопубликованные уроки или изменения').count(),0);
        assert.equal(await page.getByRole('button',{name:'Опубликовать изменения'}).count(),0);
        await page.getByRole('button',{name:'Урок',exact:true}).click();
        await page.getByLabel('Название урока *').fill('Новый урок');
        await page.getByLabel('Текст урока').fill('Ещё один материал.');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('region',{name:'Тест урока'}).waitFor();
        await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByText('Новый урок не опубликован',{exact:true}).waitFor();
        page.once('dialog',dialog=>dialog.dismiss());
        await page.getByRole('button',{name:'Опубликовать изменения'}).click();
        assert.equal(await page.getByRole('button',{name:'Опубликовать изменения'}).count(),1,'Cancelled publication keeps pending lesson');
        page.once('dialog',dialog=>dialog.accept());
        await page.getByRole('button',{name:'Опубликовать изменения'}).click();
        await page.getByRole('status').getByText('Изменения уроков опубликованы').waitFor();
        assert.equal(await page.getByText('Новый урок не опубликован',{exact:true}).count(),0);
        await page.getByRole('button',{name:'Изменить урок Презентация'}).click();
        await page.getByLabel('Выбрать файл').setInputFiles({name:'урок.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-fixture')});
        await page.getByRole('button',{name:'Добавить файл'}).click();
        await page.getByText('Файл добавлен к уроку.').waitFor();
        await page.getByText('Не опубликован',{exact:true}).waitFor();
        await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByRole('button',{name:'Опубликовать изменения'}).waitFor();
        await page.getByRole('button',{name:'Изменить урок Презентация'}).click();
        await page.getByLabel('Тип урока').selectOption('TEXT');
        await page.getByLabel('Текст урока').fill('Текст вместо презентации.');
        await page.getByRole('button',{name:'Сохранить',exact:true}).click();
        await page.getByRole('button',{name:'Изменить урок Презентация'}).click();
        await page.getByRole('heading',{name:'Видео, изображения и презентации'}).waitFor();
        assert.equal(await page.getByLabel('Выбрать файл').count(),1,'A text lesson can include media');
        await page.getByRole('button',{name:'Удалить файл урок.pdf'}).waitFor();
        page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Удалить файл урок.pdf'}).click();
        await page.getByText('Файл убран из урока. Очистка хранилища завершится позже.').waitFor();
        await page.getByRole('button',{name:'Отмена',exact:true}).click();
        await page.getByRole('tab',{name:'Тарифы'}).click();
        assert.ok(calls.some(item=>item.method==='POST'&&item.endpoint.endsWith('/lessons')&&item.body.content==='Выбираем материалы для работы.'));
        assert.ok(calls.some(item=>item.method==='POST'&&item.endpoint.endsWith('/lessons')&&item.body.kind==='LIVE'&&item.body.isPreview===false&&item.body.content==='Разбор вопросов участников.'));
        assert.ok(calls.some(item=>item.method==='POST'&&item.endpoint.endsWith('/tariffs')&&item.body.price===4500&&item.body.accessDays===90));
        assert.ok(calls.some(item=>item.method==='PATCH'&&item.body.status==='PUBLISHED'));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,'No horizontal page overflow');
        const tariffGeometry=await page.locator('.course-tariff').evaluate(row=>{const text=[...row.querySelectorAll('strong,small')].flatMap(el=>{const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()]}),price=row.querySelector('b').getBoundingClientRect(),button=row.querySelector('button').getBoundingClientRect();const overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;return {textPrice:text.some(rect=>overlap(rect,price)),textButton:text.some(rect=>overlap(rect,button)),priceButton:overlap(price,button)};});
        assert.deepEqual(tariffGeometry,{textPrice:false,textButton:false,priceButton:false},'Tariff text, price and action must not overlap');
        await page.screenshot({path:path.join(output,`${width}-${dark?'dark':'light'}.png`),fullPage:true});
        assert.deepEqual(f.traffic.prohibitedWrites,[]); assert.deepEqual(f.traffic.unknownReads,[]); assert.deepEqual(f.traffic.externalRequests,[]);
        assert.ok(f.errors.filter(error=>error.includes('status of 503')).length>=1,'Expected simulated 503 responses');
        assert.deepEqual(f.errors.filter(error=>!error.includes('status of 503')&&!error.includes('status of 409')),[]);
        console.log(`${width}: create course, module, lesson, tariff and publish PASS`);
      } finally { await context.close(); }
    }
    {
      const readonly={...access,permissions:access.permissions.filter(item=>item!=='lms.write')};
      const f=await isolatedContext(browser,1440,false,false,{fixtures:new Map([['/auth/access',readonly],['/lms/admin/courses',{items:[],total:0,page:1,pages:1}]])});
      try { await f.page.goto(origin+'/crm/courses');await f.page.getByRole('heading',{name:'Пока нет курсов'}).waitFor();assert.equal(await f.page.getByRole('button',{name:'Создать курс'}).count(),0);assert.deepEqual(f.traffic.prohibitedWrites,[]);assert.deepEqual(f.errors,[]);console.log('Read-only LMS access shows no creation action PASS'); } finally { await f.context.close(); }
    }
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
