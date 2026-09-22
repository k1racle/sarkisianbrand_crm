// Isolated browser interactions: all CRM writes hit in-memory fixtures, never API/DB.
const { chromium } = require('playwright-core');
const { isolatedContext } = require('./admin-design-mock.cjs');
const {pdf} = require('./crm-pdf-fixture.cjs');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const output = path.resolve(__dirname,'../.screenshots/crm-work');
const base='http://127.0.0.1:3001', api='http://localhost:3000/api/v1';
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const person={id:id(90),firstName:'Анна',lastName:'Соколова',email:'mock@example.invalid'};
const now='2026-09-22T09:00:00.000Z';
async function main() {
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try { for(const width of [360,390,1440]) {
    let nodes=[{id:id(1),name:'Документы',kind:'FOLDER',scope:'PERSONAL',parentId:null,size:0,updatedAt:now}, {id:id(2),name:'План работы.txt',kind:'FILE',scope:'PERSONAL',parentId:null,size:80,mime:'text/plain',updatedAt:now}, {id:id(3),name:'Техническое задание.docx',kind:'FILE',scope:'TEAM',parentId:null,size:120000,mime:'application/octet-stream',updatedAt:now}];
    let tasks=[{id:id(10),title:'Подготовить запуск коллекции',description:'Согласовать материалы с командой',assignedToId:person.id,assignedTo:person,status:'TODO',priority:'HIGH',progress:50,position:0,labels:[],children:[],comments:[],_count:{comments:0},createdAt:now}, {id:id(11),title:'Проверить макеты',assignedToId:person.id,assignedTo:person,status:'TODO',priority:'MEDIUM',progress:0,position:1,labels:[],children:[],comments:[],_count:{comments:0},createdAt:now}];
    let counter=100; const writes=[], links=[];
    nodes.push({id:id(4),name:'Презентация.pdf',kind:'FILE',scope:'PERSONAL',parentId:null,size:600,mime:'application/pdf',updatedAt:now});
    const fixtures = new Map([['/auth/access',{permissions:['crm.read','crm.write','admin.read','customers.read']}],['/crm/team',[person]],['/crm/leads',[]]]);
    const f=await isolatedContext(browser,width,false,false,{fixtures,allowFixtureForms:true});
    const page=f.page;
    page.removeAllListeners('dialog'); page.on('dialog',dialog=>dialog.accept());
    async function response(route,body,status=200,contentType='application/json') { await route.fulfill({status,contentType,headers:{'access-control-allow-origin':base,'access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'},body:contentType==='application/json'?JSON.stringify(body):body}); }
    await page.route('**/api/v1/crm/**',async route=>{
      const req=route.request(),url=new URL(req.url()),endpoint=url.pathname.replace('/api/v1/crm/',''),method=req.method();
      if(!endpoint.startsWith('drive') && !endpoint.startsWith('tasks')) return route.fallback();
      if(method==='OPTIONS') return response(route,{});
      if(method!=='GET') writes.push({endpoint,method});
      const body=method==='GET'||endpoint==='drive/upload'?{}:req.postDataJSON()||{};
      const match=endpoint.match(/^drive\/([^/]+)(?:\/(content|restore))?$/);
      if(endpoint==='drive' && method==='GET') {
        let items=nodes.filter(n=>n.scope===url.searchParams.get('scope') && (url.searchParams.get('view')==='trash'?n.deletedAt:!n.deletedAt));
        const parent=url.searchParams.get('parentId')||null,search=url.searchParams.get('search');
        if(search) items=items.filter(n=>n.name.toLowerCase().includes(search.toLowerCase())); else if(url.searchParams.get('view')==='files'||!url.searchParams.get('view')) items=items.filter(n=>n.parentId===parent);
        return response(route,{items,total:items.length,crumbs:parent?[{id:parent,name:'Документы'}]:[],used:120080,quota:1024**3});
      }
      if(endpoint==='drive/folders') { const node={id:id(++counter),...body,kind:'FOLDER',size:0,updatedAt:now}; nodes.push(node); return response(route,node); }
      if(endpoint==='drive/upload') { const node={id:id(++counter),name:'Загруженный.txt',scope:url.searchParams.get('scope'),parentId:url.searchParams.get('parentId')||null,kind:'FILE',mime:'text/plain',size:12,updatedAt:now}; nodes.push(node); return response(route,node); }
      if(match) {
        const node=nodes.find(n=>n.id===match[1]); if(!node) return response(route,{message:'Не найдено'},404);
        if(match[2]==='content') return response(route,node.mime==='application/pdf'?pdf():'План команды\n1. Проверить макеты\n2. Подготовить запуск',200,node.mime==='application/pdf'?'application/pdf':'text/plain');
        if(match[2]==='restore') node.deletedAt=null; else if(method==='DELETE') node.deletedAt=now; else if(method==='PATCH') Object.assign(node,body);
        return response(route,node);
      }
      if(endpoint==='tasks' && method==='GET') return response(route,tasks);
      if(endpoint==='tasks' && method==='POST') { const task={...tasks[1],...body,id:id(++counter),children:[],progress:0,comments:[],_count:{comments:0}}; tasks.push(task); const parent=tasks.find(t=>t.id===body.parentId); if(parent) parent.children.push(task); return response(route,task); }
      const tm=endpoint.match(/^tasks\/([^/]+)(?:\/(move|comments|files)(?:\/([^/]+))?)?$/);
      if(tm) {
        const task=tasks.find(t=>t.id===tm[1]); if(!task) return response(route,{},404);
        if(tm[2]==='files') {
          if(method==='GET') return response(route,links);
          if(method==='DELETE') { links.splice(links.findIndex(x=>x.nodeId===tm[3]),1); return response(route,{}); }
          const link={nodeId:body.nodeId,taskId:task.id,node:nodes.find(n=>n.id===body.nodeId)}; links.push(link); return response(route,link);
        }
        if(tm[2]==='comments') { const comment={id:id(++counter),body:body.body,author:person,createdAt:now}; task.comments.unshift(comment); task._count.comments++; return response(route,comment); }
        Object.assign(task,body); if(body.status==='DONE') task.progress=100;
        const parent=tasks.find(t=>t.id===task.parentId); if(parent) parent.progress=Math.round(parent.children.reduce((s,c)=>s+c.progress,0)/parent.children.length);
        return response(route,task);
      }
      throw new Error('Unmocked CRM endpoint: '+method+' '+endpoint);
    });
    try {
      await page.goto(base+'/crm/files',{waitUntil:'networkidle'});
      await page.getByRole('heading',{name:'Файлы',exact:true}).waitFor();
      await page.getByRole('button',{name:'Предпросмотр Презентация.pdf',exact:true}).click();
      await page.locator('.crm-pdf-text').waitFor();
      assert.match(await page.locator('.crm-pdf-text').textContent(),/CRM PDF preview/);
      assert.ok(await page.locator('.crm-pdf-stage canvas').evaluate(c=>c.width>100&&c.height>100),'PDF rendered to canvas');
      await page.screenshot({path:path.join(output,`pdf-${width}.png`)});
      await page.getByRole('button',{name:'Закрыть предпросмотр'}).click();
      await page.getByRole('button',{name:'Предпросмотр План работы.txt',exact:true}).click();
      await page.locator('.crm-preview-body pre').waitFor(); assert.match(await page.locator('.crm-preview-body pre').textContent(),/План команды/);
      await page.getByRole('button',{name:'Закрыть предпросмотр'}).click();
      await page.getByRole('button',{name:'Новая папка',exact:true}).click();
      await page.locator('.crm-drive-picker input').fill('Материалы'); await page.locator('.crm-drive-picker').getByRole('button',{name:'Сохранить',exact:true}).click();
      await page.getByRole('button',{name:'Открыть папку Материалы',exact:true}).waitFor();
      if(width>1000) {
        await page.locator('.crm-drive-item').filter({hasText:'План работы.txt'}).locator('strong').dragTo(page.locator('.crm-drive-item').filter({hasText:'Документы'}));
        await page.waitForFunction(()=>!document.querySelector('[aria-label="Предпросмотр План работы.txt"]'));
        assert.equal(nodes.find(n=>n.id===id(2)).parentId,id(1));
        await page.getByRole('button',{name:'Открыть папку Документы',exact:true}).click();
      }
      await page.getByRole('checkbox',{name:'Выбрать План работы.txt',exact:true}).check();
      await page.getByRole('button',{name:'Переместить',exact:true}).click();
      await page.locator('.crm-drive-picker').getByRole('button',{name:'Материалы',exact:true}).click();
      await page.getByRole('button',{name:'Переместить сюда'}).click();
      await page.locator('.crm-drive-picker').waitFor({state:'hidden'});
      await page.locator('.crm-drive-crumbs').getByRole('button',{name:'Мой диск',exact:true}).click();
      await page.getByRole('button',{name:'Открыть папку Материалы',exact:true}).click();
      await page.getByRole('button',{name:'Предпросмотр План работы.txt',exact:true}).waitFor();
      await page.getByRole('checkbox',{name:'Выбрать План работы.txt',exact:true}).check();
      await page.getByRole('button',{name:'В корзину',exact:true}).click();
      await page.getByRole('button',{name:'Корзина',exact:true}).click();
      await page.getByRole('checkbox',{name:'Выбрать План работы.txt',exact:true}).check();
      await page.getByRole('button',{name:'Восстановить',exact:true}).click();
      await page.getByRole('button',{name:'Мой диск',exact:true}).first().click();
      if(width>1000) await page.locator('.crm-drive-surface').evaluate(element=>{const transfer=new DataTransfer();transfer.items.add(new File(['safe demo'],'upload.txt',{type:'text/plain'}));element.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:transfer}));element.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));});
      else await page.locator('input[type=file]').setInputFiles({name:'upload.txt',mimeType:'text/plain',buffer:Buffer.from('safe demo')});
      await page.getByRole('button',{name:'Предпросмотр Загруженный.txt',exact:true}).waitFor();
      await page.getByRole('button',{name:'Закрыть загрузки'}).click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Drive mobile overflow');
      await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0)});
      await page.screenshot({path:path.join(output,`files-${width}.png`),fullPage:true});
      await page.goto(base+'/crm/tasks',{waitUntil:'networkidle'});
      const card=page.locator('.task-card').filter({hasText:'Подготовить запуск коллекции'});
      if(width>1000) {
        await card.locator('h3').dragTo(page.locator('[data-crm-drop="IN_PROGRESS"]'));
        await page.locator('[data-crm-drop="IN_PROGRESS"] .task-card').waitFor();
        assert.ok(writes.some(x=>x.endpoint===`tasks/${id(10)}/move`),'Whole title drag must move');
      } else {
        await card.scrollIntoViewIfNeeded();
        await card.evaluate(element=>{const r=element.getBoundingClientRect();const t=new Touch({identifier:1,target:element,clientX:r.left+r.width/2,clientY:r.top+40});element.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:[t],changedTouches:[t]}));});
        await page.waitForTimeout(420);
        await page.locator('[data-crm-drop="IN_PROGRESS"]').evaluate(element=>{
          element.scrollIntoView({block:'center',inline:'center'});
          const r=element.getBoundingClientRect(),x=Math.max(10,Math.min(innerWidth-10,r.left+r.width/2)),y=Math.max(100,Math.min(innerHeight-100,r.top+60));
          const t=new Touch({identifier:1,target:element,clientX:x,clientY:y});
          document.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[t],changedTouches:[t]}));
          document.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[t]}));
        });
        await page.locator('[data-crm-drop="IN_PROGRESS"] .task-card').waitFor();
        assert.ok(writes.some(x=>x.endpoint===`tasks/${id(10)}/move`),'Touch long-press moves card');
      }
      await card.focus(); await page.keyboard.press('Enter'); await page.getByRole('tab',{name:'Подзадачи',exact:true}).click(); await page.getByLabel('Название подзадачи').fill('Согласовать тексты');
      await page.getByRole('button',{name:'Подзадача',exact:true}).click(); await page.locator('.crm-subtask-row').waitFor();
      await page.getByRole('checkbox',{name:'Выполнено: Согласовать тексты'}).check();
      await page.getByRole('tab',{name:'Комментарии',exact:true}).click();
      await page.getByLabel('Текст комментария').fill('Проверила макеты.\nМожно согласовывать.');
      await page.getByRole('button',{name:'Отправить',exact:true}).click();
      await page.locator('.comment').filter({hasText:'Проверила макеты.'}).waitFor();
      await page.getByRole('tab',{name:'Вложения',exact:true}).click();
      await page.getByRole('button',{name:'С диска',exact:true}).click();
      await page.locator('.crm-drive-picker').getByRole('button',{name:'Техническое задание.docx'}).click();
      await page.locator('.crm-attachment').waitFor();
      await page.screenshot({path:path.join(output,`task-${width}.png`),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Task mobile overflow');
      const wrong=await page.locator('.crm-frame h1,.admin-dialog h2').evaluateAll(elements=>elements.filter(e=>getComputedStyle(e).fontSize!=='20px').map(e=>e.outerHTML.slice(0,120)));
      assert.deepEqual(wrong,[],'All headings 20px');
      assert.equal(f.errors.length,0,JSON.stringify(f.errors));
      for(const key of ['unknownReads','prohibitedWrites','credentialLeaks','externalRequests']) assert.deepEqual(f.traffic[key],[],key);
      console.log(width+'px drive folders/whole-card move/upload/trash/restore/preview and task subtasks/progress/comments/attachments PASS; mocked writes: '+writes.length);
    } catch(error) { await page.screenshot({path:path.join(output,`failure-${width}.png`),fullPage:true}); console.error('Browser:',f.errors,'writes:',writes,'alerts:',await page.locator('[role=alert]').allTextContents(),'overflow:',await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+5).slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,position:getComputedStyle(e).position})))); throw error; } finally { await f.context.close(); }
  }} finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
