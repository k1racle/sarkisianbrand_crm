/** Auth redirects must stay on this application, including protocol-relative URLs. */
export function safeInternalRedirect(value: unknown, fallback: string): string {
  if(typeof value!=='string'||!/^\/(?!\/)/.test(value)||/[\\\u0000-\u001f\u007f]/.test(value))return fallback;
  try{
    const target=new URL(value,'https://sarkisian-workspace.invalid');
    if(target.origin!=='https://sarkisian-workspace.invalid'||/%(?:2f|5c)/i.test(target.pathname))return fallback;
    return target.pathname+target.search+target.hash;
  }catch{return fallback;}
}
