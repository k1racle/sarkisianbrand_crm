const fs=require('node:fs');
const {chromium}=require('playwright-core');
const candidates=[process.env.CRM_BROWSER,'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe',chromium.executablePath()];
const executablePath=candidates.find(p=>p&&fs.existsSync(p));
if(!executablePath)throw new Error('Set CRM_BROWSER to an installed Chromium executable');
module.exports={executablePath,headless:true};
