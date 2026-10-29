/* Pure URL and provider-list validation; no network and no real payments. */
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {transformSync}=require('esbuild');
const source=fs.readFileSync(path.join(__dirname,'../shared/payment-providers.ts'),'utf8');
const ctx={module:{exports:{}},URL,Object,Set};
vm.runInNewContext(transformSync(source,{loader:'ts',format:'cjs',target:'node22'}).code,ctx);
const {officialPaymentUrl,paymentProviderList}=ctx.module.exports;
for(const [provider,url] of [['YOOKASSA','https://yookassa.ru/pay/123'],['TBANK','https://securepayments.tbank.ru/pay/123'],['TBANK','https://securepayments.tinkoff.ru/pay/123'],['ROBOKASSA','https://auth.robokassa.ru/Merchant/Index.aspx']]) assert.equal(officialPaymentUrl(url,provider,provider),url);
for(const [url,actual,expected] of [['http://auth.robokassa.ru/x','ROBOKASSA','ROBOKASSA'],['https://auth.robokassa.ru.evil.example/x','ROBOKASSA','ROBOKASSA'],['https://user@auth.robokassa.ru/x','ROBOKASSA','ROBOKASSA'],['https://securepayments.tbank.ru:8443/x','TBANK','TBANK'],['https://other.tbank.ru/x','TBANK','TBANK'],['https://auth.robokassa.ru/x','ROBOKASSA','TBANK'],['javascript:alert(1)','TBANK','TBANK']]) assert.throws(()=>officialPaymentUrl(url,actual,expected));
const result=paymentProviderList({providers:[{provider:'TBANK',available:true,environment:'TEST'},{provider:'UNKNOWN',available:true},{provider:'TBANK',available:true},{provider:'ROBOKASSA',available:'yes'}]});
assert.equal(result.length,1);assert.equal(result[0].provider,'TBANK');assert.equal(result[0].environment,'TEST');
assert.throws(()=>paymentProviderList({providers:null}));
console.log('Payment provider selection and HTTPS destination allowlist PASS; no network.');
