const fs=require('node:fs'),path=require('node:path');
module.exports=function componentCss(file){
 const css=fs.readFileSync(path.resolve(__dirname,'../assets/css/admin-components.css'),'utf8');
 const marker='/* Component: '+file+';';const start=css.indexOf(marker);
 if(start<0)throw Error('Missing central component CSS: '+file);
 const end=css.indexOf('/* Component:',start+marker.length);
 return css.slice(start,end<0?undefined:end);
};
