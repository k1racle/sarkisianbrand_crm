import { ecosystemAutomationEnabled } from './ecosystem-automation';
describe('Local automation safety switch (no jobs/network/database)',()=>{
 const original=process.env.ECOSYSTEM_AUTOMATION_ENABLED;
 afterEach(()=>{if(original===undefined)delete process.env.ECOSYSTEM_AUTOMATION_ENABLED;else process.env.ECOSYSTEM_AUTOMATION_ENABLED=original;});
 it('keeps production default enabled',()=>{delete process.env.ECOSYSTEM_AUTOMATION_ENABLED;expect(ecosystemAutomationEnabled()).toBe(true);});
 it('explicit false stops autonomous processing',()=>{process.env.ECOSYSTEM_AUTOMATION_ENABLED='false';expect(ecosystemAutomationEnabled()).toBe(false);});
 it('explicit true enables normal processing',()=>{process.env.ECOSYSTEM_AUTOMATION_ENABLED='true';expect(ecosystemAutomationEnabled()).toBe(true);});
});
