/* Synthetic datasets for every management destination. No application imports or live reads. */
const {fixtures:defaults,person,product,entity,document,smsSettings,ticket}=require('./crm-management-workspace-mock.cjs');
const date='2026-10-27T08:30:00Z';
const longName='Мария Александрова-Константинопольская';
const organization='Студия профессионального маникюра и обучения «Длинное название»';
const member={id:'qa-comfort-member',firstName:'Мария',lastName:'Александрова-Константинопольская',email:'maria.alexandrova.company@example.invalid',phone:'+79990000000',role:'MANAGER_B2B',accountType:'STAFF',isActive:true,createdAt:date,_count:{sessions:2},permissionOverrides:[],organizationMemberships:[]};
function primary(route){
 if(route==='/crm/buyers')return '/crm/customers';
 if(route==='/crm/orders')return '/admin/orders/list';
 if(route.includes('/marketplaces/'))return route.endsWith('/integrations')?'/marketplaces/integrations':'/marketplaces/orders';
 if(route.includes('/loyalty/'))return '/loyalty/admin/overview';
 if(route==='/crm/bloggers/gifts')return '/partners/admin/gifts';
 if(route==='/crm/partners/documents')return '/partners/admin/documents/workspace';
 if(route.startsWith('/crm/referrals/'))return '/partners/admin/REFERRAL/'+route.split('/').at(-1);
 if(route.startsWith('/crm/bloggers/'))return '/partners/admin/BLOGGER/'+route.split('/').at(-1);
 if(route==='/crm/promotions')return '/promotions';
 if(route==='/crm/gift-cards')return '/gift-cards/product';
 if(route==='/crm/messages')return '/admin/contact-messages';
 if(route==='/crm/support/knowledge')return '/helpdesk/knowledge';
 if(route.startsWith('/crm/support/'))return '/helpdesk/tickets';
 if(route.startsWith('/crm/reports/'))return '/leadership/overview';
 if(route==='/crm/settings/trash')return '/data-lifecycle/trash';
 if(route==='/crm/settings/audit')return '/audit';
 if(route==='/crm/settings/salon-subscription')return '/admin/salon-subscription';
 return '/system-settings/'+(route.split('/').at(-1)==='overview'?'dashboard':route.split('/').at(-1));
}
function empty(value,key=''){
 if(Array.isArray(value))return ['roles','permissions','eligibleDocumentTypes','denominations','fields','audiences','channels','workingDays'].includes(key)?value:[];
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='settings'?v:empty(v,k)]));
 return typeof value==='number'&&!['page','pages','limit','version','revision'].includes(key)?0:value;
}
function managementFixtures(mode='filled'){
 const map=defaults();
 const partners=Array.from({length:7},(_,i)=>({...person,id:'qa-comfort-partner-'+i,displayName:i?`Екатерина Смирнова ${i}`:longName,description:i?'Мастер и автор обзоров':'Длинное описание площадок партнёра, рабочего формата и аудитории, которое не должно перекрывать соседние столбцы.',channels:[{label:'Профессиональные материалы и обучение',url:'https://example.invalid/channel'}],user:{email:member.email},_count:{clicks:152+i,attributions:23+i,registrations:3}}));
 for(const kind of ['BLOGGER','REFERRAL'])for(const section of ['overview','participants','registrations','rewards','payouts','settings']){
  const key=`/partners/admin/${kind}/${section}`,current=map.get(key);
  const rows=section==='participants'?partners:section==='registrations'?partners.slice(0,4).map((p,i)=>({id:'registration-'+i,organizationId:'org-'+i,participant:p,organization:{id:'org-'+i,name:organization,inn:'0000000000',status:'ACTIVE'},amount:1500,unit:'RUB',verifiedAt:null,reward:{status:'PENDING'}})):partners.slice(0,5).map((p,i)=>({id:'reward-'+i,participant:p,amount:1250.75+i,unit:'RUB',status:section==='payouts'?(i?'APPROVED':'REQUESTED'):'APPROVED',createdAt:date,readyAt:date,order:{orderNumber:'SB-2026-00'+i},decisionNote:i?'Основание решения с подробным объяснением начисления':'',paymentReference:''}));
  map.set(key,{...current,settings:{...current.settings,name:'Партнёрская программа SARKISIAN',customerRewardMode:'PERCENT',fixedCustomerRewardAmount:500,firstOrderOnly:false,autoSettlement:true},rows,total:rows.length,summary:{participants:124,pending:8,uniqueVisitors:2784,registrations:18,totals:[{unit:'RUB',status:'APPROVED',_sum:{amount:42750}},{unit:'RUB',status:'PENDING',_sum:{amount:8500}}]}});
 }
 map.set('/partners/admin/documents/workspace',{templates:Array.from({length:5},(_,i)=>({...document,id:'template-'+i,title:i?'Акт оказанных информационных услуг за отчётный период':'Договор оказания информационных услуг и участия в партнёрской программе',version:i+1,isActive:i!==3})),entities:[{...entity,legalName:'ООО «Студия профессиональных материалов»'}],settings:smsSettings,smsIntegration:{configured:false,isEnabled:false}});
 map.set('/partners/admin/documents/participants',partners);map.set('/partners/admin/legal-entities',[entity,{...entity,id:'qa-ip',entityType:'IP',legalName:'ИП Александрова Мария Константиновна',inn:'000000000000',ogrn:'000000000000000'}]);
 map.set('/partners/admin/gifts',{participants:partners,products:[product],shipments:partners.slice(0,3).map((p,i)=>({id:'gift-'+i,createdAt:date,participant:p,order:{id:'gift-order-'+i,orderNumber:'GIFT-2026-00'+i,status:'ASSEMBLING',buyerName:p.displayName,isSynced1C:false,items:[{id:'gift-item-'+i,productName:product.productName+' камуфлирующий с шиммером',variantName:'30 мл',quantity:2}]}}))});
 map.set('/system-settings/staff',Array.from({length:9},(_,i)=>({...member,id:'qa-staff-'+i,lastName:i?'Соколова '+i:member.lastName,isActive:i!==5})));
 map.set('/system-settings/dashboard',{staff:24,activeStaff:21,sessions:32,permissions:86,auditToday:142,integrations:9,activeJobs:3,failedJobs:1});
 map.set('/audit',Array.from({length:8},(_,i)=>({id:'audit-'+i,createdAt:date,actor:member,action:'UPDATE',resource:'CUSTOMER',resourceId:'customer-with-a-long-id-1234567890-'+i,correlationId:'c11cc111-1111-4000-a000-000000000000',payload:{fields:['name','phone','managerId']}})));
 map.set('/system-settings/accounts',{items:[member,{...member,id:'qa-customer',accountType:'B2B',role:'CUSTOMER_B2B',b2bProfile:{companyName:organization}}],total:2,page:1,pages:1,totals:{all:2,staff:1,b2c:0,b2b:1,pendingChanges:0}});
 map.set('/system-settings/accounts/'+member.id,{...member,sessions:[]});
 map.set('/system-settings/profile-change-requests',[{id:'profile-change-1',user:member,createdAt:date,requestedData:{firstName:'Мария',lastName:'Александрова-Константинопольская',phone:'+79990000000'}}]);
 const permissions=[['crm.read','Просмотр задач и сделок'],['crm.write','Изменение задач и сделок'],['web_orders.read','Просмотр заказов'],['web_orders.write','Обработка заказов'],['helpdesk.read','Просмотр заявок поддержки'],['helpdesk.write','Изменение заявок поддержки']].map(([key,description])=>({key,description,resource:key.split('.')[0],action:key.split('.')[1],roles:['ADMIN','MANAGER_B2B']}));
 map.set('/system-settings/access',{roles:['ADMIN','MANAGER_B2B','WAREHOUSE','IT_SUPPORT'],permissions});
 for(let i=0;i<9;i++)map.set(`/system-settings/staff/qa-staff-${i}/access-review`,{employee:{...member,id:'qa-staff-'+i,department:{name:'Продажи'}},role:{label:'Менеджер B2B',description:'Работа с салонами и организациями'},dataVisibility:{message:'Доступ по действующей роли сотрудника.'},permissions:permissions.map((p,n)=>({...p,allowed:n%2===0,source:n%2?'NOT_GRANTED':'ROLE'}))});
 map.set('/system-settings/access-profiles/catalog',{assignmentReady:false,mode:'DRAFT_ONLY',message:'Назначение профилей не включено.',permissions,scopedPermissions:['crm.read','crm.write'],scopes:[{id:'OWN',label:'Свои записи'},{id:'COMPANY',label:'Вся компания'},{id:'SELECTED_DEPARTMENTS',label:'Выбранные отделы'}],departments:[{id:'qa-department',name:'Продажи и работа с салонами'}],templates:[{id:'sales',name:'Менеджер продаж',permissionKeys:['crm.read','web_orders.read']}]});
 const accessProfile={id:'qa-profile',name:'Менеджер по работе с салонами и партнёрами',description:'Заказы, обращения и задачи в собственном отделе.',version:1,archivedAt:null,grants:[{permissionKey:'crm.read',scope:'OWN',departmentIds:[]}],_count:{grants:1}};
 map.set('/system-settings/access-profiles',{assignmentReady:false,mode:'DRAFT_ONLY',items:[accessProfile],total:1,page:1,limit:30});map.set('/system-settings/access-profiles/qa-profile',{...accessProfile,grants:accessProfile.grants.map(g=>({...g,permission:permissions.find(p=>p.key===g.permissionKey),departments:g.departmentIds.map(departmentId=>({departmentId}))}))});
 map.set('/system-settings/integrations',[
  {key:'ONE_C',name:'1С:Управление торговлей',category:'ERP',provider:'ONE_C'},
  {key:'qa-delivery',name:'Служба доставки CDEK',category:'DELIVERY',provider:'CDEK'},
  {key:'TELEGRAM_B2B',name:'Бот для салонов и бизнес-клиентов',category:'BOT',provider:'TELEGRAM',audience:'B2B'},
  {key:'SMS_AERO',name:'SMS Aero',category:'COMMUNICATION',provider:'SMS_AERO'},
  {key:'OZON',name:'Ozon — кабинет профессиональных материалов',category:'MARKETPLACE',provider:'OZON'},
  {key:'YOOKASSA',name:'ЮKassa',category:'PAYMENT',provider:'YOOKASSA'},
  {key:'ATOL',name:'Онлайн-касса',category:'FISCAL',provider:'ATOL'}
 ].map((item,i)=>({...item,description:'Параметры подключения и состояние обмена. Синтетические данные без действующих ключей.',isEnabled:false,environment:'TEST',status:i===1?'ERROR':'NOT_CONFIGURED',documentationUrl:'https://example.invalid/docs',lastTestMessage:i===1?'Подключение требует проверки специалистом':'',fields:[{key:'endpoint',label:'Адрес подключения',type:'url',value:'https://example.invalid/integration',required:true},{key:'account',label:'Идентификатор учётной записи',type:'text',value:'company-example'},{key:'timeout',label:'Время ожидания, секунд',type:'number',value:30},{key:'secret',label:'Секретный ключ',type:'secret',configured:true,hint:'Заменяйте только при смене ключа.'},...(item.category==='BOT'?[{key:'webhookUrl',label:'Адрес webhook',type:'url',value:'https://example.invalid/webhook'}]:[])]})));
 map.set('/system-settings/bot-commands',Array.from({length:5},(_,i)=>({id:'command-'+i,command:i?'/orders_'+i:'/help',title:i?'Последние заказы и статус доставки':'Помощь по записи, заказам и работе с кабинетом',description:'Команда доступна выбранным аудиториям и каналам после проверки учётной записи.',isEnabled:i!==3,requiresAuth:true,audiences:['EMPLOYEE','B2B'],channels:['TELEGRAM','MAX'],responseText:'Откройте кабинет, чтобы посмотреть актуальную информацию.',actionType:'TEXT'})));
 map.set('/system-settings/bot-events',{items:[{id:'event-1',provider:'TELEGRAM',audience:'B2B',commandText:'/orders',externalUserId:'synthetic-user',status:'REQUIRES_AUTH',receivedAt:date}],identities:24,unlinked:2,statuses:{}});
 map.set('/data-lifecycle/trash',{items:Array.from({length:4},(_,i)=>({id:'trash-'+i,entityType:'CUSTOMER',entityId:'customer-'+i,displayName:i?`Тестовый клиент ${i}`:longName,reason:'Объединение дублей после проверки менеджером',status:'TRASHED',trashedAt:date,purgeAfter:'2099-01-01T00:00:00Z',canRestore:true,trashedBy:member})),total:4,page:1,pages:1});
 for(let i=0;i<4;i++)map.set('/data-lifecycle/CUSTOMER/customer-'+i+'/preview',{canRestore:true,canPurge:false,dependencies:[{key:'orders',label:'Связанные заказы',count:2,blocking:true}]});
 map.set('/system-settings/logs',{sync:[{id:'sync-1',system:'1C',action:'Обновление статусов заказов',status:'ERROR',createdAt:date}],integrations:[{id:'integration-1',channel:'OZON',shopName:organization,isActive:false,lastError:'Ожидает проверки администратором'}],recentAudit:[],queue:{connected:true,workerEnabled:false,counts:{}},jobs:[{id:'job-1',jobName:'ONE_C_SYNC',status:'FAILED',progress:40,attempts:2,maxAttempts:3,createdAt:date,canRetry:false,correlationId:'c11cc111-1111-4000-a000-000000000000',retryReason:'Соединение временно недоступно. Данные не переданы.'}]});
 map.set('/helpdesk/tickets',Array.from({length:6},(_,i)=>({...ticket(i+1),subject:i?'Уточнить условия поставки для салона '+i:'Не удаётся загрузить логотип и обновить данные салона в личном кабинете',requesterName:longName,requesterEmail:member.email,source:i%2?'B2B':'EMPLOYEE',priority:i?'MEDIUM':'HIGH'})));
 map.set('/helpdesk/agents',[member]);
 map.set('/helpdesk/dashboard',{total:6,new:2,inWork:3,waiting:1,overdue:1});
 const article={id:'qa-article',title:'Как проверить заказ, передать его на сборку и оформить отгрузку',category:'Рабочие процессы и клиентский сервис',excerpt:'Полная инструкция для менеджера: проверка оплаты, резервов и работы склада.',body:'Проверьте клиента и состав заказа.\n\nОткройте вкладку исполнения и проверьте доступные действия.',status:'PUBLISHED',version:1,createdAt:date,updatedAt:date,canWrite:true};
 map.set('/helpdesk/knowledge',{items:[article],categories:[{name:article.category,count:1}],total:1,page:1,pages:1,canWrite:true});map.set('/helpdesk/knowledge/qa-article',article);
 map.set('/marketplaces/orders',Array.from({length:6},(_,i)=>({canWrite:true,id:'market-'+i,externalId:'OZ-2026-12345678900'+i,orderNumber:'MP-2026-00'+i,channel:i%2?'WILDBERRIES':'OZON',status:i?'ASSEMBLING':'NEW',buyerName:longName,totalAmount:17440,createdAt:date,trackingNumber:'Трек-номер пока не присвоен'})));
 map.set('/marketplaces/integrations',[{channel:'OZON',shopName:organization,isActive:false}]);
 map.set('/leadership/overview',{access:{sales:true,customers:true,inventory:true,crm:true,helpdesk:true},sales:{revenue:284000,orders:84,averageOrder:3381,previousRevenue:240000,growth:18.3},customers:{total:328,new:42},operations:{lowStock:4,helpdeskOverdue:2,helpdeskOpen:8,activeTasks:17,openLeads:12},channels:[{channel:'WEB',orders:60,revenue:210000},{channel:'B2B',orders:24,revenue:74000}]});
 map.set('/admin/contact-messages',{items:[{id:'contact-1',name:longName,email:member.email,phone:'+79990000000',message:'Нужна консультация по условиям сотрудничества для сети салонов и по подбору материалов. '.repeat(5),createdAt:date,readAt:null}],total:1,unread:1,page:1,pages:1});
 const customer={...member,id:'qa-shop-customer',role:'CUSTOMER_B2C',type:'B2C',orders:[],totalSpent:42500};
 map.set('/crm/customers',[customer]);
 map.set('/admin/orders/list',{items:[{id:'qa-web-order',orderNumber:'SB-DESIGN-001',status:'NEW',paymentStatus:'PENDING',createdAt:date,totalAmount:1560,finalAmount:1560,user:customer,shippingProvider:'CDEK',deliveryMethod:'PVZ',shippingAddress:{city:'Тестовый город',pickupPointAddress:'Примерная улица, 1'},isSynced1C:false,items:[{id:'qa-web-line',productName:product.productName,variantName:'30 мл',quantity:2,price:780,total:1560}],history:[]}],total:1,page:1,limit:24});
 const loyaltySettings={programName:'SARKISIAN CLUB',isEnabled:true,earnPercent:1,maxWriteOffPercent:30,signupBonus:0,birthdayBonus:0,bonusValidityDays:365,proThreshold:3000,premiumThreshold:10000,proMultiplierPercent:120,premiumMultiplierPercent:150};
 map.set('/loyalty/admin/overview',{settings:loyaltySettings,summary:{participants:42,activeBalances:48750,earned:64000,spent:15250,operations:128},accounts:[{...customer,userId:customer.id,balance:1250,level:'START',entries:[{id:'qa-bonus',amount:1250,type:'ACCRUAL',reason:'Вознаграждение по партнёрской программе',createdAt:date}]}]});
 map.set('/promotions',{items:[{code:'DESIGN10',title:'Скидка для участников партнёрской программы',discountType:'PERCENT',amount:'10',minimumAmount:'1000',maximumDiscount:'500',usageLimit:100,perCustomerLimit:1,isActive:true,startsAt:null,endsAt:'2099-01-01T00:00:00Z',revision:1,reservedCount:1,appliedCount:2,usageCount:3}],total:1,page:1,limit:50});
 map.set('/gift-cards/product',{nameRu:'Подарочная карта SARKISIAN BRAND',descriptionRu:'Электронная карта для профессиональных материалов и инструментов.',denominations:[1000,3000,5000],validityDays:365,isActive:true,imageUrl:''});
 map.set('/gift-cards',{items:[{id:'123e4567-e89b-42d3-a456-426614174000',maskedCode:'••••-••••-••••-CDEF',faceValue:'1000',balance:'750',reserved:'100',issuedAt:date,expiresAt:'2099-01-01T00:00:00Z',isActive:true,revision:1,label:longName}],total:1,page:1,limit:30});
 if(mode==='empty')for(const [key,value]of map)if(!key.startsWith('/auth/')&&!key.includes('/work-time/')&&!key.includes('notifications'))map.set(key,empty(value));
 return map;
}
module.exports={managementFixtures,primary,member};
