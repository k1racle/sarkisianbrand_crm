import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};globalThis.__timing__.logStart('Load chunks/_/nitro');import http from 'node:http';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { Buffer as Buffer$1 } from 'node:buffer';
import { promises, existsSync } from 'node:fs';
import { resolve as resolve$1, dirname as dirname$1, join } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const IM_RE = /\?/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
const ENC_ENC_SLASH_RE = /%252f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function encodePath(text) {
  return encode(text).replace(HASH_RE, "%23").replace(IM_RE, "%3F").replace(ENC_ENC_SLASH_RE, "%2F").replace(AMPERSAND_RE, "%26").replace(PLUS_RE, "%2B");
}
function decode$2(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode$2(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode$2(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode$2(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const PROTOCOL_SCRIPT_RE = /^[\s\0]*(blob|data|javascript|vbscript):$/i;
const TRAILING_SLASH_RE = /\/$|\/\?|\/#/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function isScriptProtocol(protocol) {
  return !!protocol && PROTOCOL_SCRIPT_RE.test(protocol);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/");
  }
  return TRAILING_SLASH_RE.test(input);
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
  if (!hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
  }
  const [s0, ...s] = path.split("?");
  const cleanPath = s0.endsWith("/") ? s0.slice(0, -1) : s0;
  return (cleanPath || "/") + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  if (!respectQueryAndFragment) {
    return input.endsWith("/") ? input : input + "/";
  }
  if (hasTrailingSlash(input, true)) {
    return input || "/";
  }
  let path = input;
  let fragment = "";
  const fragmentIndex = input.indexOf("#");
  if (fragmentIndex !== -1) {
    path = input.slice(0, fragmentIndex);
    fragment = input.slice(fragmentIndex);
    if (!path) {
      return fragment;
    }
  }
  const [s0, ...s] = path.split("?");
  return s0 + "/" + (s.length > 0 ? `?${s.join("?")}` : "") + fragment;
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    const nextChar = input[_base.length];
    if (!nextChar || nextChar === "/" || nextChar === "?") {
      return input;
    }
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const nextChar = input[_base.length];
  if (nextChar && nextChar !== "/" && nextChar !== "?") {
    return input;
  }
  const trimmed = input.slice(_base.length).replace(/^\/+/, "");
  return "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function getQuery$1(input) {
  return parseQuery(parseURL(input).search);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}
function joinRelativeURL(..._input) {
  const JOIN_SEGMENT_SPLIT_RE = /\/(?!\/)/;
  const input = _input.filter(Boolean);
  const segments = [];
  let segmentsDepth = 0;
  for (const i of input) {
    if (!i || i === "/") {
      continue;
    }
    for (const [sindex, s] of i.split(JOIN_SEGMENT_SPLIT_RE).entries()) {
      if (!s || s === ".") {
        continue;
      }
      if (s === "..") {
        if (segments.length === 1 && hasProtocol(segments[0])) {
          continue;
        }
        segments.pop();
        segmentsDepth--;
        continue;
      }
      if (sindex === 1 && segments[segments.length - 1]?.endsWith(":/")) {
        segments[segments.length - 1] += "/" + s;
        continue;
      }
      segments.push(s);
      segmentsDepth++;
    }
  }
  let url = segments.join("/");
  if (segmentsDepth >= 0) {
    if (input[0]?.startsWith("/") && !url.startsWith("/")) {
      url = "/" + url;
    } else if (input[0]?.startsWith("./") && !url.startsWith("./")) {
      url = "./" + url;
    }
  } else {
    url = "../".repeat(-1 * segmentsDepth) + url;
  }
  if (input[input.length - 1]?.endsWith("/") && !url.endsWith("/")) {
    url += "/";
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

const NullObject$1 = /* @__PURE__ */ (() => {
  const C = function() {
  };
  C.prototype = /* @__PURE__ */ Object.create(null);
  return C;
})();
function parse$1(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = new NullObject$1();
  const opt = {};
  const dec = opt.decode || decode$1;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode$1(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode$1(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode$1(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize$2(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") {
    throw new TypeError("option encode is invalid");
  }
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) {
    throw new TypeError("argument val is invalid");
  }
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    str += "; HttpOnly";
  }
  if (opt.secure) {
    str += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low": {
        str += "; Priority=Low";
        break;
      }
      case "medium": {
        str += "; Priority=Medium";
        break;
      }
      case "high": {
        str += "; Priority=High";
        break;
      }
      default: {
        throw new TypeError("option priority is invalid");
      }
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true: {
        str += "; SameSite=Strict";
        break;
      }
      case "lax": {
        str += "; SameSite=Lax";
        break;
      }
      case "strict": {
        str += "; SameSite=Strict";
        break;
      }
      case "none": {
        str += "; SameSite=None";
        break;
      }
      default: {
        throw new TypeError("option sameSite is invalid");
      }
    }
  }
  if (opt.partitioned) {
    str += "; Partitioned";
  }
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}

const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};

function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p) => options.strictTrailingSlash ? p : p.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i;
        node = node.placeholderChildren.find((c) => c.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}

function toRouteMatcher(router) {
  const table = _routerNodeToTable("", router.ctx.rootNode);
  return _createMatcher(table, router.ctx.options.strictTrailingSlash);
}
function _createMatcher(table, strictTrailingSlash) {
  return {
    ctx: { table },
    matchAll: (path) => _matchRoutes(path, table, strictTrailingSlash)
  };
}
function _createRouteTable() {
  return {
    static: /* @__PURE__ */ new Map(),
    wildcard: /* @__PURE__ */ new Map(),
    dynamic: /* @__PURE__ */ new Map()
  };
}
function _matchRoutes(path, table, strictTrailingSlash) {
  if (strictTrailingSlash !== true && path.endsWith("/")) {
    path = path.slice(0, -1) || "/";
  }
  const matches = [];
  for (const [key, value] of _sortRoutesMap(table.wildcard)) {
    if (path === key || path.startsWith(key + "/")) {
      matches.push(value);
    }
  }
  for (const [key, value] of _sortRoutesMap(table.dynamic)) {
    if (path.startsWith(key + "/")) {
      const subPath = "/" + path.slice(key.length).split("/").splice(2).join("/");
      matches.push(..._matchRoutes(subPath, value));
    }
  }
  const staticMatch = table.static.get(path);
  if (staticMatch) {
    matches.push(staticMatch);
  }
  return matches.filter(Boolean);
}
function _sortRoutesMap(m) {
  return [...m.entries()].sort((a, b) => a[0].length - b[0].length);
}
function _routerNodeToTable(initialPath, initialNode) {
  const table = _createRouteTable();
  function _addNode(path, node) {
    if (path) {
      if (node.type === NODE_TYPES.NORMAL && !(path.includes("*") || path.includes(":"))) {
        if (node.data) {
          table.static.set(path, node.data);
        }
      } else if (node.type === NODE_TYPES.WILDCARD) {
        table.wildcard.set(path.replace("/**", ""), node.data);
      } else if (node.type === NODE_TYPES.PLACEHOLDER) {
        const subTable = _routerNodeToTable("", node);
        if (node.data) {
          subTable.static.set("/", node.data);
        }
        table.dynamic.set(path.replace(/\/\*|\/:\w+/, ""), subTable);
        return;
      }
    }
    for (const [childPath, child] of node.children.entries()) {
      _addNode(`${path}/${childPath}`.replace("//", "/"), child);
    }
  }
  _addNode(initialPath, initialNode);
  return table;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = { ...defaults };
  for (const key of Object.keys(baseObject)) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();
const defuFn = createDefu((object, key, currentValue) => {
  if (object[key] !== void 0 && typeof currentValue === "function") {
    object[key] = currentValue(object[key]);
    return true;
  }
});

function o(n){throw new Error(`${n} is not implemented yet!`)}let i$1 = class i extends EventEmitter{__unenv__={};readableEncoding=null;readableEnded=true;readableFlowing=false;readableHighWaterMark=0;readableLength=0;readableObjectMode=false;readableAborted=false;readableDidRead=false;closed=false;errored=null;readable=false;destroyed=false;static from(e,t){return new i(t)}constructor(e){super();}_read(e){}read(e){}setEncoding(e){return this}pause(){return this}resume(){return this}isPaused(){return  true}unpipe(e){return this}unshift(e,t){}wrap(e){return this}push(e,t){return  false}_destroy(e,t){this.removeAllListeners();}destroy(e){return this.destroyed=true,this._destroy(e),this}pipe(e,t){return {}}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return this.destroy(),Promise.resolve()}async*[Symbol.asyncIterator](){throw o("Readable.asyncIterator")}iterator(e){throw o("Readable.iterator")}map(e,t){throw o("Readable.map")}filter(e,t){throw o("Readable.filter")}forEach(e,t){throw o("Readable.forEach")}reduce(e,t,r){throw o("Readable.reduce")}find(e,t){throw o("Readable.find")}findIndex(e,t){throw o("Readable.findIndex")}some(e,t){throw o("Readable.some")}toArray(e){throw o("Readable.toArray")}every(e,t){throw o("Readable.every")}flatMap(e,t){throw o("Readable.flatMap")}drop(e,t){throw o("Readable.drop")}take(e,t){throw o("Readable.take")}asIndexedPairs(e){throw o("Readable.asIndexedPairs")}};let l$1 = class l extends EventEmitter{__unenv__={};writable=true;writableEnded=false;writableFinished=false;writableHighWaterMark=0;writableLength=0;writableObjectMode=false;writableCorked=0;closed=false;errored=null;writableNeedDrain=false;writableAborted=false;destroyed=false;_data;_encoding="utf8";constructor(e){super();}pipe(e,t){return {}}_write(e,t,r){if(this.writableEnded){r&&r();return}if(this._data===void 0)this._data=e;else {const s=typeof this._data=="string"?Buffer$1.from(this._data,this._encoding||t||"utf8"):this._data,a=typeof e=="string"?Buffer$1.from(e,t||this._encoding||"utf8"):e;this._data=Buffer$1.concat([s,a]);}this._encoding=t,r&&r();}_writev(e,t){}_destroy(e,t){}_final(e){}write(e,t,r){const s=typeof t=="string"?this._encoding:"utf8",a=typeof t=="function"?t:typeof r=="function"?r:void 0;return this._write(e,s,a),true}setDefaultEncoding(e){return this}end(e,t,r){const s=typeof e=="function"?e:typeof t=="function"?t:typeof r=="function"?r:void 0;if(this.writableEnded)return s&&s(),this;const a=e===s?void 0:e;if(a){const u=t===s?void 0:t;this.write(a,u);}return this.writableEnded=true,this.writableFinished=true,this.emit("close"),this.emit("finish"),s&&s(),this}cork(){}uncork(){}destroy(e){return this.destroyed=true,delete this._data,this.removeAllListeners(),this}compose(e,t){throw new Error("Method not implemented.")}[Symbol.asyncDispose](){return Promise.resolve()}};const c=class{allowHalfOpen=true;_destroy;constructor(e=new i$1,t=new l$1){Object.assign(this,e),Object.assign(this,t),this._destroy=m(e._destroy,t._destroy);}};function _(){return Object.assign(c.prototype,i$1.prototype),Object.assign(c.prototype,l$1.prototype),c}function m(...n){return function(...e){for(const t of n)t(...e);}}const g=_();class A extends g{__unenv__={};bufferSize=0;bytesRead=0;bytesWritten=0;connecting=false;destroyed=false;pending=false;localAddress="";localPort=0;remoteAddress="";remoteFamily="";remotePort=0;autoSelectFamilyAttemptedAddresses=[];readyState="readOnly";constructor(e){super();}write(e,t,r){return  false}connect(e,t,r){return this}end(e,t,r){return this}setEncoding(e){return this}pause(){return this}resume(){return this}setTimeout(e,t){return this}setNoDelay(e){return this}setKeepAlive(e,t){return this}address(){return {}}unref(){return this}ref(){return this}destroySoon(){this.destroy();}resetAndDestroy(){const e=new Error("ERR_SOCKET_CLOSED");return e.code="ERR_SOCKET_CLOSED",this.destroy(e),this}}class y extends i$1{aborted=false;httpVersion="1.1";httpVersionMajor=1;httpVersionMinor=1;complete=true;connection;socket;headers={};trailers={};method="GET";url="/";statusCode=200;statusMessage="";closed=false;errored=null;readable=false;constructor(e){super(),this.socket=this.connection=e||new A;}get rawHeaders(){const e=this.headers,t=[];for(const r in e)if(Array.isArray(e[r]))for(const s of e[r])t.push(r,s);else t.push(r,e[r]);return t}get rawTrailers(){return []}setTimeout(e,t){return this}get headersDistinct(){return p(this.headers)}get trailersDistinct(){return p(this.trailers)}}function p(n){const e={};for(const[t,r]of Object.entries(n))t&&(e[t]=(Array.isArray(r)?r:[r]).filter(Boolean));return e}class w extends l$1{statusCode=200;statusMessage="";upgrading=false;chunkedEncoding=false;shouldKeepAlive=false;useChunkedEncodingByDefault=false;sendDate=false;finished=false;headersSent=false;strictContentLength=false;connection=null;socket=null;req;_headers={};constructor(e){super(),this.req=e;}assignSocket(e){e._httpMessage=this,this.socket=e,this.connection=e,this.emit("socket",e),this._flush();}_flush(){this.flushHeaders();}detachSocket(e){}writeContinue(e){}writeHead(e,t,r){e&&(this.statusCode=e),typeof t=="string"&&(this.statusMessage=t,t=void 0);const s=r||t;if(s&&!Array.isArray(s))for(const a in s)this.setHeader(a,s[a]);return this.headersSent=true,this}writeProcessing(){}setTimeout(e,t){return this}appendHeader(e,t){e=e.toLowerCase();const r=this._headers[e],s=[...Array.isArray(r)?r:[r],...Array.isArray(t)?t:[t]].filter(Boolean);return this._headers[e]=s.length>1?s:s[0],this}setHeader(e,t){return this._headers[e.toLowerCase()]=t,this}setHeaders(e){for(const[t,r]of Object.entries(e))this.setHeader(t,r);return this}getHeader(e){return this._headers[e.toLowerCase()]}getHeaders(){return this._headers}getHeaderNames(){return Object.keys(this._headers)}hasHeader(e){return e.toLowerCase()in this._headers}removeHeader(e){delete this._headers[e.toLowerCase()];}addTrailers(e){}flushHeaders(){}writeEarlyHints(e,t){typeof t=="function"&&t();}}const E=(()=>{const n=function(){};return n.prototype=Object.create(null),n})();function R(n={}){const e=new E,t=Array.isArray(n)||H(n)?n:Object.entries(n);for(const[r,s]of t)if(s){if(e[r]===void 0){e[r]=s;continue}e[r]=[...Array.isArray(e[r])?e[r]:[e[r]],...Array.isArray(s)?s:[s]];}return e}function H(n){return typeof n?.entries=="function"}function v(n={}){if(n instanceof Headers)return n;const e=new Headers;for(const[t,r]of Object.entries(n))if(r!==void 0){if(Array.isArray(r)){for(const s of r)e.append(t,String(s));continue}e.set(t,String(r));}return e}const S=new Set([101,204,205,304]);async function b(n,e){const t=new y,r=new w(t);t.url=e.url?.toString()||"/";let s;if(!t.url.startsWith("/")){const d=new URL(t.url);s=d.host,t.url=d.pathname+d.search+d.hash;}t.method=e.method||"GET",t.headers=R(e.headers||{}),t.headers.host||(t.headers.host=e.host||s||"localhost"),t.connection.encrypted=t.connection.encrypted||e.protocol==="https",t.body=e.body||null,t.__unenv__=e.context,await n(t,r);let a=r._data;(S.has(r.statusCode)||t.method.toUpperCase()==="HEAD")&&(a=null,delete r._headers["content-length"]);const u={status:r.statusCode,statusText:r.statusMessage,headers:r._headers,body:a};return t.destroy(),r.destroy(),u}async function C(n,e,t={}){try{const r=await b(n,{url:e,...t});return new Response(r.body,{status:r.status,statusText:r.statusText,headers:v(r.headers)})}catch(r){return new Response(r.toString(),{status:Number.parseInt(r.statusCode||r.code)||500,statusText:r.statusText})}}

function hasProp(obj, prop) {
  try {
    return prop in obj;
  } catch {
    return false;
  }
}

class H3Error extends Error {
  static __h3_error__ = true;
  statusCode = 500;
  fatal = false;
  unhandled = false;
  statusMessage;
  data;
  cause;
  constructor(message, opts = {}) {
    super(message, opts);
    if (opts.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
  toJSON() {
    const obj = {
      message: this.message,
      statusCode: sanitizeStatusCode(this.statusCode, 500)
    };
    if (this.statusMessage) {
      obj.statusMessage = sanitizeStatusMessage(this.statusMessage);
    }
    if (this.data !== void 0) {
      obj.data = this.data;
    }
    return obj;
  }
}
function createError$1(input) {
  if (typeof input === "string") {
    return new H3Error(input);
  }
  if (isError(input)) {
    return input;
  }
  const err = new H3Error(input.message ?? input.statusMessage ?? "", {
    cause: input.cause || input
  });
  if (hasProp(input, "stack")) {
    try {
      Object.defineProperty(err, "stack", {
        get() {
          return input.stack;
        }
      });
    } catch {
      try {
        err.stack = input.stack;
      } catch {
      }
    }
  }
  if (input.data) {
    err.data = input.data;
  }
  if (input.statusCode) {
    err.statusCode = sanitizeStatusCode(input.statusCode, err.statusCode);
  } else if (input.status) {
    err.statusCode = sanitizeStatusCode(input.status, err.statusCode);
  }
  if (input.statusMessage) {
    err.statusMessage = input.statusMessage;
  } else if (input.statusText) {
    err.statusMessage = input.statusText;
  }
  if (err.statusMessage) {
    const originalMessage = err.statusMessage;
    const sanitizedMessage = sanitizeStatusMessage(err.statusMessage);
    if (sanitizedMessage !== originalMessage) {
      console.warn(
        "[h3] Please prefer using `message` for longer error messages instead of `statusMessage`. In the future, `statusMessage` will be sanitized by default."
      );
    }
  }
  if (input.fatal !== void 0) {
    err.fatal = input.fatal;
  }
  if (input.unhandled !== void 0) {
    err.unhandled = input.unhandled;
  }
  return err;
}
function sendError(event, error, debug) {
  if (event.handled) {
    return;
  }
  const h3Error = isError(error) ? error : createError$1(error);
  const responseBody = {
    statusCode: h3Error.statusCode,
    statusMessage: h3Error.statusMessage,
    stack: [],
    data: h3Error.data
  };
  if (debug) {
    responseBody.stack = (h3Error.stack || "").split("\n").map((l) => l.trim());
  }
  if (event.handled) {
    return;
  }
  const _code = Number.parseInt(h3Error.statusCode);
  setResponseStatus(event, _code, h3Error.statusMessage);
  event.node.res.setHeader("content-type", MIMES.json);
  event.node.res.end(JSON.stringify(responseBody, void 0, 2));
}
function isError(input) {
  return input?.constructor?.__h3_error__ === true;
}

function getQuery(event) {
  return getQuery$1(event.path || "");
}
function isMethod(event, expected, allowHead) {
  if (typeof expected === "string") {
    if (event.method === expected) {
      return true;
    }
  } else if (expected.includes(event.method)) {
    return true;
  }
  return false;
}
function assertMethod(event, expected, allowHead) {
  if (!isMethod(event, expected)) {
    throw createError$1({
      statusCode: 405,
      statusMessage: "HTTP method is not allowed."
    });
  }
}
function getRequestHeaders(event) {
  const _headers = {};
  for (const key in event.node.req.headers) {
    const val = event.node.req.headers[key];
    _headers[key] = Array.isArray(val) ? val.filter(Boolean).join(", ") : val;
  }
  return _headers;
}
function getRequestHeader(event, name) {
  const headers = getRequestHeaders(event);
  const value = headers[name.toLowerCase()];
  return value;
}
function getRequestHost(event, opts = {}) {
  if (opts.xForwardedHost) {
    const _header = event.node.req.headers["x-forwarded-host"];
    const xForwardedHost = (_header || "").split(",").shift()?.trim();
    if (xForwardedHost) {
      return xForwardedHost;
    }
  }
  return event.node.req.headers.host || "localhost";
}
function getRequestProtocol(event, opts = {}) {
  if (opts.xForwardedProto !== false && event.node.req.headers["x-forwarded-proto"] === "https") {
    return "https";
  }
  return event.node.req.connection?.encrypted ? "https" : "http";
}
function getRequestURL(event, opts = {}) {
  const host = getRequestHost(event, opts);
  const protocol = getRequestProtocol(event, opts);
  const path = (event.node.req.originalUrl || event.path).replace(
    /^[/\\]+/g,
    "/"
  );
  return new URL(path, `${protocol}://${host}`);
}

const RawBodySymbol = Symbol.for("h3RawBody");
const PayloadMethods$1 = ["PATCH", "POST", "PUT", "DELETE"];
function readRawBody(event, encoding = "utf8") {
  assertMethod(event, PayloadMethods$1);
  const _rawBody = event._requestBody || event.web?.request?.body || event.node.req[RawBodySymbol] || event.node.req.rawBody || event.node.req.body;
  if (_rawBody) {
    const promise2 = Promise.resolve(_rawBody).then((_resolved) => {
      if (Buffer.isBuffer(_resolved)) {
        return _resolved;
      }
      if (typeof _resolved.pipeTo === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.pipeTo(
            new WritableStream({
              write(chunk) {
                chunks.push(chunk);
              },
              close() {
                resolve(Buffer.concat(chunks));
              },
              abort(reason) {
                reject(reason);
              }
            })
          ).catch(reject);
        });
      } else if (typeof _resolved.pipe === "function") {
        return new Promise((resolve, reject) => {
          const chunks = [];
          _resolved.on("data", (chunk) => {
            chunks.push(chunk);
          }).on("end", () => {
            resolve(Buffer.concat(chunks));
          }).on("error", reject);
        });
      }
      if (_resolved.constructor === Object) {
        return Buffer.from(JSON.stringify(_resolved));
      }
      if (_resolved instanceof URLSearchParams) {
        return Buffer.from(_resolved.toString());
      }
      if (_resolved instanceof FormData) {
        return new Response(_resolved).bytes().then((uint8arr) => Buffer.from(uint8arr));
      }
      return Buffer.from(_resolved);
    });
    return encoding ? promise2.then((buff) => buff.toString(encoding)) : promise2;
  }
  if (!Number.parseInt(event.node.req.headers["content-length"] || "") && !/\bchunked\b/i.test(
    String(event.node.req.headers["transfer-encoding"] ?? "")
  )) {
    return Promise.resolve(void 0);
  }
  const promise = event.node.req[RawBodySymbol] = new Promise(
    (resolve, reject) => {
      const bodyData = [];
      event.node.req.on("error", (err) => {
        reject(err);
      }).on("data", (chunk) => {
        bodyData.push(chunk);
      }).on("end", () => {
        resolve(Buffer.concat(bodyData));
      });
    }
  );
  const result = encoding ? promise.then((buff) => buff.toString(encoding)) : promise;
  return result;
}
function getRequestWebStream(event) {
  if (!PayloadMethods$1.includes(event.method)) {
    return;
  }
  const bodyStream = event.web?.request?.body || event._requestBody;
  if (bodyStream) {
    return bodyStream;
  }
  const _hasRawBody = RawBodySymbol in event.node.req || "rawBody" in event.node.req || "body" in event.node.req || "__unenv__" in event.node.req;
  if (_hasRawBody) {
    return new ReadableStream({
      async start(controller) {
        const _rawBody = await readRawBody(event, false);
        if (_rawBody) {
          controller.enqueue(_rawBody);
        }
        controller.close();
      }
    });
  }
  return new ReadableStream({
    start: (controller) => {
      event.node.req.on("data", (chunk) => {
        controller.enqueue(chunk);
      });
      event.node.req.on("end", () => {
        controller.close();
      });
      event.node.req.on("error", (err) => {
        controller.error(err);
      });
    }
  });
}

function handleCacheHeaders(event, opts) {
  const cacheControls = ["public", ...opts.cacheControls || []];
  let cacheMatched = false;
  if (opts.maxAge !== void 0) {
    cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
  }
  if (opts.modifiedTime) {
    const modifiedTime = new Date(opts.modifiedTime);
    const ifModifiedSince = event.node.req.headers["if-modified-since"];
    event.node.res.setHeader("last-modified", modifiedTime.toUTCString());
    if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) {
      cacheMatched = true;
    }
  }
  if (opts.etag) {
    event.node.res.setHeader("etag", opts.etag);
    const ifNonMatch = event.node.req.headers["if-none-match"];
    if (ifNonMatch === opts.etag) {
      cacheMatched = true;
    }
  }
  event.node.res.setHeader("cache-control", cacheControls.join(", "));
  if (cacheMatched) {
    event.node.res.statusCode = 304;
    if (!event.handled) {
      event.node.res.end();
    }
    return true;
  }
  return false;
}

const MIMES = {
  html: "text/html",
  json: "application/json"
};

const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) {
    return defaultStatusCode;
  }
  if (typeof statusCode === "string") {
    statusCode = Number.parseInt(statusCode, 10);
  }
  if (statusCode < 100 || statusCode > 999) {
    return defaultStatusCode;
  }
  return statusCode;
}

function getDistinctCookieKey(name, opts) {
  return [name, opts.domain || "", opts.path || "/"].join(";");
}

function parseCookies(event) {
  return parse$1(event.node.req.headers.cookie || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, serializeOptions = {}) {
  if (!serializeOptions.path) {
    serializeOptions = { path: "/", ...serializeOptions };
  }
  const newCookie = serialize$2(name, value, serializeOptions);
  const currentCookies = splitCookiesString(
    event.node.res.getHeader("set-cookie")
  );
  if (currentCookies.length === 0) {
    event.node.res.setHeader("set-cookie", newCookie);
    return;
  }
  const newCookieKey = getDistinctCookieKey(name, serializeOptions);
  event.node.res.removeHeader("set-cookie");
  for (const cookie of currentCookies) {
    const parsed = parseSetCookie(cookie);
    const key = getDistinctCookieKey(parsed.name, parsed);
    if (key === newCookieKey) {
      continue;
    }
    event.node.res.appendHeader("set-cookie", cookie);
  }
  event.node.res.appendHeader("set-cookie", newCookie);
}
function deleteCookie(event, name, serializeOptions) {
  setCookie(event, name, "", {
    ...serializeOptions,
    maxAge: 0
  });
}
function splitCookiesString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitCookiesString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

const defer = typeof setImmediate === "undefined" ? (fn) => fn() : setImmediate;
function send(event, data, type) {
  if (type) {
    defaultContentType(event, type);
  }
  return new Promise((resolve) => {
    defer(() => {
      if (!event.handled) {
        event.node.res.end(data);
      }
      resolve();
    });
  });
}
function sendNoContent(event, code) {
  if (event.handled) {
    return;
  }
  if (!code && event.node.res.statusCode !== 200) {
    code = event.node.res.statusCode;
  }
  const _code = sanitizeStatusCode(code, 204);
  if (_code === 204) {
    event.node.res.removeHeader("content-length");
  }
  event.node.res.writeHead(_code);
  event.node.res.end();
}
function setResponseStatus(event, code, text) {
  if (code) {
    event.node.res.statusCode = sanitizeStatusCode(
      code,
      event.node.res.statusCode
    );
  }
  if (text) {
    event.node.res.statusMessage = sanitizeStatusMessage(text);
  }
}
function getResponseStatus(event) {
  return event.node.res.statusCode;
}
function getResponseStatusText(event) {
  return event.node.res.statusMessage;
}
function defaultContentType(event, type) {
  if (type && event.node.res.statusCode !== 304 && !event.node.res.getHeader("content-type")) {
    event.node.res.setHeader("content-type", type);
  }
}
function sendRedirect(event, location, code = 302) {
  event.node.res.statusCode = sanitizeStatusCode(
    code,
    event.node.res.statusCode
  );
  event.node.res.setHeader("location", location);
  const encodedLoc = location.replace(/"/g, "%22");
  const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`;
  return send(event, html, MIMES.html);
}
function getResponseHeader(event, name) {
  return event.node.res.getHeader(name);
}
function setResponseHeaders(event, headers) {
  for (const [name, value] of Object.entries(headers)) {
    event.node.res.setHeader(
      name,
      value
    );
  }
}
const setHeaders = setResponseHeaders;
function setResponseHeader(event, name, value) {
  event.node.res.setHeader(name, value);
}
const setHeader = setResponseHeader;
function appendResponseHeader(event, name, value) {
  let current = event.node.res.getHeader(name);
  if (!current) {
    event.node.res.setHeader(name, value);
    return;
  }
  if (!Array.isArray(current)) {
    current = [current.toString()];
  }
  event.node.res.setHeader(name, [...current, value]);
}
function removeResponseHeader(event, name) {
  return event.node.res.removeHeader(name);
}
function isStream(data) {
  if (!data || typeof data !== "object") {
    return false;
  }
  if (typeof data.pipe === "function") {
    if (typeof data._read === "function") {
      return true;
    }
    if (typeof data.abort === "function") {
      return true;
    }
  }
  if (typeof data.pipeTo === "function") {
    return true;
  }
  return false;
}
function isWebResponse(data) {
  return typeof Response !== "undefined" && data instanceof Response;
}
function sendStream(event, stream) {
  if (!stream || typeof stream !== "object") {
    throw new Error("[h3] Invalid stream provided.");
  }
  event.node.res._data = stream;
  if (!event.node.res.socket) {
    event._handled = true;
    return Promise.resolve();
  }
  if (hasProp(stream, "pipeTo") && typeof stream.pipeTo === "function") {
    return stream.pipeTo(
      new WritableStream({
        write(chunk) {
          event.node.res.write(chunk);
        }
      })
    ).then(() => {
      event.node.res.end();
    });
  }
  if (hasProp(stream, "pipe") && typeof stream.pipe === "function") {
    return new Promise((resolve, reject) => {
      stream.pipe(event.node.res);
      if (stream.on) {
        stream.on("end", () => {
          event.node.res.end();
          resolve();
        });
        stream.on("error", (error) => {
          reject(error);
        });
      }
      event.node.res.on("close", () => {
        if (stream.abort) {
          stream.abort();
        }
      });
    });
  }
  throw new Error("[h3] Invalid or incompatible stream provided.");
}
function sendWebResponse(event, response) {
  for (const [key, value] of response.headers) {
    if (key === "set-cookie") {
      event.node.res.appendHeader(key, splitCookiesString(value));
    } else {
      event.node.res.setHeader(key, value);
    }
  }
  if (response.status) {
    event.node.res.statusCode = sanitizeStatusCode(
      response.status,
      event.node.res.statusCode
    );
  }
  if (response.statusText) {
    event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  }
  if (response.redirected) {
    event.node.res.setHeader("location", response.url);
  }
  if (!response.body) {
    event.node.res.end();
    return;
  }
  return sendStream(event, response.body);
}

const PayloadMethods = /* @__PURE__ */ new Set(["PATCH", "POST", "PUT", "DELETE"]);
const ignoredHeaders = /* @__PURE__ */ new Set([
  "transfer-encoding",
  "accept-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "host",
  "accept"
]);
async function proxyRequest(event, target, opts = {}) {
  let body;
  let duplex;
  if (PayloadMethods.has(event.method)) {
    if (opts.streamRequest) {
      body = getRequestWebStream(event);
      duplex = "half";
    } else {
      body = await readRawBody(event, false).catch(() => void 0);
    }
  }
  const method = opts.fetchOptions?.method || event.method;
  const fetchHeaders = mergeHeaders$1(
    getProxyRequestHeaders(event, { host: target.startsWith("/") }),
    opts.fetchOptions?.headers,
    opts.headers
  );
  return sendProxy(event, target, {
    ...opts,
    fetchOptions: {
      method,
      body,
      duplex,
      ...opts.fetchOptions,
      headers: fetchHeaders
    }
  });
}
async function sendProxy(event, target, opts = {}) {
  let response;
  try {
    response = await _getFetch(opts.fetch)(target, {
      headers: opts.headers,
      ignoreResponseError: true,
      // make $ofetch.raw transparent
      ...opts.fetchOptions
    });
  } catch (error) {
    throw createError$1({
      status: 502,
      statusMessage: "Bad Gateway",
      cause: error
    });
  }
  event.node.res.statusCode = sanitizeStatusCode(
    response.status,
    event.node.res.statusCode
  );
  event.node.res.statusMessage = sanitizeStatusMessage(response.statusText);
  const cookies = [];
  for (const [key, value] of response.headers.entries()) {
    if (key === "content-encoding") {
      continue;
    }
    if (key === "content-length") {
      continue;
    }
    if (key === "set-cookie") {
      cookies.push(...splitCookiesString(value));
      continue;
    }
    event.node.res.setHeader(key, value);
  }
  if (cookies.length > 0) {
    event.node.res.setHeader(
      "set-cookie",
      cookies.map((cookie) => {
        if (opts.cookieDomainRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookieDomainRewrite,
            "domain"
          );
        }
        if (opts.cookiePathRewrite) {
          cookie = rewriteCookieProperty(
            cookie,
            opts.cookiePathRewrite,
            "path"
          );
        }
        return cookie;
      })
    );
  }
  if (opts.onResponse) {
    await opts.onResponse(event, response);
  }
  if (response._data !== void 0) {
    return response._data;
  }
  if (event.handled) {
    return;
  }
  if (opts.sendStream === false) {
    const data = new Uint8Array(await response.arrayBuffer());
    return event.node.res.end(data);
  }
  if (response.body) {
    for await (const chunk of response.body) {
      event.node.res.write(chunk);
    }
  }
  return event.node.res.end();
}
function getProxyRequestHeaders(event, opts) {
  const headers = /* @__PURE__ */ Object.create(null);
  const reqHeaders = getRequestHeaders(event);
  for (const name in reqHeaders) {
    if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
      headers[name] = reqHeaders[name];
    }
  }
  return headers;
}
function fetchWithEvent(event, req, init, options) {
  return _getFetch(options?.fetch)(req, {
    ...init,
    context: init?.context || event.context,
    headers: {
      ...getProxyRequestHeaders(event, {
        host: typeof req === "string" && req.startsWith("/")
      }),
      ...init?.headers
    }
  });
}
function _getFetch(_fetch) {
  if (_fetch) {
    return _fetch;
  }
  if (globalThis.fetch) {
    return globalThis.fetch;
  }
  throw new Error(
    "fetch is not available. Try importing `node-fetch-native/polyfill` for Node.js."
  );
}
function rewriteCookieProperty(header, map, property) {
  const _map = typeof map === "string" ? { "*": map } : map;
  return header.replace(
    new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"),
    (match, prefix, previousValue) => {
      let newValue;
      if (previousValue in _map) {
        newValue = _map[previousValue];
      } else if ("*" in _map) {
        newValue = _map["*"];
      } else {
        return match;
      }
      return newValue ? prefix + newValue : "";
    }
  );
}
function mergeHeaders$1(defaults, ...inputs) {
  const _inputs = inputs.filter(Boolean);
  if (_inputs.length === 0) {
    return defaults;
  }
  const merged = new Headers(defaults);
  for (const input of _inputs) {
    const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
    for (const [key, value] of entries) {
      if (value !== void 0) {
        merged.set(key, value);
      }
    }
  }
  return merged;
}

class H3Event {
  "__is_event__" = true;
  // Context
  node;
  // Node
  web;
  // Web
  context = {};
  // Shared
  // Request
  _method;
  _path;
  _headers;
  _requestBody;
  // Response
  _handled = false;
  // Hooks
  _onBeforeResponseCalled;
  _onAfterResponseCalled;
  constructor(req, res) {
    this.node = { req, res };
  }
  // --- Request ---
  get method() {
    if (!this._method) {
      this._method = (this.node.req.method || "GET").toUpperCase();
    }
    return this._method;
  }
  get path() {
    return this._path || this.node.req.url || "/";
  }
  get headers() {
    if (!this._headers) {
      this._headers = _normalizeNodeHeaders(this.node.req.headers);
    }
    return this._headers;
  }
  // --- Respoonse ---
  get handled() {
    return this._handled || this.node.res.writableEnded || this.node.res.headersSent;
  }
  respondWith(response) {
    return Promise.resolve(response).then(
      (_response) => sendWebResponse(this, _response)
    );
  }
  // --- Utils ---
  toString() {
    return `[${this.method}] ${this.path}`;
  }
  toJSON() {
    return this.toString();
  }
  // --- Deprecated ---
  /** @deprecated Please use `event.node.req` instead. */
  get req() {
    return this.node.req;
  }
  /** @deprecated Please use `event.node.res` instead. */
  get res() {
    return this.node.res;
  }
}
function isEvent(input) {
  return hasProp(input, "__is_event__");
}
function createEvent(req, res) {
  return new H3Event(req, res);
}
function _normalizeNodeHeaders(nodeHeaders) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(nodeHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
    } else if (value) {
      headers.set(name, value);
    }
  }
  return headers;
}

function defineEventHandler(handler) {
  if (typeof handler === "function") {
    handler.__is_handler__ = true;
    return handler;
  }
  const _hooks = {
    onRequest: _normalizeArray(handler.onRequest),
    onBeforeResponse: _normalizeArray(handler.onBeforeResponse)
  };
  const _handler = (event) => {
    return _callHandler(event, handler.handler, _hooks);
  };
  _handler.__is_handler__ = true;
  _handler.__resolve__ = handler.handler.__resolve__;
  _handler.__websocket__ = handler.websocket;
  return _handler;
}
function _normalizeArray(input) {
  return input ? Array.isArray(input) ? input : [input] : void 0;
}
async function _callHandler(event, handler, hooks) {
  if (hooks.onRequest) {
    for (const hook of hooks.onRequest) {
      await hook(event);
      if (event.handled) {
        return;
      }
    }
  }
  const body = await handler(event);
  const response = { body };
  if (hooks.onBeforeResponse) {
    for (const hook of hooks.onBeforeResponse) {
      await hook(event, response);
    }
  }
  return response.body;
}
const eventHandler = defineEventHandler;
function isEventHandler(input) {
  return hasProp(input, "__is_handler__");
}
function toEventHandler(input, _, _route) {
  return input;
}
function defineLazyEventHandler(factory) {
  let _promise;
  let _resolved;
  const resolveHandler = () => {
    if (_resolved) {
      return Promise.resolve(_resolved);
    }
    if (!_promise) {
      _promise = Promise.resolve(factory()).then((r) => {
        const handler2 = r.default || r;
        if (typeof handler2 !== "function") {
          throw new TypeError(
            "Invalid lazy handler result. It should be a function:",
            handler2
          );
        }
        _resolved = { handler: toEventHandler(r.default || r) };
        return _resolved;
      });
    }
    return _promise;
  };
  const handler = eventHandler((event) => {
    if (_resolved) {
      return _resolved.handler(event);
    }
    return resolveHandler().then((r) => r.handler(event));
  });
  handler.__resolve__ = resolveHandler;
  return handler;
}
const lazyEventHandler = defineLazyEventHandler;

function createApp(options = {}) {
  const stack = [];
  const handler = createAppEventHandler(stack, options);
  const resolve = createResolver(stack);
  handler.__resolve__ = resolve;
  const getWebsocket = cachedFn(() => websocketOptions(resolve, options));
  const app = {
    // @ts-expect-error
    use: (arg1, arg2, arg3) => use(app, arg1, arg2, arg3),
    resolve,
    handler,
    stack,
    options,
    get websocket() {
      return getWebsocket();
    }
  };
  return app;
}
function use(app, arg1, arg2, arg3) {
  if (Array.isArray(arg1)) {
    for (const i of arg1) {
      use(app, i, arg2, arg3);
    }
  } else if (Array.isArray(arg2)) {
    for (const i of arg2) {
      use(app, arg1, i, arg3);
    }
  } else if (typeof arg1 === "string") {
    app.stack.push(
      normalizeLayer({ ...arg3, route: arg1, handler: arg2 })
    );
  } else if (typeof arg1 === "function") {
    app.stack.push(normalizeLayer({ ...arg2, handler: arg1 }));
  } else {
    app.stack.push(normalizeLayer({ ...arg1 }));
  }
  return app;
}
function createAppEventHandler(stack, options) {
  const spacing = options.debug ? 2 : void 0;
  return eventHandler(async (event) => {
    event.node.req.originalUrl = event.node.req.originalUrl || event.node.req.url || "/";
    const _rawReqUrl = event.node.req.url || "/";
    const _reqPath = _decodePath(event._path || _rawReqUrl);
    event._path = _reqPath;
    const _needsRawUrl = _reqPath !== _rawReqUrl;
    let _layerPath;
    if (options.onRequest) {
      await options.onRequest(event);
    }
    for (const layer of stack) {
      if (layer.route.length > 1) {
        if (!_reqPath.startsWith(layer.route)) {
          continue;
        }
        _layerPath = _reqPath.slice(layer.route.length) || "/";
      } else {
        _layerPath = _reqPath;
      }
      if (layer.match && !layer.match(_layerPath, event)) {
        continue;
      }
      event._path = _layerPath;
      event.node.req.url = _needsRawUrl ? layer.route.length > 1 ? _rawReqUrl.slice(layer.route.length) || "/" : _rawReqUrl : _layerPath;
      const val = await layer.handler(event);
      const _body = val === void 0 ? void 0 : await val;
      if (_body !== void 0) {
        const _response = { body: _body };
        if (options.onBeforeResponse) {
          event._onBeforeResponseCalled = true;
          await options.onBeforeResponse(event, _response);
        }
        await handleHandlerResponse(event, _response.body, spacing);
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, _response);
        }
        return;
      }
      if (event.handled) {
        if (options.onAfterResponse) {
          event._onAfterResponseCalled = true;
          await options.onAfterResponse(event, void 0);
        }
        return;
      }
    }
    if (!event.handled) {
      throw createError$1({
        statusCode: 404,
        statusMessage: `Cannot find any path matching ${event.path || "/"}.`
      });
    }
    if (options.onAfterResponse) {
      event._onAfterResponseCalled = true;
      await options.onAfterResponse(event, void 0);
    }
  });
}
function createResolver(stack) {
  return async (path) => {
    let _layerPath;
    for (const layer of stack) {
      if (layer.route === "/" && !layer.handler.__resolve__) {
        continue;
      }
      if (!path.startsWith(layer.route)) {
        continue;
      }
      _layerPath = path.slice(layer.route.length) || "/";
      if (layer.match && !layer.match(_layerPath, void 0)) {
        continue;
      }
      let res = { route: layer.route, handler: layer.handler };
      if (res.handler.__resolve__) {
        const _res = await res.handler.__resolve__(_layerPath);
        if (!_res) {
          continue;
        }
        res = {
          ...res,
          ..._res,
          route: joinURL(res.route || "/", _res.route || "/")
        };
      }
      return res;
    }
  };
}
function normalizeLayer(input) {
  let handler = input.handler;
  if (handler.handler) {
    handler = handler.handler;
  }
  if (input.lazy) {
    handler = lazyEventHandler(handler);
  } else if (!isEventHandler(handler)) {
    handler = toEventHandler(handler, void 0, input.route);
  }
  return {
    route: withoutTrailingSlash(input.route),
    match: input.match,
    handler
  };
}
function handleHandlerResponse(event, val, jsonSpace) {
  if (val === null) {
    return sendNoContent(event);
  }
  if (val) {
    if (isWebResponse(val)) {
      return sendWebResponse(event, val);
    }
    if (isStream(val)) {
      return sendStream(event, val);
    }
    if (val.buffer) {
      return send(event, val);
    }
    if (val.arrayBuffer && typeof val.arrayBuffer === "function") {
      return val.arrayBuffer().then((arrayBuffer) => {
        return send(event, Buffer.from(arrayBuffer), val.type);
      });
    }
    if (val instanceof Error) {
      throw createError$1(val);
    }
    if (typeof val.end === "function") {
      return true;
    }
  }
  const valType = typeof val;
  if (valType === "string") {
    return send(event, val, MIMES.html);
  }
  if (valType === "object" || valType === "boolean" || valType === "number") {
    return send(event, JSON.stringify(val, void 0, jsonSpace), MIMES.json);
  }
  if (valType === "bigint") {
    return send(event, val.toString(), MIMES.json);
  }
  throw createError$1({
    statusCode: 500,
    statusMessage: `[h3] Cannot send ${valType} as response.`
  });
}
function cachedFn(fn) {
  let cache;
  return () => {
    if (!cache) {
      cache = fn();
    }
    return cache;
  };
}
function _decodePath(url) {
  const qIndex = url.indexOf("?");
  const path = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? "" : url.slice(qIndex);
  const decodedPath = path.includes("%25") ? decodePath(path.replace(/%25/g, "%2525")) : decodePath(path);
  return decodedPath + query;
}
function websocketOptions(evResolver, appOptions) {
  return {
    ...appOptions.websocket,
    async resolve(info) {
      const url = info.request?.url || info.url || "/";
      const { pathname } = typeof url === "string" ? parseURL(url) : url;
      const resolved = await evResolver(pathname);
      return resolved?.handler?.__websocket__ || {};
    }
  };
}

const RouterMethods = [
  "connect",
  "delete",
  "get",
  "head",
  "options",
  "post",
  "put",
  "trace",
  "patch"
];
function createRouter(opts = {}) {
  const _router = createRouter$1({});
  const routes = {};
  let _matcher;
  const router = {};
  const addRoute = (path, handler, method) => {
    let route = routes[path];
    if (!route) {
      routes[path] = route = { path, handlers: {} };
      _router.insert(path, route);
    }
    if (Array.isArray(method)) {
      for (const m of method) {
        addRoute(path, handler, m);
      }
    } else {
      route.handlers[method] = toEventHandler(handler);
    }
    return router;
  };
  router.use = router.add = (path, handler, method) => addRoute(path, handler, method || "all");
  for (const method of RouterMethods) {
    router[method] = (path, handle) => router.add(path, handle, method);
  }
  const matchHandler = (path = "/", method = "get") => {
    const qIndex = path.indexOf("?");
    if (qIndex !== -1) {
      path = path.slice(0, Math.max(0, qIndex));
    }
    const matched = _router.lookup(path);
    if (!matched || !matched.handlers) {
      return {
        error: createError$1({
          statusCode: 404,
          name: "Not Found",
          statusMessage: `Cannot find any route matching ${path || "/"}.`
        })
      };
    }
    let handler = matched.handlers[method] || matched.handlers.all;
    if (!handler) {
      if (!_matcher) {
        _matcher = toRouteMatcher(_router);
      }
      const _matches = _matcher.matchAll(path).reverse();
      for (const _match of _matches) {
        if (_match.handlers[method]) {
          handler = _match.handlers[method];
          matched.handlers[method] = matched.handlers[method] || handler;
          break;
        }
        if (_match.handlers.all) {
          handler = _match.handlers.all;
          matched.handlers.all = matched.handlers.all || handler;
          break;
        }
      }
    }
    if (!handler) {
      return {
        error: createError$1({
          statusCode: 405,
          name: "Method Not Allowed",
          statusMessage: `Method ${method} is not allowed on this route.`
        })
      };
    }
    return { matched, handler };
  };
  const isPreemptive = opts.preemptive || opts.preemtive;
  router.handler = eventHandler((event) => {
    const match = matchHandler(
      event.path,
      event.method.toLowerCase()
    );
    if ("error" in match) {
      if (isPreemptive) {
        throw match.error;
      } else {
        return;
      }
    }
    event.context.matchedRoute = match.matched;
    const params = match.matched.params || {};
    event.context.params = params;
    return Promise.resolve(match.handler(event)).then((res) => {
      if (res === void 0 && isPreemptive) {
        return null;
      }
      return res;
    });
  });
  router.handler.__resolve__ = async (path) => {
    path = withLeadingSlash(path);
    const match = matchHandler(path);
    if ("error" in match) {
      return;
    }
    let res = {
      route: match.matched.path,
      handler: match.handler
    };
    if (match.handler.__resolve__) {
      const _res = await match.handler.__resolve__(path);
      if (!_res) {
        return;
      }
      res = { ...res, ..._res };
    }
    return res;
  };
  return router;
}
function toNodeListener(app) {
  const toNodeHandle = async function(req, res) {
    const event = createEvent(req, res);
    try {
      await app.handler(event);
    } catch (_error) {
      const error = createError$1(_error);
      if (!isError(_error)) {
        error.unhandled = true;
      }
      setResponseStatus(event, error.statusCode, error.statusMessage);
      if (app.options.onError) {
        await app.options.onError(error, event);
      }
      if (event.handled) {
        return;
      }
      if (error.unhandled || error.fatal) {
        console.error("[h3]", error.fatal ? "[fatal]" : "[unhandled]", error);
      }
      if (app.options.onBeforeResponse && !event._onBeforeResponseCalled) {
        await app.options.onBeforeResponse(event, { body: error });
      }
      await sendError(event, error, !!app.options.debug);
      if (app.options.onAfterResponse && !event._onAfterResponseCalled) {
        await app.options.onAfterResponse(event, { body: error });
      }
    }
  };
  return toNodeHandle;
}

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

const isBrowser = "undefined" !== "undefined";
function createDebugger(hooks, _options = {}) {
  const options = {
    inspect: isBrowser,
    group: isBrowser,
    filter: () => true,
    ..._options
  };
  const _filter = options.filter;
  const filter = typeof _filter === "string" ? (name) => name.startsWith(_filter) : _filter;
  const _tag = options.tag ? `[${options.tag}] ` : "";
  const logPrefix = (event) => _tag + event.name + "".padEnd(event._id, "\0");
  const _idCtr = {};
  const unsubscribeBefore = hooks.beforeEach((event) => {
    if (filter !== void 0 && !filter(event.name)) {
      return;
    }
    _idCtr[event.name] = _idCtr[event.name] || 0;
    event._id = _idCtr[event.name]++;
    console.time(logPrefix(event));
  });
  const unsubscribeAfter = hooks.afterEach((event) => {
    if (filter !== void 0 && !filter(event.name)) {
      return;
    }
    if (options.group) {
      console.groupCollapsed(event.name);
    }
    if (options.inspect) {
      console.timeLog(logPrefix(event), event.args);
    } else {
      console.timeEnd(logPrefix(event));
    }
    if (options.group) {
      console.groupEnd();
    }
    _idCtr[event.name]--;
  });
  return {
    /** Stop debugging and remove listeners */
    close: () => {
      unsubscribeBefore();
      unsubscribeAfter();
    }
  };
}

const s=globalThis.Headers,i=globalThis.AbortController,l=globalThis.fetch||(()=>{throw new Error("[node-fetch-native] Failed to fetch: `globalThis.fetch` is not available!")});

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (contentType === "text/event-stream") {
    return "stream";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
      if (!(context.options.headers instanceof Headers)) {
        context.options.headers = new Headers(
          context.options.headers || {}
          /* compat */
        );
      }
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        const contentType = context.options.headers.get("content-type");
        if (typeof context.options.body !== "string") {
          context.options.body = contentType === "application/x-www-form-urlencoded" ? new URLSearchParams(
            context.options.body
          ).toString() : JSON.stringify(context.options.body);
        }
        if (!contentType) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return l;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return l(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || s;
const AbortController = globalThis.AbortController || i;
const ofetch = createFetch({ fetch, Headers: Headers$1, AbortController });
const $fetch = ofetch;

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

function serialize$1(input) {
	if (typeof input === "string") return `'${input}'`;
	return new Serializer().serialize(input);
}
const asciiOrder = " _-,;:!?.'\"()[]{}@*/\\&#%`^+<=>|~$0123456789abcdefghijklmnopqrstuvwxyz";
const asciiWeights = /*@__PURE__*/ (function() {
	const weights = /* @__PURE__ */ new Uint8Array(128);
	for (let i = 0; i < 69; i++) weights[asciiOrder.charCodeAt(i)] = i + 1;
	for (let code = 65; code <= 90; code++) weights[code] = weights[code + 32];
	return weights;
})();
function compareStrings(a, b) {
	if (a === b) return 0;
	const length = Math.min(a.length, b.length);
	let tieBreaker = 0;
	for (let i = 0; i < length; i++) {
		const codeA = a.charCodeAt(i);
		const codeB = b.charCodeAt(i);
		if (codeA === codeB) continue;
		const weightA = codeA < 128 && asciiWeights[codeA] ? asciiWeights[codeA] : codeA + 128;
		const weightB = codeB < 128 && asciiWeights[codeB] ? asciiWeights[codeB] : codeB + 128;
		if (weightA !== weightB) return weightA < weightB ? -1 : 1;
		if (tieBreaker === 0) tieBreaker = codeA > codeB ? -1 : 1;
	}
	if (a.length !== b.length) return a.length < b.length ? -1 : 1;
	return tieBreaker;
}
const Serializer = /*@__PURE__*/ (function() {
	class Serializer {
		#context = /* @__PURE__ */ new Map();
		compare(a, b) {
			const typeA = typeof a;
			const typeB = typeof b;
			if (typeA === "string" && typeB === "string") return compareStrings(a, b);
			if (typeA === "number" && typeB === "number") return a - b;
			return compareStrings(this.serialize(a, true), this.serialize(b, true));
		}
		serialize(value, noQuotes) {
			if (value === null) return "null";
			switch (typeof value) {
				case "string": return noQuotes ? value : `'${value}'`;
				case "bigint": return `${value}n`;
				case "object": return this.$object(value);
				case "function": return this.$function(value);
			}
			return String(value);
		}
		serializeObject(object) {
			const objString = Object.prototype.toString.call(object);
			if (objString !== "[object Object]") return this.serializeBuiltInType(objString.length < 10 ? `unknown:${objString}` : objString.slice(8, -1), object);
			const constructor = object.constructor;
			const objName = constructor === Object || constructor === void 0 ? "" : constructor.name;
			if (objName !== "" && globalThis[objName] === constructor) return this.serializeBuiltInType(objName, object);
			if ("toJSON" in object && typeof object.toJSON === "function") {
				const json = object.toJSON();
				return objName + (json !== null && typeof json === "object" ? this.$object(json) : `(${this.serialize(json)})`);
			}
			const keys = Object.keys(object).sort(compareStrings);
			let content = `${objName}{`;
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				content += `${key}:${this.serialize(object[key])}`;
				if (i < keys.length - 1) content += ",";
			}
			return content + "}";
		}
		serializeBuiltInType(type, object) {
			const handler = this["$" + type];
			if (handler) return handler.call(this, object);
			if (typeof object.entries === "function") return this.serializeObjectEntries(type, object.entries());
			throw new Error(`Cannot serialize ${type}`);
		}
		serializeObjectEntries(type, entries) {
			const sortedEntries = Array.from(entries).sort((a, b) => this.compare(a[0], b[0]));
			let content = `${type}{`;
			for (let i = 0; i < sortedEntries.length; i++) {
				const [key, value] = sortedEntries[i];
				content += `${this.serialize(key, true)}:${this.serialize(value)}`;
				if (i < sortedEntries.length - 1) content += ",";
			}
			return content + "}";
		}
		$object(object) {
			let content = this.#context.get(object);
			if (content === void 0) {
				this.#context.set(object, `#${this.#context.size}`);
				content = this.serializeObject(object);
				this.#context.set(object, content);
			}
			return content;
		}
		$function(fn) {
			const fnStr = Function.prototype.toString.call(fn);
			if (fnStr.slice(-15) === "[native code] }") return `${fn.name || ""}()[native]`;
			return `${fn.name}(${fn.length})${fnStr.replace(/\s*\n\s*/g, "")}`;
		}
		$Array(arr) {
			let content = "[";
			for (let i = 0; i < arr.length; i++) {
				content += this.serialize(arr[i]);
				if (i < arr.length - 1) content += ",";
			}
			return content + "]";
		}
		$Date(date) {
			try {
				return `Date(${date.toISOString()})`;
			} catch {
				return `Date(null)`;
			}
		}
		$ArrayBuffer(arr) {
			return `ArrayBuffer[${new Uint8Array(arr).join(",")}]`;
		}
		$Set(set) {
			return `Set${this.$Array(Array.from(set).sort((a, b) => this.compare(a, b)))}`;
		}
		$Map(map) {
			return this.serializeObjectEntries("Map", map.entries());
		}
	}
	for (const type of [
		"Error",
		"RegExp",
		"URL"
	]) Serializer.prototype["$" + type] = function(val) {
		return `${type}(${val})`;
	};
	for (const type of [
		"Int8Array",
		"Uint8Array",
		"Uint8ClampedArray",
		"Int16Array",
		"Uint16Array",
		"Int32Array",
		"Uint32Array",
		"Float32Array",
		"Float64Array"
	]) Serializer.prototype["$" + type] = function(arr) {
		return `${type}[${arr.join(",")}]`;
	};
	for (const type of ["BigInt64Array", "BigUint64Array"]) Serializer.prototype["$" + type] = function(arr) {
		return `${type}[${arr.join("n,")}${arr.length > 0 ? "n" : ""}]`;
	};
	return Serializer;
})();
function isEqual(object1, object2) {
	if (object1 === object2) return true;
	if (serialize$1(object1) === serialize$1(object2)) return true;
	return false;
}

const fastHash = /*@__PURE__*/ (() => globalThis.process?.getBuiltinModule?.("crypto")?.hash)();
const algorithm = "sha256";
const encoding = "base64url";
function digest(data) {
	if (fastHash) return fastHash(algorithm, data, encoding);
	const h = createHash(algorithm).update(data);
	return globalThis.process?.versions?.webcontainer ? h.digest().toString(encoding) : h.digest(encoding);
}

function hash$1(input) {
	return digest(serialize$1(input));
}

const Hasher = /* @__PURE__ */ (() => {
  class Hasher2 {
    buff = "";
    #context = /* @__PURE__ */ new Map();
    write(str) {
      this.buff += str;
    }
    dispatch(value) {
      const type = value === null ? "null" : typeof value;
      return this[type](value);
    }
    object(object) {
      if (object && typeof object.toJSON === "function") {
        return this.object(object.toJSON());
      }
      const objString = Object.prototype.toString.call(object);
      let objType = "";
      const objectLength = objString.length;
      objType = objectLength < 10 ? "unknown:[" + objString + "]" : objString.slice(8, objectLength - 1);
      objType = objType.toLowerCase();
      let objectNumber = null;
      if ((objectNumber = this.#context.get(object)) === void 0) {
        this.#context.set(object, this.#context.size);
      } else {
        return this.dispatch("[CIRCULAR:" + objectNumber + "]");
      }
      if (typeof Buffer !== "undefined" && Buffer.isBuffer && Buffer.isBuffer(object)) {
        this.write("buffer:");
        return this.write(object.toString("utf8"));
      }
      if (objType !== "object" && objType !== "function" && objType !== "asyncfunction") {
        if (this[objType]) {
          this[objType](object);
        } else {
          this.unknown(object, objType);
        }
      } else {
        const keys = Object.keys(object).sort();
        const extraKeys = [];
        this.write("object:" + (keys.length + extraKeys.length) + ":");
        const dispatchForKey = (key) => {
          this.dispatch(key);
          this.write(":");
          this.dispatch(object[key]);
          this.write(",");
        };
        for (const key of keys) {
          dispatchForKey(key);
        }
        for (const key of extraKeys) {
          dispatchForKey(key);
        }
      }
    }
    array(arr, unordered) {
      unordered = unordered === void 0 ? false : unordered;
      this.write("array:" + arr.length + ":");
      if (!unordered || arr.length <= 1) {
        for (const entry of arr) {
          this.dispatch(entry);
        }
        return;
      }
      const contextAdditions = /* @__PURE__ */ new Map();
      const entries = arr.map((entry) => {
        const hasher = new Hasher2();
        hasher.dispatch(entry);
        for (const [key, value] of hasher.#context) {
          contextAdditions.set(key, value);
        }
        return hasher.toString();
      });
      this.#context = contextAdditions;
      entries.sort();
      return this.array(entries, false);
    }
    date(date) {
      return this.write("date:" + date.toJSON());
    }
    symbol(sym) {
      return this.write("symbol:" + sym.toString());
    }
    unknown(value, type) {
      this.write(type);
      if (!value) {
        return;
      }
      this.write(":");
      if (value && typeof value.entries === "function") {
        return this.array(
          [...value.entries()],
          true
          /* ordered */
        );
      }
    }
    error(err) {
      return this.write("error:" + err.toString());
    }
    boolean(bool) {
      return this.write("bool:" + bool);
    }
    string(string) {
      this.write("string:" + string.length + ":");
      this.write(string);
    }
    function(fn) {
      this.write("fn:");
      if (isNativeFunction(fn)) {
        this.dispatch("[native]");
      } else {
        this.dispatch(fn.toString());
      }
    }
    number(number) {
      return this.write("number:" + number);
    }
    null() {
      return this.write("Null");
    }
    undefined() {
      return this.write("Undefined");
    }
    regexp(regex) {
      return this.write("regex:" + regex.toString());
    }
    arraybuffer(arr) {
      this.write("arraybuffer:");
      return this.dispatch(new Uint8Array(arr));
    }
    url(url) {
      return this.write("url:" + url.toString());
    }
    map(map) {
      this.write("map:");
      const arr = [...map];
      return this.array(arr, false);
    }
    set(set) {
      this.write("set:");
      const arr = [...set];
      return this.array(arr, false);
    }
    bigint(number) {
      return this.write("bigint:" + number.toString());
    }
  }
  for (const type of [
    "uint8array",
    "uint8clampedarray",
    "unt8array",
    "uint16array",
    "unt16array",
    "uint32array",
    "unt32array",
    "float32array",
    "float64array"
  ]) {
    Hasher2.prototype[type] = function(arr) {
      this.write(type + ":");
      return this.array([...arr], false);
    };
  }
  function isNativeFunction(f) {
    if (typeof f !== "function") {
      return false;
    }
    return Function.prototype.toString.call(f).slice(
      -15
      /* "[native code] }".length */
    ) === "[native code] }";
  }
  return Hasher2;
})();
function serialize(object) {
  const hasher = new Hasher();
  hasher.dispatch(object);
  return hasher.buff;
}
function hash(value) {
  return digest(typeof value === "string" ? value : serialize(value)).replace(/[-_]/g, "").slice(0, 10);
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          const promise = useStorage().setItem(cacheKey, entry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event?.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        const value = incomingEvent.node.req.headers[header];
        if (value !== void 0) {
          variableHeaders[header] = value;
        }
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2(void 0);
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return true;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            if (Array.isArray(headers2) || typeof headers2 === "string") {
              throw new TypeError("Raw headers  is not supported.");
            }
            for (const header in headers2) {
              const value = headers2[header];
              if (value !== void 0) {
                this.setHeader(
                  header,
                  value
                );
              }
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: useNitroApp().localFetch
      });
      event.$fetch = (url, fetchOptions) => fetchWithEvent(event, url, fetchOptions, {
        fetch: globalThis.$fetch
      });
      event.waitUntil = incomingEvent.waitUntil;
      event.context = incomingEvent.context;
      event.context.cache = {
        options: _opts
      };
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(
      event
    );
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        if (value !== void 0) {
          event.node.res.setHeader(name, value);
        }
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const inlineAppConfig = {
  "nuxt": {}
};



const appConfig = defuFn(inlineAppConfig);

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/",
    "buildId": "e169228d-9412-4dc8-affe-d0892249a027",
    "buildAssetsDir": "/_nuxt/",
    "cdnURL": ""
  },
  "nitro": {
    "envPrefix": "NUXT_",
    "routeRules": {
      "/__nuxt_error": {
        "cache": false
      },
      "/admin": {
        "redirect": {
          "to": "/admin-workspace",
          "statusCode": 307
        }
      },
      "/marketplaces": {
        "redirect": {
          "to": "/crm-marketplaces",
          "statusCode": 307
        }
      },
      "/booking/**": {
        "headers": {
          "X-Robots-Tag": "noindex,nofollow",
          "Referrer-Policy": "strict-origin-when-cross-origin"
        }
      },
      "/media-library": {
        "headers": {
          "X-Robots-Tag": "noindex,nofollow"
        }
      },
      "/crm/**": {
        "headers": {
          "X-Robots-Tag": "noindex,nofollow",
          "Cache-Control": "no-store",
          "Referrer-Policy": "same-origin"
        }
      },
      "/crm/sw.js": {
        "headers": {
          "Cache-Control": "no-cache",
          "Content-Type": "text/javascript; charset=utf-8"
        }
      },
      "/crm/manifest.webmanifest": {
        "headers": {
          "Content-Type": "application/manifest+json"
        }
      },
      "/_nuxt/**": {
        "headers": {
          "cache-control": "public, max-age=31536000, immutable"
        }
      }
    }
  },
  "public": {
    "apiBase": "http://localhost:3000/api/v1",
    "siteUrl": "http://localhost:3001",
    "seoIndexingEnabled": "false"
  },
  "seoApiBase": "http://localhost:3000/api/v1"
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  applyEnv(runtimeConfig, envOptions);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze(klona(appConfig));
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());
function executeAsync(function_) {
  const restores = [];
  for (const leaveHandler of asyncHandlers) {
    const restore2 = leaveHandler();
    if (restore2) {
      restores.push(restore2);
    }
  }
  const restore = () => {
    for (const restore2 of restores) {
      restore2();
    }
  };
  let awaitable = function_();
  if (awaitable && typeof awaitable === "object" && "catch" in awaitable) {
    awaitable = awaitable.catch((error) => {
      restore();
      throw error;
    });
  }
  return [awaitable, restore];
}

function isPathInScope(pathname, base) {
  let canonical;
  try {
    const pre = pathname.replace(/%2f/gi, "/").replace(/%5c/gi, "\\");
    canonical = new URL(pre, "http://_").pathname;
  } catch {
    return false;
  }
  return !base || canonical === base || canonical.startsWith(base + "/");
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter$1({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      let target = routeRules.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.redirect._redirectStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return sendRedirect(event, target, routeRules.redirect.statusCode);
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          if (!isPathInScope(event.path.split("?")[0], strpBase)) {
            throw createError$1({ statusCode: 400 });
          }
          targetPath = withoutBase(targetPath, strpBase);
        } else if (targetPath.startsWith("//")) {
          targetPath = targetPath.replace(/^\/+/, "/");
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery$1(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

function isJsonRequest(event) {
	
	if (hasReqHeader(event, "accept", "text/html")) {
		return false;
	}
	return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function hasReqHeader(event, name, includes) {
	const value = getRequestHeader(event, name);
	return !!(value && typeof value === "string" && value.toLowerCase().includes(includes));
}

const errorHandler$0 = (async function errorhandler(error, event, { defaultHandler }) {
	if (event.handled || isJsonRequest(event)) {
		
		return;
	}
	
	const defaultRes = await defaultHandler(error, event, { json: true });
	
	const status = error.status || error.statusCode || 500;
	if (status === 404 && defaultRes.status === 302) {
		setResponseHeaders(event, defaultRes.headers);
		setResponseStatus(event, defaultRes.status, defaultRes.statusText);
		return send(event, JSON.stringify(defaultRes.body, null, 2));
	}
	const errorObject = defaultRes.body;
	
	const url = new URL(errorObject.url);
	errorObject.url = withoutBase(url.pathname, useRuntimeConfig(event).app.baseURL) + url.search + url.hash;
	
	errorObject.message = error.unhandled ? errorObject.message || "Server Error" : error.message || errorObject.message || "Server Error";
	
	errorObject.data ||= error.data;
	errorObject.statusText ||= error.statusText || error.statusMessage;
	delete defaultRes.headers["content-type"];
	delete defaultRes.headers["content-security-policy"];
	setResponseHeaders(event, defaultRes.headers);
	
	const reqHeaders = getRequestHeaders(event);
	
	const isRenderingError = event.path.startsWith("/__nuxt_error") || !!reqHeaders["x-nuxt-error"] || !!event.context.nuxt?.["~rendering-error"];
	if (!isRenderingError) {
		event.context.nuxt ||= {};
		event.context.nuxt["~rendering-error"] = true;
	}
	
	const res = isRenderingError ? null : await useNitroApp().localFetch(withQuery(joinURL(useRuntimeConfig(event).app.baseURL, "/__nuxt_error"), errorObject), {
		headers: {
			...reqHeaders,
			"x-nuxt-error": "true"
		},
		redirect: "manual"
	}).catch(() => null);
	if (event.handled) {
		return;
	}
	
	if (!res) {
		const { template } = await import('./error-500.mjs');
		setResponseHeader(event, "Content-Type", "text/html;charset=UTF-8");
		return send(event, template(errorObject));
	}
	const html = await res.text();
	for (const [header, value] of res.headers.entries()) {
		if (header === "set-cookie") {
			appendResponseHeader(event, header, value);
			continue;
		}
		setResponseHeader(event, header, value);
	}
	setResponseStatus(event, res.status && res.status !== 200 ? res.status : defaultRes.status, res.statusText || defaultRes.statusText);
	return send(event, html);
});

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$1 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    setResponseHeaders(event, res.headers);
    setResponseStatus(event, res.status, res.statusText);
    return send(event, JSON.stringify(res.body, null, 2));
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled || error.fatal;
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Server Error";
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (statusCode === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]", error.fatal && "[fatal]"].filter(Boolean).join(" ");
    console.error(`[request error] ${tags} [${event.method}] ${url}
`, error);
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  setResponseStatus(event, statusCode, statusMessage);
  if (statusCode === 404 || !getResponseHeader(event, "cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    statusCode,
    statusMessage,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status: statusCode,
    statusText: statusMessage,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0, errorHandler$1];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      await handler(error, event, { defaultHandler });
      if (event.handled) {
        return; // Response handled
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

function defineNitroPlugin(def) {
  return def;
}

const _EJurTodTxD_Z1MqYJVldPaK_MWuv1wMkuNbL8VTVev0 = defineNitroPlugin((nitro) => {
  createDebugger(nitro.hooks, { tag: "nitro-runtime" });
});

const globalTiming = globalThis.__timing__ || {
  start: () => 0,
  end: () => 0,
  metrics: []
};
const timingMiddleware = eventHandler((event) => {
  const start = globalTiming.start();
  const _end = event.node.res.end;
  event.node.res.end = function(chunk, encoding, cb) {
    const metrics = [
      ["Generate", globalTiming.end(start)],
      ...globalTiming.metrics
    ];
    const serverTiming = metrics.map((m) => `-;dur=${m[1]};desc="${encodeURIComponent(m[0])}"`).join(", ");
    if (!event.node.res.headersSent) {
      event.node.res.setHeader("Server-Timing", serverTiming);
    }
    _end.call(event.node.res, chunk, encoding, cb);
    return this;
  }.bind(event.node.res);
});
const _zVKmOWNYqzAz9SeLn_nSAZscINQX8sSzRoTovcIXI = defineNitroPlugin((nitro) => {
  nitro.h3App.stack.unshift({
    route: "/",
    handler: timingMiddleware
  });
});

const plugins = [
  _EJurTodTxD_Z1MqYJVldPaK_MWuv1wMkuNbL8VTVev0,
_zVKmOWNYqzAz9SeLn_nSAZscINQX8sSzRoTovcIXI
];

const assets = {
  "/sarkisian-logo.png": {
    "type": "image/png",
    "etag": "\"350b-wism8hPJ4Pt7lHK0PYe3iv7cGFI\"",
    "mtime": "2026-09-14T10:54:32.148Z",
    "size": 13579,
    "path": "../public/sarkisian-logo.png"
  },
  "/fonts/montserrat-cyrillic.woff2": {
    "type": "font/woff2",
    "etag": "\"5d14-UgzTmxtbskny91h1BfDjcRvlLJA\"",
    "mtime": "2026-09-16T07:10:11.222Z",
    "size": 23828,
    "path": "../public/fonts/montserrat-cyrillic.woff2"
  },
  "/fonts/montserrat-cyrillic-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"6700-nxDSlI0X7XSGY9Gs+xAPqc7I6S4\"",
    "mtime": "2026-09-16T07:10:10.956Z",
    "size": 26368,
    "path": "../public/fonts/montserrat-cyrillic-ext.woff2"
  },
  "/fonts/montserrat-latin-ext.woff2": {
    "type": "font/woff2",
    "etag": "\"11420-pjeXweHBNwgrelj27ljMuGQKxR4\"",
    "mtime": "2026-09-16T07:10:11.803Z",
    "size": 70688,
    "path": "../public/fonts/montserrat-latin-ext.woff2"
  },
  "/crm/manifest.webmanifest": {
    "type": "application/manifest+json",
    "etag": "\"35b-TC1jQ2vFDOc+W3gtFNckz2Pw+jU\"",
    "mtime": "2026-09-22T10:37:35.614Z",
    "size": 859,
    "path": "../public/crm/manifest.webmanifest"
  },
  "/fonts/montserrat-latin.woff2": {
    "type": "font/woff2",
    "etag": "\"9444-pexUkgtYnr4q87w7t3VKR222ir8\"",
    "mtime": "2026-09-16T07:10:12.137Z",
    "size": 37956,
    "path": "../public/fonts/montserrat-latin.woff2"
  },
  "/fonts/Montserrat-OFL.txt": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1130-xuWgeCUUpJisQGxzruLA/kFwGIs\"",
    "mtime": "2026-09-16T07:10:14.322Z",
    "size": 4400,
    "path": "../public/fonts/Montserrat-OFL.txt"
  },
  "/storefront/sarkisian-logo-original.png": {
    "type": "image/png",
    "etag": "\"e99c-7YUHuNOlcPfKupp9t5DxgZHB5h4\"",
    "mtime": "2026-09-18T13:57:38.451Z",
    "size": 59804,
    "path": "../public/storefront/sarkisian-logo-original.png"
  },
  "/storefront/brand-strip.jpg": {
    "type": "image/jpeg",
    "etag": "\"6836-GG5c0zaK8efk6mkxqarI55cplW8\"",
    "mtime": "2026-09-15T12:35:30.728Z",
    "size": 26678,
    "path": "../public/storefront/brand-strip.jpg"
  },
  "/_nuxt/-Y8lhVbV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"53b2-OUGWbpZl4V8psr3VzT49To0qsp0\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 21426,
    "path": "../public/_nuxt/-Y8lhVbV.js"
  },
  "/_nuxt/01wzmgd-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13e-5DMFJwM3FqzOoWxuNVAlKeQjytA\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 318,
    "path": "../public/_nuxt/01wzmgd-.js"
  },
  "/storefront/svetlana-creator-youtube.jpg": {
    "type": "image/jpeg",
    "etag": "\"fdd6-kyzKjDgwdfLa0Q48hwKxOgmDkrk\"",
    "mtime": "2026-09-18T12:07:21.461Z",
    "size": 64982,
    "path": "../public/storefront/svetlana-creator-youtube.jpg"
  },
  "/crm/sw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"704-3o7z0bKts/Pn9KvSI1bSWmxyj6M\"",
    "mtime": "2026-09-22T10:37:35.615Z",
    "size": 1796,
    "path": "../public/crm/sw.js"
  },
  "/_nuxt/09l_z9k7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f90-JNo1yfWl8VMu71Q9ZicpPHjBIcM\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 16272,
    "path": "../public/_nuxt/09l_z9k7.js"
  },
  "/_nuxt/1_rSj9sX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a2-UDNaKHcmm6W2pWQU2tHu8ZbisXo\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 418,
    "path": "../public/_nuxt/1_rSj9sX.js"
  },
  "/_nuxt/4TPs1sVC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a0-kyFcin50zhvuKEsGAeTcfuPH/fw\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 416,
    "path": "../public/_nuxt/4TPs1sVC.js"
  },
  "/_nuxt/7HGgdfeD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1cb-rLL8oq0v6t2B1pCqm3ksqUIG+SM\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 459,
    "path": "../public/_nuxt/7HGgdfeD.js"
  },
  "/_nuxt/87vKEpb0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca-T2YXtyu+nRZckgEo0YVkXMs8HR8\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 202,
    "path": "../public/_nuxt/87vKEpb0.js"
  },
  "/_nuxt/9VGtKIZ-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"102-QQZXc7ELnBAW6ZUXAYhjqWOvUvM\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 258,
    "path": "../public/_nuxt/9VGtKIZ-.js"
  },
  "/_nuxt/aPm0tLm8.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"dc-eeoG74TWMwTH6FtJBQyVPmzqoPs\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 220,
    "path": "../public/_nuxt/aPm0tLm8.js"
  },
  "/storefront/hero.jpg": {
    "type": "image/jpeg",
    "etag": "\"d4ee1-pzYKVZfeOQrB7DuCGPnYY8Uiwz0\"",
    "mtime": "2026-09-15T12:35:29.714Z",
    "size": 872161,
    "path": "../public/storefront/hero.jpg"
  },
  "/_nuxt/94rcpTIp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"128-l5toKAyWqaT7waTSsDP9JOaawJw\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 296,
    "path": "../public/_nuxt/94rcpTIp.js"
  },
  "/_nuxt/B-nYf-HQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12c-u/guCHBwLYq+dbcxjZJYnteFMkQ\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 300,
    "path": "../public/_nuxt/B-nYf-HQ.js"
  },
  "/storefront/svetlana-portrait.png": {
    "type": "image/png",
    "etag": "\"13ce35-tx6Yk57xx1Xk3YGANIZkjY01jMw\"",
    "mtime": "2026-09-16T07:55:19.304Z",
    "size": 1297973,
    "path": "../public/storefront/svetlana-portrait.png"
  },
  "/storefront/svetlana-creator-video.mp4": {
    "type": "video/mp4",
    "etag": "\"174690-OtC1rccb7F9vAIUbFYZbpFJOtqQ\"",
    "mtime": "2026-09-18T12:36:47.417Z",
    "size": 1525392,
    "path": "../public/storefront/svetlana-creator-video.mp4"
  },
  "/_nuxt/B5IGpCgQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a8-5F9llnQKOwAUWij5nWvxiqEV4KI\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 424,
    "path": "../public/_nuxt/B5IGpCgQ.js"
  },
  "/_nuxt/BaEM66tX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15e-vZEiSj24Xu2GQ1xean4dJ2nC3dw\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 350,
    "path": "../public/_nuxt/BaEM66tX.js"
  },
  "/_nuxt/B3aGvcjd.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17f-hvACmMVpdHIurJeJo/a6qFypplE\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 383,
    "path": "../public/_nuxt/B3aGvcjd.js"
  },
  "/_nuxt/BB_a_7ce.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"169-BNkOXdmBbF9hNp+oYhHsZ0jF5dY\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 361,
    "path": "../public/_nuxt/BB_a_7ce.js"
  },
  "/_nuxt/BC3rBtUG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b4-LgGIcgJAuScAP7LjnAEUWUj1AkE\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 180,
    "path": "../public/_nuxt/BC3rBtUG.js"
  },
  "/_nuxt/B8Y928Lg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3148-wGGghcxCugdqIWlnPi1k+MDTeLo\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 12616,
    "path": "../public/_nuxt/B8Y928Lg.js"
  },
  "/_nuxt/BckVfFUF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"73-PU8pwP0ctvSnH0YTWtfk6ShfTuE\"",
    "mtime": "2026-09-23T08:15:45.627Z",
    "size": 115,
    "path": "../public/_nuxt/BckVfFUF.js"
  },
  "/_nuxt/BDpmxiA2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"134-fQz7a3IvVajUB58jIqlbmoXcVHk\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 308,
    "path": "../public/_nuxt/BDpmxiA2.js"
  },
  "/_nuxt/Bc72WJC9.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3f7b-aXZi8UYuk5VRpi/0ggp7UQS2f1Y\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 16251,
    "path": "../public/_nuxt/Bc72WJC9.js"
  },
  "/_nuxt/BEeH1HEg.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1cd-r2qX7iFVzUZR7PN3eCDeLanmw/Q\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 461,
    "path": "../public/_nuxt/BEeH1HEg.js"
  },
  "/_nuxt/BeiSOARK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ef-VGSclsK0txC/jrb3xb9yadsMWEs\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 495,
    "path": "../public/_nuxt/BeiSOARK.js"
  },
  "/_nuxt/BFo1hxLO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"136-okXMJDV63sQly3xpBBTuU0EMUEM\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 310,
    "path": "../public/_nuxt/BFo1hxLO.js"
  },
  "/_nuxt/BF8xVD9J.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9c91-oIq+HRD1knV4CBBTOfJc6PmtUpw\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 40081,
    "path": "../public/_nuxt/BF8xVD9J.js"
  },
  "/_nuxt/BhGaJ6Ba.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"83a-OdTqcRg3vTSZWO0sti4E7D/+t7s\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 2106,
    "path": "../public/_nuxt/BhGaJ6Ba.js"
  },
  "/_nuxt/BG0D-xXe.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17d-9SlR/AorUw+THquoXKnau/PIRFk\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 381,
    "path": "../public/_nuxt/BG0D-xXe.js"
  },
  "/_nuxt/Bh_WkU92.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"132-CeA0pe30FEaLK+UD2G+GOSLkxIM\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 306,
    "path": "../public/_nuxt/Bh_WkU92.js"
  },
  "/_nuxt/BJZd4Qr3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a0-qvs+rarVRaK9hyE0Dqt/vEqAP7I\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 416,
    "path": "../public/_nuxt/BJZd4Qr3.js"
  },
  "/_nuxt/BI-bX0bI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1002-ETVFG9PAj2hIL7s56YBht/oSOD8\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 4098,
    "path": "../public/_nuxt/BI-bX0bI.js"
  },
  "/_nuxt/BIA4Nsfv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a7-SPur2LGYdxpwXHxlxtV0U230a9g\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 423,
    "path": "../public/_nuxt/BIA4Nsfv.js"
  },
  "/_nuxt/BMADGUbL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"cd-HUGIcPPdBHe9royUu9uAC8GNUX0\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 205,
    "path": "../public/_nuxt/BMADGUbL.js"
  },
  "/_nuxt/BJ5N51XR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"68e3-2uxS3iOYemg18bYUe12ukAP3Il8\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 26851,
    "path": "../public/_nuxt/BJ5N51XR.js"
  },
  "/_nuxt/BKeHMwcF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"128-uKxXQuCKvL5wvdCSSDbIlPvlDTQ\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 296,
    "path": "../public/_nuxt/BKeHMwcF.js"
  },
  "/_nuxt/BKd8IlcG.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2024-HEuSMP/uEhHI9qXuq8LqYiV34mY\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 8228,
    "path": "../public/_nuxt/BKd8IlcG.js"
  },
  "/_nuxt/BOLWc427.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3bac-9p0Ken0umPmlCcy/PF861eyWvJQ\"",
    "mtime": "2026-09-23T08:15:45.691Z",
    "size": 15276,
    "path": "../public/_nuxt/BOLWc427.js"
  },
  "/_nuxt/BN6qLpiY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2a59-n+fM8zBjb65iYov+FeAlJwFdfC0\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 10841,
    "path": "../public/_nuxt/BN6qLpiY.js"
  },
  "/_nuxt/BpfjPiFn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca-T2YXtyu+nRZckgEo0YVkXMs8HR8\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 202,
    "path": "../public/_nuxt/BpfjPiFn.js"
  },
  "/_nuxt/BqdkFOJD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"11d-Ldc88aKwi6DJPwYXKdMcDLK1XrU\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 285,
    "path": "../public/_nuxt/BqdkFOJD.js"
  },
  "/_nuxt/BQscy78f.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f7-scNnY/3EJB1Qlq5mzCD0be73mU4\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 503,
    "path": "../public/_nuxt/BQscy78f.js"
  },
  "/_nuxt/BSBSQCJ7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"134-pWaekK8avVaizDnsSqa50EI5b3g\"",
    "mtime": "2026-09-23T08:15:45.691Z",
    "size": 308,
    "path": "../public/_nuxt/BSBSQCJ7.js"
  },
  "/_nuxt/BRcDCq-6.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"142-qJGHpmXbk2ZDXH7IuyWx8xCioco\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 322,
    "path": "../public/_nuxt/BRcDCq-6.js"
  },
  "/_nuxt/BsQk-rVO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10b-gx5L1vpdx1fujovq6Q2k8/0+fg4\"",
    "mtime": "2026-09-23T08:15:45.695Z",
    "size": 267,
    "path": "../public/_nuxt/BsQk-rVO.js"
  },
  "/_nuxt/BsgvMqsV.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19a-qWbCYMVowqSzoYtSR0zFMOIBuMw\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 410,
    "path": "../public/_nuxt/BsgvMqsV.js"
  },
  "/_nuxt/BxCxnHo4.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13a-T8oWnluazvm9UxMzLtHvMGX7wAc\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 314,
    "path": "../public/_nuxt/BxCxnHo4.js"
  },
  "/_nuxt/BXt9Lbyl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"132-WhnpprMTw7DzPMnLvC26JjAzhjM\"",
    "mtime": "2026-09-23T08:15:45.695Z",
    "size": 306,
    "path": "../public/_nuxt/BXt9Lbyl.js"
  },
  "/_nuxt/BzgCHPO7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a2-xQr2UzRqFitAiF+OejiHq4UGmwM\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 418,
    "path": "../public/_nuxt/BzgCHPO7.js"
  },
  "/_nuxt/BY-d6WLw.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1d1-ukOJaH2xGZ6yx3zrVrCx2yrxsrM\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 465,
    "path": "../public/_nuxt/BY-d6WLw.js"
  },
  "/_nuxt/C-vvrciU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13a-EHIARSgY97wpPSecw6sMIBskhho\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 314,
    "path": "../public/_nuxt/C-vvrciU.js"
  },
  "/_nuxt/BZNsvb8N.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27f7-V5PXInQNK8UaOrCHIZQRoka7OV4\"",
    "mtime": "2026-09-23T08:15:45.686Z",
    "size": 10231,
    "path": "../public/_nuxt/BZNsvb8N.js"
  },
  "/_nuxt/C1GpPakt.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43c-+f+pd7Eomse59XRym4bidleLS6o\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 1084,
    "path": "../public/_nuxt/C1GpPakt.js"
  },
  "/_nuxt/C0fC2fSK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"188-giVBygTHN1IEAbrPR9kRnG+6srY\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 392,
    "path": "../public/_nuxt/C0fC2fSK.js"
  },
  "/_nuxt/C4mLhTVx.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"123-7aUWv65+SB5lzBB5NRekH2U1q1c\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 291,
    "path": "../public/_nuxt/C4mLhTVx.js"
  },
  "/_nuxt/C5MU29JF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e3e-K8xTSWOON/r9pNmB/VoB6CdhQKw\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 3646,
    "path": "../public/_nuxt/C5MU29JF.js"
  },
  "/_nuxt/C7mfczgD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2d18-+xCwWzdCRUDvOTQDx8Xsz077esM\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 11544,
    "path": "../public/_nuxt/C7mfczgD.js"
  },
  "/_nuxt/C8GtwKQF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"198-s6hofnee8/Uw5vBw3Hbcz7bCkAQ\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 408,
    "path": "../public/_nuxt/C8GtwKQF.js"
  },
  "/_nuxt/C8x94m6c.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca-T2YXtyu+nRZckgEo0YVkXMs8HR8\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 202,
    "path": "../public/_nuxt/C8x94m6c.js"
  },
  "/_nuxt/C8DzDaD0.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1742-Acxh+tVl2MeNm/HBJJRhtA+sTLM\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 5954,
    "path": "../public/_nuxt/C8DzDaD0.js"
  },
  "/_nuxt/CamJpCSi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"a28-tXcrQq5f+LG0topOvl7g73VZRxE\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 2600,
    "path": "../public/_nuxt/CamJpCSi.js"
  },
  "/_nuxt/C9FoIrau.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12d-IfegphSvLP+T8GJulQPQN+CVJ2k\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 301,
    "path": "../public/_nuxt/C9FoIrau.js"
  },
  "/_nuxt/Cbmu_ape.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f72-8ZOKPi/p3iJZLtx1jqpJ+7xx5Jo\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 3954,
    "path": "../public/_nuxt/Cbmu_ape.js"
  },
  "/_nuxt/C8PMQF_q.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b359-uNcHLHMzGDPlZ79nyjUDTAUs5PA\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 45913,
    "path": "../public/_nuxt/C8PMQF_q.js"
  },
  "/_nuxt/CbOoV_9S.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"118-gjwPEhKshaEIKnU0tf3tufbP55g\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 280,
    "path": "../public/_nuxt/CbOoV_9S.js"
  },
  "/_nuxt/CDw9DNRY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12c-GqA+rgjCCltXDU1/Hm9EaUhqvXg\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 300,
    "path": "../public/_nuxt/CDw9DNRY.js"
  },
  "/_nuxt/Cf0fUHDP.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"126-Huc2jzHpdpOPcNPFU/BZd0OCXbw\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 294,
    "path": "../public/_nuxt/Cf0fUHDP.js"
  },
  "/_nuxt/CExqmynX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"180-P3/WNPXZ8zEfdPuh0lkx8ZF9UfM\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 384,
    "path": "../public/_nuxt/CExqmynX.js"
  },
  "/_nuxt/Cg8WpcgE.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17f-gG9Vk49DqZPtdh/yLC8iKw52gq0\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 383,
    "path": "../public/_nuxt/Cg8WpcgE.js"
  },
  "/_nuxt/CgQ7BQiZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"133-BvNFVZCa3VUdKZo8ooP09441q/8\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 307,
    "path": "../public/_nuxt/CgQ7BQiZ.js"
  },
  "/_nuxt/CFiJuTUb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"187-+lg0dCHA6xtGV3+5okNqbTnHfPE\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 391,
    "path": "../public/_nuxt/CFiJuTUb.js"
  },
  "/_nuxt/CgeQr6Aj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"fb-49SiNsKeAPGHtgXtqKLDXO8jiK0\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 251,
    "path": "../public/_nuxt/CgeQr6Aj.js"
  },
  "/_nuxt/CGSzEH4N.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19e-BEuNFfs5TlxNbe36t3UaLGDDTpA\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 414,
    "path": "../public/_nuxt/CGSzEH4N.js"
  },
  "/_nuxt/ChKkjixh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"130-B9m+50ZfLpZ0XKngtbFNeav9y44\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 304,
    "path": "../public/_nuxt/ChKkjixh.js"
  },
  "/_nuxt/ChcGZKlz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"192-KF65XLzZLb6N604zy88j2fLpUNc\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 402,
    "path": "../public/_nuxt/ChcGZKlz.js"
  },
  "/_nuxt/ChmtNtKJ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f1-F4i8eHjJfVKBG0hrrAcDVe6Sbm8\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 497,
    "path": "../public/_nuxt/ChmtNtKJ.js"
  },
  "/_nuxt/CkBOVRX3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"310-LBELHEesFkpR4YAPCXVWue8oR34\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 784,
    "path": "../public/_nuxt/CkBOVRX3.js"
  },
  "/_nuxt/CI9FJ157.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1356-5KxtBVbkY/LV3kBM8/EnmpVOtmo\"",
    "mtime": "2026-09-23T08:15:45.686Z",
    "size": 4950,
    "path": "../public/_nuxt/CI9FJ157.js"
  },
  "/_nuxt/Cn4izw9c.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca-T2YXtyu+nRZckgEo0YVkXMs8HR8\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 202,
    "path": "../public/_nuxt/Cn4izw9c.js"
  },
  "/_nuxt/CKx7SC-7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e21-oN/jc9qj0vS0Vim7zR+ps9Kzfdw\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 3617,
    "path": "../public/_nuxt/CKx7SC-7.js"
  },
  "/_nuxt/CkS8pjlC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18c16-elw6XgHWeDpqv5QJNEg6KqzsfLU\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 101398,
    "path": "../public/_nuxt/CkS8pjlC.js"
  },
  "/_nuxt/CO-TSnFX.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19c-NG2sY9Vj7z4+/48FffzYmhIrGDo\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 412,
    "path": "../public/_nuxt/CO-TSnFX.js"
  },
  "/_nuxt/CNLY2yXj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3502-ITl6hr5ypHbEoBwgEEwGy3HHSrA\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 13570,
    "path": "../public/_nuxt/CNLY2yXj.js"
  },
  "/_nuxt/CPhY1NZ5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2021-OZwalOazVtFiCJD6Fvg+5jNHPfg\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 8225,
    "path": "../public/_nuxt/CPhY1NZ5.js"
  },
  "/_nuxt/CqWSNKrY.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"126-hTMDkJfyw/9S4wvU74Wn4Cz8sIA\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 294,
    "path": "../public/_nuxt/CqWSNKrY.js"
  },
  "/_nuxt/CPr3F28p.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f7-nfFMzAk31w9Y5VfW7VqoQHq03zo\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 503,
    "path": "../public/_nuxt/CPr3F28p.js"
  },
  "/_nuxt/CrOY8kmF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"30ed-46Gq0mnDLm5btrA7hhylroH5J+k\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 12525,
    "path": "../public/_nuxt/CrOY8kmF.js"
  },
  "/_nuxt/Ctx9jZ4_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"422-ZO+8LsLDbSlGIXsERxQmzprjEnA\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 1058,
    "path": "../public/_nuxt/Ctx9jZ4_.js"
  },
  "/_nuxt/CSpXXZWS.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"230a-ecv00/cEfewD1ZmQC5wZyZWUsN4\"",
    "mtime": "2026-09-23T08:15:45.686Z",
    "size": 8970,
    "path": "../public/_nuxt/CSpXXZWS.js"
  },
  "/_nuxt/CU4TwwML.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"131-ETPV2jgKhAIaX7d3x1XxANfavfY\"",
    "mtime": "2026-09-23T08:15:45.696Z",
    "size": 305,
    "path": "../public/_nuxt/CU4TwwML.js"
  },
  "/_nuxt/CuqXWK-Z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"4e1a-uHHsS6hk+Grl5SmiOiuaO1en8VI\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 19994,
    "path": "../public/_nuxt/CuqXWK-Z.js"
  },
  "/_nuxt/CuYAR7dQ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bfd-Rp/mNf5sEk/645q5JARjpz/IqoI\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 3069,
    "path": "../public/_nuxt/CuYAR7dQ.js"
  },
  "/_nuxt/CVgAZKte.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"136-dHSw8C8t6hkADD02sfymC83UlFw\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 310,
    "path": "../public/_nuxt/CVgAZKte.js"
  },
  "/_nuxt/CvBSNJhH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"18c-EjMSLeQtqq7KrJPkx71Jz6Je/NM\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 396,
    "path": "../public/_nuxt/CvBSNJhH.js"
  },
  "/_nuxt/CWnxc4Oo.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"13d-YhtHokShoOnTTi339izjOja9leQ\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 317,
    "path": "../public/_nuxt/CWnxc4Oo.js"
  },
  "/_nuxt/CVF98eo1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"bf0-rsw7YihYnNsa5a1qLrqxZm2lPP4\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 3056,
    "path": "../public/_nuxt/CVF98eo1.js"
  },
  "/_nuxt/Cvnmojts.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"24cd-iTtLB50PSxbfl/7z2AeYhwG2h7Q\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 9421,
    "path": "../public/_nuxt/Cvnmojts.js"
  },
  "/_nuxt/CWx53YIh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"135-vu2rFffPhx0DIXHybBdFVIMM5v4\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 309,
    "path": "../public/_nuxt/CWx53YIh.js"
  },
  "/_nuxt/Cw_-2I6_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17d-Ts5vx82f6paB48eH72c3neKCo3Y\"",
    "mtime": "2026-09-23T08:15:45.691Z",
    "size": 381,
    "path": "../public/_nuxt/Cw_-2I6_.js"
  },
  "/_nuxt/Cy_JJf-_.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3677-iVrtahw1WyJMsOlVJWt79vM+1dg\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 13943,
    "path": "../public/_nuxt/Cy_JJf-_.js"
  },
  "/_nuxt/C_NXEC1A.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"140-Ku5FAUI0AmLzD7XyY6eDEqrQQkQ\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 320,
    "path": "../public/_nuxt/C_NXEC1A.js"
  },
  "/_nuxt/Cz8H6fdK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3043-naUXpMmujm5eSEqUG5PIhX3eeyw\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 12355,
    "path": "../public/_nuxt/Cz8H6fdK.js"
  },
  "/_nuxt/D5sl3xc5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ab-6nOIF4RYt8l7TvqHVjvfnJZOFBQ\"",
    "mtime": "2026-09-23T08:15:45.691Z",
    "size": 427,
    "path": "../public/_nuxt/D5sl3xc5.js"
  },
  "/_nuxt/ClZ_1Nv1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"79014-SR4ekVy+D67Eyldop2Qd7MuZOWs\"",
    "mtime": "2026-09-23T08:15:45.695Z",
    "size": 495636,
    "path": "../public/_nuxt/ClZ_1Nv1.js"
  },
  "/_nuxt/D3aDeg5x.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"85f5-Tnf5i3zTAJWPXzfiRGSCT+gGfJc\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 34293,
    "path": "../public/_nuxt/D3aDeg5x.js"
  },
  "/_nuxt/DCZbs5dF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"129-q+u/ppkyWmhRdYyvKx8kBXQ0o38\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 297,
    "path": "../public/_nuxt/DCZbs5dF.js"
  },
  "/_nuxt/DAewFZVj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"2c82-7HFX2XusVmVbmujUBgDYXpDzQ/U\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 11394,
    "path": "../public/_nuxt/DAewFZVj.js"
  },
  "/_nuxt/DEoDWf4S.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19f-zFnJozekfXIFzey8+rsyLOFgvJ0\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 415,
    "path": "../public/_nuxt/DEoDWf4S.js"
  },
  "/_nuxt/dGkyi887.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"b3-KTA3fCnl8S0/7P9kEiPFMfpXi0k\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 179,
    "path": "../public/_nuxt/dGkyi887.js"
  },
  "/_nuxt/DgarCxnK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"160-bFs9Qdz6zXYz0YRxeScUSiXYVms\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 352,
    "path": "../public/_nuxt/DgarCxnK.js"
  },
  "/_nuxt/DgW4bafh.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"319-0V1Yh6g5h8Y4HMWDHLl4szIA204\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 793,
    "path": "../public/_nuxt/DgW4bafh.js"
  },
  "/_nuxt/DI-ZjATZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"102-/lUr3FUAnAkqh2cjgLHkROh/KGw\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 258,
    "path": "../public/_nuxt/DI-ZjATZ.js"
  },
  "/_nuxt/DJTknqkU.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"69b-Ot6ZAxYtths7J623VwYBsM+9/Kg\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 1691,
    "path": "../public/_nuxt/DJTknqkU.js"
  },
  "/_nuxt/DhHM6Aum.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"14ea-bSi31oTFMDnhXKHz3RriftynA9A\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 5354,
    "path": "../public/_nuxt/DhHM6Aum.js"
  },
  "/_nuxt/DK4ePW-F.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"127-b15jRV6XI3W41UnKF9XEL8FbvaY\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 295,
    "path": "../public/_nuxt/DK4ePW-F.js"
  },
  "/_nuxt/DLgkC0Gy.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"136-0rKaStJkxr/Zgtf6wcfaersULH0\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 310,
    "path": "../public/_nuxt/DLgkC0Gy.js"
  },
  "/_nuxt/DKTw5cJT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1ff-YI8dsQcnLvRP3tYWAH68+WeRpcY\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 511,
    "path": "../public/_nuxt/DKTw5cJT.js"
  },
  "/_nuxt/Dl0d3s-L.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1504-NcfdTCwBVa/HkrJkCDnCPa0sCKg\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 5380,
    "path": "../public/_nuxt/Dl0d3s-L.js"
  },
  "/_nuxt/DNiROXYD.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"12e-yVdrnGuY1LkmCguk1bQUM47Umtg\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 302,
    "path": "../public/_nuxt/DNiROXYD.js"
  },
  "/_nuxt/DN4liXo1.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f1-3krQPFJBGjjm/n3sQGiwk+ljgjs\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 497,
    "path": "../public/_nuxt/DN4liXo1.js"
  },
  "/_nuxt/dPf1JbX5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"d4-6Y0aPQpKsq/3TNSkwvOxCgqu66E\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 212,
    "path": "../public/_nuxt/dPf1JbX5.js"
  },
  "/_nuxt/Doyub3GF.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ba-etFZ+WhEwrYeSA9aBSIrMxitK/I\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 186,
    "path": "../public/_nuxt/Doyub3GF.js"
  },
  "/_nuxt/DObpVwnM.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"256c-BSVhdAUq1iQDrTpGJatQt1VtAIQ\"",
    "mtime": "2026-09-23T08:15:45.686Z",
    "size": 9580,
    "path": "../public/_nuxt/DObpVwnM.js"
  },
  "/_nuxt/DTQT2l1n.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"10c-dpNJdWrI11L3D6PkzQJzBr2zHe4\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 268,
    "path": "../public/_nuxt/DTQT2l1n.js"
  },
  "/_nuxt/DkOcgTLT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"85aa1-7AdzHeUm5MKk1M8udGovuA+g6UQ\"",
    "mtime": "2026-09-23T08:15:45.695Z",
    "size": 547489,
    "path": "../public/_nuxt/DkOcgTLT.js"
  },
  "/_nuxt/DTBpMVOO.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"c7d0-xZVUMb7oddK9Q8RUc6QzKjHg3vE\"",
    "mtime": "2026-09-23T08:15:45.686Z",
    "size": 51152,
    "path": "../public/_nuxt/DTBpMVOO.js"
  },
  "/_nuxt/DtwEfCdf.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"9379-S8nx0/xwhBSmxSQig1ABKXok3nA\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 37753,
    "path": "../public/_nuxt/DtwEfCdf.js"
  },
  "/_nuxt/DW3Wck-J.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"41e-NnYQ6owngomy2BahYSRUYUaM068\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 1054,
    "path": "../public/_nuxt/DW3Wck-J.js"
  },
  "/_nuxt/Dxe03Gka.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15c-XrdH5zjDiWgAslEAEODPUvMU77M\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 348,
    "path": "../public/_nuxt/Dxe03Gka.js"
  },
  "/_nuxt/Dx3NDLFK.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"27c5-8Ht4toLDDTviDkYYzq6XrjLnC9U\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 10181,
    "path": "../public/_nuxt/Dx3NDLFK.js"
  },
  "/_nuxt/DXTpuCfR.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"f8-Fho3JRlDzr34HYsj7uLooYk/lmc\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 248,
    "path": "../public/_nuxt/DXTpuCfR.js"
  },
  "/_nuxt/DUj3icDL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1673e-pisfsFz3g4JYWp2YjVWkj05mjXk\"",
    "mtime": "2026-09-23T08:15:45.686Z",
    "size": 91966,
    "path": "../public/_nuxt/DUj3icDL.js"
  },
  "/_nuxt/DZ674dJu.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15a-0xyAW8J2QgKqKMaUZjmalCuazXc\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 346,
    "path": "../public/_nuxt/DZ674dJu.js"
  },
  "/_nuxt/DY7O861r.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"44e-+PcRnOkp8Y1ZymHS7uUR0C0KWdk\"",
    "mtime": "2026-09-23T08:15:45.686Z",
    "size": 1102,
    "path": "../public/_nuxt/DY7O861r.js"
  },
  "/_nuxt/DT2z8aJb.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"3ce95-1FIPhCqDgybVIx1lHTATQPuh3s8\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 249493,
    "path": "../public/_nuxt/DT2z8aJb.js"
  },
  "/_nuxt/DzJzr1HL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"129-DI86ODs7nCh/DiVlwbxDlIqpoaI\"",
    "mtime": "2026-09-23T08:15:45.713Z",
    "size": 297,
    "path": "../public/_nuxt/DzJzr1HL.js"
  },
  "/_nuxt/f-LDn1Vj.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"169-g0xxUXSa5R8p/e/mhJFY/jMhzaE\"",
    "mtime": "2026-09-23T08:15:45.691Z",
    "size": 361,
    "path": "../public/_nuxt/f-LDn1Vj.js"
  },
  "/_nuxt/DZV4GMpa.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f1-Zgckfc9rkspgfHUAJG/K1YmnASg\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 497,
    "path": "../public/_nuxt/DZV4GMpa.js"
  },
  "/_nuxt/ISM1KokI.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"122-T2TSq+UuEZQEs6Zzv82QWquBQHc\"",
    "mtime": "2026-09-23T08:15:45.688Z",
    "size": 290,
    "path": "../public/_nuxt/ISM1KokI.js"
  },
  "/_nuxt/IZqyMSvZ.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"172-rZhjVmvGYuEmZYNJv8WrWWg0eYI\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 370,
    "path": "../public/_nuxt/IZqyMSvZ.js"
  },
  "/_nuxt/IKfohsgp.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"171-r7E9T5d4S/8rWNtwr0f5io5CuM8\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 369,
    "path": "../public/_nuxt/IKfohsgp.js"
  },
  "/_nuxt/HvyjfoUN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"6821-4CEsCmJR6XblQkzQacybBRGaYWk\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 26657,
    "path": "../public/_nuxt/HvyjfoUN.js"
  },
  "/_nuxt/mBe3RFH7.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"ca-T2YXtyu+nRZckgEo0YVkXMs8HR8\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 202,
    "path": "../public/_nuxt/mBe3RFH7.js"
  },
  "/_nuxt/K0TUwK65.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1f3-ghTXQ6kjyTPNK/PcA/QT9B+dg3E\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 499,
    "path": "../public/_nuxt/K0TUwK65.js"
  },
  "/_nuxt/Khji87Hz.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"204-TvaIP7nKHKOzCe9YnJkSzboBLaQ\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 516,
    "path": "../public/_nuxt/Khji87Hz.js"
  },
  "/_nuxt/kqzVAPwH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"eb0-YsQmfeTsmHpC1hLNtJfH3Ddf1tA\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 3760,
    "path": "../public/_nuxt/kqzVAPwH.js"
  },
  "/_nuxt/mlEFzGC5.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"119-N0iNvIEt4RD7ikXq/esnb4zz3HA\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 281,
    "path": "../public/_nuxt/mlEFzGC5.js"
  },
  "/_nuxt/mThPep5z.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a9-zsZvbpYayWlLhe4C//lCGwuM1W0\"",
    "mtime": "2026-09-23T08:15:45.690Z",
    "size": 425,
    "path": "../public/_nuxt/mThPep5z.js"
  },
  "/_nuxt/Nst2Hpb2.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a5-OUP3vLz1RMPI2NGDc5g+Nk6w0jQ\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 421,
    "path": "../public/_nuxt/Nst2Hpb2.js"
  },
  "/_nuxt/P2hg-Snn.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"198-Wn0zhJwZPe0ZiwfcNLd9WqM89oo\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 408,
    "path": "../public/_nuxt/P2hg-Snn.js"
  },
  "/_nuxt/qLPRNqqL.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"136-/3rabWCRhI41fp+iFJsBX15tisg\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 310,
    "path": "../public/_nuxt/qLPRNqqL.js"
  },
  "/_nuxt/RT6hB3qi.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19a-FcESfjVijw55rT2JzI8l1qmceaM\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 410,
    "path": "../public/_nuxt/RT6hB3qi.js"
  },
  "/_nuxt/PoteEIum.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"47a0-KdOi6m94hA7FGoJJkZ+covgP3MM\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 18336,
    "path": "../public/_nuxt/PoteEIum.js"
  },
  "/_nuxt/rUrcRAtC.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"19a-CilZlaLCGd1FK/ZDqT8mTjh/6oE\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 410,
    "path": "../public/_nuxt/rUrcRAtC.js"
  },
  "/_nuxt/NzPVCKV-.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"e720-RqBODQ58PUw1QdWJ9rnrP1n8dTg\"",
    "mtime": "2026-09-23T08:15:45.687Z",
    "size": 59168,
    "path": "../public/_nuxt/NzPVCKV-.js"
  },
  "/_nuxt/tvFv8JjT.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"124-NGETlI7oGwUUUNdeROdy5wpbjhM\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 292,
    "path": "../public/_nuxt/tvFv8JjT.js"
  },
  "/_nuxt/T3CLYGMv.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"127-wCW4d3vAvrf6tCVGVQjSFnWgMLU\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 295,
    "path": "../public/_nuxt/T3CLYGMv.js"
  },
  "/_nuxt/t2CTHRfl.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"17e-vEP/QMOLrbV/h1c6J7s3Ui8QKko\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 382,
    "path": "../public/_nuxt/t2CTHRfl.js"
  },
  "/_nuxt/uGhp_O27.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a0-dnU2LnIMHELhvi7wIam9siDFqqs\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 416,
    "path": "../public/_nuxt/uGhp_O27.js"
  },
  "/_nuxt/UweJtyIr.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"132-O90T0LFdXxKrsXN+UWQcKd+pdgs\"",
    "mtime": "2026-09-23T08:15:45.692Z",
    "size": 306,
    "path": "../public/_nuxt/UweJtyIr.js"
  },
  "/_nuxt/uEIf5s8e.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"189-5aKmKa/Xo+8enyV5Ms1bna64vZ0\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 393,
    "path": "../public/_nuxt/uEIf5s8e.js"
  },
  "/_nuxt/wF11E5jH.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1a8-XBuiR40H+ab9OO14gA841qxcxFo\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 424,
    "path": "../public/_nuxt/wF11E5jH.js"
  },
  "/_nuxt/wfpAVPUm.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"15a-IOnwMLiAneuBIo4rwTidY/lJgJs\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 346,
    "path": "../public/_nuxt/wfpAVPUm.js"
  },
  "/_nuxt/pdf.worker.min.BmVo14Nb.mjs": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"1418aa-Lz7lnu+KQz6qCgkYkL1GAASHcgc\"",
    "mtime": "2026-09-23T08:15:45.712Z",
    "size": 1317034,
    "path": "../public/_nuxt/pdf.worker.min.BmVo14Nb.mjs"
  },
  "/_nuxt/WpzroftW.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"134-0/fqycQ18Qd90vgDZHmkqvs8q08\"",
    "mtime": "2026-09-23T08:15:45.693Z",
    "size": 308,
    "path": "../public/_nuxt/WpzroftW.js"
  },
  "/crm/brands/cdek.svg": {
    "type": "image/svg+xml",
    "etag": "\"6f0-+WokZvU48NmHfORtjrS8rvkfVbk\"",
    "mtime": "2026-09-23T07:33:40.123Z",
    "size": 1776,
    "path": "../public/crm/brands/cdek.svg"
  },
  "/_nuxt/Xks6Sdh3.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"101-n5Aam2HHs9A25v6TnroONzOADow\"",
    "mtime": "2026-09-23T08:15:45.689Z",
    "size": 257,
    "path": "../public/_nuxt/Xks6Sdh3.js"
  },
  "/crm/brands/one_c.svg": {
    "type": "image/svg+xml",
    "etag": "\"ff9-itxGZcnH4/AFGFsRq5JcBJrZB2Y\"",
    "mtime": "2026-09-23T07:33:36.924Z",
    "size": 4089,
    "path": "../public/crm/brands/one_c.svg"
  },
  "/crm/brands/max.svg": {
    "type": "image/svg+xml",
    "etag": "\"13345-W6PcYgmUGBl9CYB8Ly3/87KYvfc\"",
    "mtime": "2026-09-23T07:33:36.955Z",
    "size": 78661,
    "path": "../public/crm/brands/max.svg"
  },
  "/crm/brands/ozon.svg": {
    "type": "image/svg+xml",
    "etag": "\"b3d-NjqidwCjsDMXq/dyT2rqWC035fQ\"",
    "mtime": "2026-09-23T07:33:36.919Z",
    "size": 2877,
    "path": "../public/crm/brands/ozon.svg"
  },
  "/crm/brands/ozon_logistics.svg": {
    "type": "image/svg+xml",
    "etag": "\"b3d-NjqidwCjsDMXq/dyT2rqWC035fQ\"",
    "mtime": "2026-09-23T07:33:36.920Z",
    "size": 2877,
    "path": "../public/crm/brands/ozon_logistics.svg"
  },
  "/crm/brands/sms_aero.svg": {
    "type": "image/svg+xml",
    "etag": "\"fe9-5etthIPeJyfKyCgT809cScYY4VY\"",
    "mtime": "2026-09-23T07:33:36.930Z",
    "size": 4073,
    "path": "../public/crm/brands/sms_aero.svg"
  },
  "/crm/brands/telegram.svg": {
    "type": "image/svg+xml",
    "etag": "\"abd-CMgGPFKLG0PcfigUTsGjxAujKA4\"",
    "mtime": "2026-09-23T07:33:36.933Z",
    "size": 2749,
    "path": "../public/crm/brands/telegram.svg"
  },
  "/crm/brands/vk.svg": {
    "type": "image/svg+xml",
    "etag": "\"6a1-PGgXRkn1ggMDnJcMePNR2dYv1lA\"",
    "mtime": "2026-09-23T07:33:36.957Z",
    "size": 1697,
    "path": "../public/crm/brands/vk.svg"
  },
  "/crm/brands/wildberries.svg": {
    "type": "image/svg+xml",
    "etag": "\"e1d-vt5t73i0nbfZNsvNgl8eV8MbHt0\"",
    "mtime": "2026-09-23T07:33:36.921Z",
    "size": 3613,
    "path": "../public/crm/brands/wildberries.svg"
  },
  "/crm/brands/yandex_delivery.svg": {
    "type": "image/svg+xml",
    "etag": "\"3430-odWwGVBYM8b7VvpbWKFsLled+fE\"",
    "mtime": "2026-09-23T07:33:36.923Z",
    "size": 13360,
    "path": "../public/crm/brands/yandex_delivery.svg"
  },
  "/crm/brands/yandex_market.svg": {
    "type": "image/svg+xml",
    "etag": "\"c61-wQuhpAC+vpKQZb3GEZetNnLKmto\"",
    "mtime": "2026-09-23T07:33:36.922Z",
    "size": 3169,
    "path": "../public/crm/brands/yandex_market.svg"
  },
  "/crm/brands/yookassa.svg": {
    "type": "image/svg+xml",
    "etag": "\"8c5-AtL4Gzr/xA1tedAsLj+8rcAWNMM\"",
    "mtime": "2026-09-23T07:33:36.928Z",
    "size": 2245,
    "path": "../public/crm/brands/yookassa.svg"
  },
  "/crm/pwa/connection.json": {
    "type": "application/json",
    "etag": "\"1b-f9iJffRCbG8F+QqIOPr9iGRUwq4\"",
    "mtime": "2026-09-22T09:57:12.430Z",
    "size": 27,
    "path": "../public/crm/pwa/connection.json"
  },
  "/crm/pwa/icon-192.png": {
    "type": "image/png",
    "etag": "\"923-FHF8y/oBzqegU69vTPDPCcErwOs\"",
    "mtime": "2026-09-22T09:44:59.627Z",
    "size": 2339,
    "path": "../public/crm/pwa/icon-192.png"
  },
  "/crm/pwa/icon-180.png": {
    "type": "image/png",
    "etag": "\"883-9yPxbhac+murZwg4AfPJcac0US4\"",
    "mtime": "2026-09-22T09:44:59.556Z",
    "size": 2179,
    "path": "../public/crm/pwa/icon-180.png"
  },
  "/crm/pwa/icon-512.png": {
    "type": "image/png",
    "etag": "\"195e-VumR8paCS0stM8cgwjtgAZRKxfA\"",
    "mtime": "2026-09-22T09:44:59.699Z",
    "size": 6494,
    "path": "../public/crm/pwa/icon-512.png"
  },
  "/crm/pwa/icon.svg": {
    "type": "image/svg+xml",
    "etag": "\"1e6-BWayiiDnWTe0zWi4BzIezvKRdkA\"",
    "mtime": "2026-09-22T09:44:40.879Z",
    "size": 486,
    "path": "../public/crm/pwa/icon.svg"
  },
  "/crm/pwa/offline.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"286-lvQBtgNX3z8dEq5Whyk9g2ShvN8\"",
    "mtime": "2026-09-22T10:37:35.617Z",
    "size": 646,
    "path": "../public/crm/pwa/offline.css"
  },
  "/crm/pwa/offline.html": {
    "type": "text/html; charset=utf-8",
    "etag": "\"3ee-Iw2t+PeUZyXlUxx93Cotr6A9b9o\"",
    "mtime": "2026-09-22T09:44:40.869Z",
    "size": 1006,
    "path": "../public/crm/pwa/offline.html"
  },
  "/crm/pwa/offline.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"43d-22rYd9ZRAhvV49iJdVnf7a4zYHc\"",
    "mtime": "2026-09-22T09:57:12.429Z",
    "size": 1085,
    "path": "../public/crm/pwa/offline.js"
  },
  "/storefront/categories/bases.jpg": {
    "type": "image/jpeg",
    "etag": "\"1ed7f-Y3ibL51nuiVc/MPyGc95nA0FL6E\"",
    "mtime": "2026-09-15T12:35:34.340Z",
    "size": 126335,
    "path": "../public/storefront/categories/bases.jpg"
  },
  "/storefront/categories/cutters.jpg": {
    "type": "image/jpeg",
    "etag": "\"18e7d-K/GtECUIi+bQ60kAShnkRf3Uz2E\"",
    "mtime": "2026-09-15T12:35:31.865Z",
    "size": 102013,
    "path": "../public/storefront/categories/cutters.jpg"
  },
  "/_nuxt/_A_dCRMN.js": {
    "type": "text/javascript; charset=utf-8",
    "etag": "\"130-4KyZeWcoJ+thnfueqxCXSJMpNOY\"",
    "mtime": "2026-09-23T08:15:45.694Z",
    "size": 304,
    "path": "../public/_nuxt/_A_dCRMN.js"
  },
  "/storefront/categories/gel-polish.jpg": {
    "type": "image/jpeg",
    "etag": "\"13eaa-m/uwaFhlKSVL3Ys1y9XPbU2luLA\"",
    "mtime": "2026-09-15T12:35:37.995Z",
    "size": 81578,
    "path": "../public/storefront/categories/gel-polish.jpg"
  },
  "/storefront/categories/gels.jpg": {
    "type": "image/jpeg",
    "etag": "\"2837e-MncTrTOfCprKZnMQZOQLrVZbW8w\"",
    "mtime": "2026-09-15T12:35:36.223Z",
    "size": 164734,
    "path": "../public/storefront/categories/gels.jpg"
  },
  "/storefront/categories/instruments.jpg": {
    "type": "image/jpeg",
    "etag": "\"99f6-7Borox2yIbQ8Gah7frTHEVseouY\"",
    "mtime": "2026-09-15T12:35:39.229Z",
    "size": 39414,
    "path": "../public/storefront/categories/instruments.jpg"
  },
  "/storefront/categories/tops.jpg": {
    "type": "image/jpeg",
    "etag": "\"dce0-sBl0LPmUi5mKmTXtPCvNpnqXNmg\"",
    "mtime": "2026-09-15T12:35:33.045Z",
    "size": 56544,
    "path": "../public/storefront/categories/tops.jpg"
  },
  "/storefront/icons/instagram.svg": {
    "type": "image/svg+xml",
    "etag": "\"10c-+GExxw0IoKFQhyFBFKmoB/3tq1w\"",
    "mtime": "2026-09-18T14:21:31.309Z",
    "size": 268,
    "path": "../public/storefront/icons/instagram.svg"
  },
  "/storefront/icons/max.svg": {
    "type": "image/svg+xml",
    "etag": "\"11c9e-Jq+n6BqkaaTn2TmU6o/ARGsDm1E\"",
    "mtime": "2026-09-15T13:28:35.871Z",
    "size": 72862,
    "path": "../public/storefront/icons/max.svg"
  },
  "/storefront/icons/telegram.svg": {
    "type": "image/svg+xml",
    "etag": "\"2e6-AnwhvypDeZB+7Aiuo0JsN1SOnNY\"",
    "mtime": "2026-09-15T13:28:35.224Z",
    "size": 742,
    "path": "../public/storefront/icons/telegram.svg"
  },
  "/storefront/icons/vk-id.svg": {
    "type": "image/svg+xml",
    "etag": "\"31a-nXc/ytJC7mKhEdny2iLqOOtZ74A\"",
    "mtime": "2026-09-16T08:39:04.258Z",
    "size": 794,
    "path": "../public/storefront/icons/vk-id.svg"
  },
  "/storefront/icons/vk.svg": {
    "type": "image/svg+xml",
    "etag": "\"4fe-zxxPkZ4GmsxmthF1OrFl77UYK5c\"",
    "mtime": "2026-09-15T13:28:34.983Z",
    "size": 1278,
    "path": "../public/storefront/icons/vk.svg"
  },
  "/storefront/icons/yandex-id.svg": {
    "type": "image/svg+xml",
    "etag": "\"18c-2KOc/o8OPYWDyXjqSgWSV9SGxoY\"",
    "mtime": "2026-09-16T08:39:04.257Z",
    "size": 396,
    "path": "../public/storefront/icons/yandex-id.svg"
  },
  "/storefront/icons/youtube.svg": {
    "type": "image/svg+xml",
    "etag": "\"e5-hNtUGs1dQCUolPpOweFrS3DIKQQ\"",
    "mtime": "2026-09-18T14:21:31.317Z",
    "size": 229,
    "path": "../public/storefront/icons/youtube.svg"
  },
  "/storefront/products/cutter-ball.jpg": {
    "type": "image/jpeg",
    "etag": "\"24e8a-ObCt/wfHbyDNZnz2X9p1thsCFgs\"",
    "mtime": "2026-09-15T12:35:42.951Z",
    "size": 151178,
    "path": "../public/storefront/products/cutter-ball.jpg"
  },
  "/storefront/products/gel-mousse-23.jpg": {
    "type": "image/jpeg",
    "etag": "\"18d5c-wYIemwidjw/yOpNwkwDyPSx6DXM\"",
    "mtime": "2026-09-15T12:35:44.565Z",
    "size": 101724,
    "path": "../public/storefront/products/gel-mousse-23.jpg"
  },
  "/storefront/products/gel-mousse-clear.jpg": {
    "type": "image/jpeg",
    "etag": "\"1b9f3-JIMXsBg8QbWgS/j3wBsHVo53kgc\"",
    "mtime": "2026-09-15T12:35:40.713Z",
    "size": 113139,
    "path": "../public/storefront/products/gel-mousse-clear.jpg"
  },
  "/crm/pdf/fonts/FoxitDingbats.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"7349-sofnTG9lKW2GnzeKndc6DIB7rAU\"",
    "mtime": "2026-09-22T11:30:11.319Z",
    "size": 29513,
    "path": "../public/crm/pdf/fonts/FoxitDingbats.pfb"
  },
  "/crm/pdf/fonts/FoxitFixed.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"44bd-QkM0DLxkTzVSNaPxIypfgikP/oc\"",
    "mtime": "2026-09-22T11:30:11.340Z",
    "size": 17597,
    "path": "../public/crm/pdf/fonts/FoxitFixed.pfb"
  },
  "/storefront/products/speed-gel-002.jpg": {
    "type": "image/jpeg",
    "etag": "\"21b61-4Kr6XsX4H0888U6TvWtscS+de9U\"",
    "mtime": "2026-09-15T12:35:46.290Z",
    "size": 138081,
    "path": "../public/storefront/products/speed-gel-002.jpg"
  },
  "/crm/pdf/fonts/FoxitFixedBold.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"4687-Fclwk/u3B+HgOWe2oP/bzGYGWUk\"",
    "mtime": "2026-09-22T11:30:11.364Z",
    "size": 18055,
    "path": "../public/crm/pdf/fonts/FoxitFixedBold.pfb"
  },
  "/crm/pdf/fonts/FoxitFixedBoldItalic.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"4acf-vtPtw5KJJ67LNfSR2nvO7qwUsAc\"",
    "mtime": "2026-09-22T11:30:11.385Z",
    "size": 19151,
    "path": "../public/crm/pdf/fonts/FoxitFixedBoldItalic.pfb"
  },
  "/crm/pdf/fonts/FoxitFixedItalic.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"493a-uQs/sY2kHfe0j3ucjdrQ+ePYbS0\"",
    "mtime": "2026-09-22T11:30:11.406Z",
    "size": 18746,
    "path": "../public/crm/pdf/fonts/FoxitFixedItalic.pfb"
  },
  "/crm/pdf/fonts/FoxitSerif.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"4c0d-vk3dIqnv2+QpJK6hbazPPaJ+UYs\"",
    "mtime": "2026-09-22T11:30:11.444Z",
    "size": 19469,
    "path": "../public/crm/pdf/fonts/FoxitSerif.pfb"
  },
  "/crm/pdf/fonts/FoxitSerifBold.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"4bc3-Al/uP7mObmXy58WNteNn2o8ladk\"",
    "mtime": "2026-09-22T11:30:11.449Z",
    "size": 19395,
    "path": "../public/crm/pdf/fonts/FoxitSerifBold.pfb"
  },
  "/crm/pdf/fonts/FoxitSerifBoldItalic.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"50fd-tAL8enXsByR9y7TT773TRTjySyE\"",
    "mtime": "2026-09-22T11:30:11.462Z",
    "size": 20733,
    "path": "../public/crm/pdf/fonts/FoxitSerifBoldItalic.pfb"
  },
  "/crm/pdf/fonts/FoxitSerifItalic.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"52eb-cHvqY3veSQcPXzQYWTsKeKk+m7g\"",
    "mtime": "2026-09-22T11:30:11.500Z",
    "size": 21227,
    "path": "../public/crm/pdf/fonts/FoxitSerifItalic.pfb"
  },
  "/crm/pdf/fonts/FoxitSymbol.pfb": {
    "type": "application/x-font-type1",
    "etag": "\"4159-jcFsbTmVOZrXyKk5UlrvCZjDH8Q\"",
    "mtime": "2026-09-22T11:30:11.523Z",
    "size": 16729,
    "path": "../public/crm/pdf/fonts/FoxitSymbol.pfb"
  },
  "/crm/pdf/fonts/LiberationSans-Bold.ttf": {
    "type": "font/ttf",
    "etag": "\"2175c-OalrdVavZzJjuDT+LhDz3qBlNpU\"",
    "mtime": "2026-09-22T11:30:12.226Z",
    "size": 137052,
    "path": "../public/crm/pdf/fonts/LiberationSans-Bold.ttf"
  },
  "/crm/pdf/fonts/LiberationSans-BoldItalic.ttf": {
    "type": "font/ttf",
    "etag": "\"20fd4-R7wziw9DkXMLUzCcorZ4dZsfIjA\"",
    "mtime": "2026-09-22T11:30:12.232Z",
    "size": 135124,
    "path": "../public/crm/pdf/fonts/LiberationSans-BoldItalic.ttf"
  },
  "/crm/pdf/fonts/LiberationSans-Italic.ttf": {
    "type": "font/ttf",
    "etag": "\"278f4-tIr/uW1I4neq4hqoDhj6QbEqvM8\"",
    "mtime": "2026-09-22T11:30:12.238Z",
    "size": 162036,
    "path": "../public/crm/pdf/fonts/LiberationSans-Italic.ttf"
  },
  "/crm/pdf/fonts/LiberationSans-Regular.ttf": {
    "type": "font/ttf",
    "etag": "\"220f8-6Lf6ZgV65B3D4DWYIR/LyndEtJU\"",
    "mtime": "2026-09-22T11:30:12.247Z",
    "size": 139512,
    "path": "../public/crm/pdf/fonts/LiberationSans-Regular.ttf"
  },
  "/crm/pdf/fonts/LICENSE_FOXIT": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"611-aJxTIwjaYB0QvrphtmcrDBbcO0g\"",
    "mtime": "2026-09-22T11:29:46.443Z",
    "size": 1553,
    "path": "../public/crm/pdf/fonts/LICENSE_FOXIT"
  },
  "/crm/pdf/fonts/LICENSE_LIBERATION": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"568a-5LL/9D+9iw8PKWjQ7WvvdE9NgbQ\"",
    "mtime": "2026-09-22T11:29:46.452Z",
    "size": 22154,
    "path": "../public/crm/pdf/fonts/LICENSE_LIBERATION"
  },
  "/crm/pdf/cmaps/78-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"964-yEpf4FuypeTlmTKdDrs+2P4ev98\"",
    "mtime": "2026-09-22T11:29:46.472Z",
    "size": 2404,
    "path": "../public/crm/pdf/cmaps/78-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/78-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"ad-Z43LqHICJhMxUDdPeEk8wJybjZ4\"",
    "mtime": "2026-09-22T11:29:46.473Z",
    "size": 173,
    "path": "../public/crm/pdf/cmaps/78-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/78-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"94b-53RJQnpdVBHJ2hwaZOHjrjYrvN8\"",
    "mtime": "2026-09-22T11:29:46.476Z",
    "size": 2379,
    "path": "../public/crm/pdf/cmaps/78-H.bcmap"
  },
  "/crm/pdf/cmaps/78-RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"ad-P6aDDj5cawzF0DQCz7ZxKgTAjTE\"",
    "mtime": "2026-09-22T11:29:46.482Z",
    "size": 173,
    "path": "../public/crm/pdf/cmaps/78-RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/78-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a9-xYpSG9+tb/4w4pJQWZKjlgM9A8M\"",
    "mtime": "2026-09-22T11:29:46.484Z",
    "size": 169,
    "path": "../public/crm/pdf/cmaps/78-V.bcmap"
  },
  "/crm/pdf/cmaps/78-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"95e-Xw8gKTKGXDjnsLBpJOQZx390voU\"",
    "mtime": "2026-09-22T11:29:46.480Z",
    "size": 2398,
    "path": "../public/crm/pdf/cmaps/78-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/78ms-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a5b-7zffaF5HeXIrNPzAJrGWsiS/yhM\"",
    "mtime": "2026-09-22T11:29:46.487Z",
    "size": 2651,
    "path": "../public/crm/pdf/cmaps/78ms-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/78ms-RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"122-J9RXCEkRB7LPZzws1YS/Ison5OQ\"",
    "mtime": "2026-09-22T11:29:46.488Z",
    "size": 290,
    "path": "../public/crm/pdf/cmaps/78ms-RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/83pv-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"389-xEdPd9lL5m13G6aPGP8v1gajyCA\"",
    "mtime": "2026-09-22T11:29:46.490Z",
    "size": 905,
    "path": "../public/crm/pdf/cmaps/83pv-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/90ms-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2d1-mUym1iMtkb4EfGjgh+CVHcyky6Q\"",
    "mtime": "2026-09-22T11:29:46.491Z",
    "size": 721,
    "path": "../public/crm/pdf/cmaps/90ms-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/90ms-RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"122-xO2OC4L8Kf9hQMcuyKs6zDzQV48\"",
    "mtime": "2026-09-22T11:29:46.493Z",
    "size": 290,
    "path": "../public/crm/pdf/cmaps/90ms-RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/90msp-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2cb-0/AtZyTZyR0HftOFRckyHbpltiQ\"",
    "mtime": "2026-09-22T11:29:46.495Z",
    "size": 715,
    "path": "../public/crm/pdf/cmaps/90msp-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/90msp-RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"123-3fwP2zQxTy1xFtcH+m27JLyb85A\"",
    "mtime": "2026-09-22T11:29:46.501Z",
    "size": 291,
    "path": "../public/crm/pdf/cmaps/90msp-RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/90pv-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"3d6-diGKze2UstKfdHc15/tB8ZzuhOs\"",
    "mtime": "2026-09-22T11:29:46.503Z",
    "size": 982,
    "path": "../public/crm/pdf/cmaps/90pv-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/90pv-RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"104-cpbTOfXB2EO4I0gvorOFfAVZ65M\"",
    "mtime": "2026-09-22T11:29:46.505Z",
    "size": 260,
    "path": "../public/crm/pdf/cmaps/90pv-RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/Add-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"973-zVXsPVYnuAUF19vqQz5XAvjAUmA\"",
    "mtime": "2026-09-22T11:29:46.509Z",
    "size": 2419,
    "path": "../public/crm/pdf/cmaps/Add-H.bcmap"
  },
  "/crm/pdf/cmaps/Add-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"96d-mhfCaN7Ph23DXF8gxmDuY1Y/pSM\"",
    "mtime": "2026-09-22T11:29:46.511Z",
    "size": 2413,
    "path": "../public/crm/pdf/cmaps/Add-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/Add-RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"11f-Dk7xHtf05e07LjLyZ/TD+0NZ0I4\"",
    "mtime": "2026-09-22T11:29:46.516Z",
    "size": 287,
    "path": "../public/crm/pdf/cmaps/Add-RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/Add-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"11a-Asp7gLUHZA35mOm19tJbNGCC2ME\"",
    "mtime": "2026-09-22T11:29:46.520Z",
    "size": 282,
    "path": "../public/crm/pdf/cmaps/Add-V.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-0.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"13d-JBzM/IW1756kYY+UpjQeAtGwO5g\"",
    "mtime": "2026-09-22T11:29:46.521Z",
    "size": 317,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-0.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-1.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"173-83tbaBmGkMgnAyLaoOpSIiWkYSc\"",
    "mtime": "2026-09-22T11:29:46.523Z",
    "size": 371,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-1.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"178-pWi+5xsS7E55ovplxOufhlxQWl4\"",
    "mtime": "2026-09-22T11:29:46.525Z",
    "size": 376,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-2.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-3.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"191-71Z7WCVOA4N9RuH9/0/qXM4xinQ\"",
    "mtime": "2026-09-22T11:29:46.526Z",
    "size": 401,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-3.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-4.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"195-X4H0eCpfmWZJ3DGMFYeudyiv0Qs\"",
    "mtime": "2026-09-22T11:29:46.528Z",
    "size": 405,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-4.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-5.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"196-t9586kFXXHkzz/25F60fkY33bHA\"",
    "mtime": "2026-09-22T11:29:46.531Z",
    "size": 406,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-5.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-6.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"196-TqouxUjffNvezi7sIn/bnUyy8oE\"",
    "mtime": "2026-09-22T11:29:46.533Z",
    "size": 406,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-6.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-CNS1-UCS2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a0e9-vulx0EyuedeRpSvw09Xi6d6x0cg\"",
    "mtime": "2026-09-22T11:29:46.542Z",
    "size": 41193,
    "path": "../public/crm/pdf/cmaps/Adobe-CNS1-UCS2.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-GB1-0.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"d9-hu3xRQgNL+26LwoLCrG8GNmlr1U\"",
    "mtime": "2026-09-22T11:29:46.544Z",
    "size": 217,
    "path": "../public/crm/pdf/cmaps/Adobe-GB1-0.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-GB1-1.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"fa-g8wo79XneLnTeJj5sQC1ArxELcM\"",
    "mtime": "2026-09-22T11:29:46.623Z",
    "size": 250,
    "path": "../public/crm/pdf/cmaps/Adobe-GB1-1.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-GB1-2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1d1-o84BMq9UFz0wpDMDFLxM8nP8Kcg\"",
    "mtime": "2026-09-22T11:29:46.626Z",
    "size": 465,
    "path": "../public/crm/pdf/cmaps/Adobe-GB1-2.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-GB1-4.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"259-zuMAe7Qe0bvn/SLwVMD7A2qSyM8\"",
    "mtime": "2026-09-22T11:29:46.630Z",
    "size": 601,
    "path": "../public/crm/pdf/cmaps/Adobe-GB1-4.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-GB1-3.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1d6-x7bPvqxoEBB3HQItMZkTx5hBbXU\"",
    "mtime": "2026-09-22T11:29:46.628Z",
    "size": 470,
    "path": "../public/crm/pdf/cmaps/Adobe-GB1-3.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-GB1-UCS2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"84b6-IzZmJO+mdOJJOhi/a24sFpKdaNM\"",
    "mtime": "2026-09-22T11:29:46.721Z",
    "size": 33974,
    "path": "../public/crm/pdf/cmaps/Adobe-GB1-UCS2.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-GB1-5.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"271-p9lEB4TXc1B+PYPQv5P6jZOjKJ8\"",
    "mtime": "2026-09-22T11:29:46.635Z",
    "size": 625,
    "path": "../public/crm/pdf/cmaps/Adobe-GB1-5.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-0.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"e1-zltJToCcMGIZaBadAdETbzrRzjw\"",
    "mtime": "2026-09-22T11:29:46.727Z",
    "size": 225,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-0.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-1.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"e2-p2ayl0WjCqMxbK/HPYhMJxzBL/Q\"",
    "mtime": "2026-09-22T11:29:46.730Z",
    "size": 226,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-1.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"e9-eMTobP+KocLyvBiq+DCVqW8LylA\"",
    "mtime": "2026-09-22T11:29:46.735Z",
    "size": 233,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-2.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-3.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"f2-W1INLPN+IbCEvJ5qIdAGxT5OVS4\"",
    "mtime": "2026-09-22T11:29:46.736Z",
    "size": 242,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-3.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-4.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"151-QTbJAvRxXtGLiyOQll02IdL9oEg\"",
    "mtime": "2026-09-22T11:29:46.738Z",
    "size": 337,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-4.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-6.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1e5-37p6slG1rAfXZIxOgegI6glleMk\"",
    "mtime": "2026-09-22T11:29:46.742Z",
    "size": 485,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-6.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-5.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1ae-OJcP1Bahw+9PqiUAklQ0difSSWQ\"",
    "mtime": "2026-09-22T11:29:46.740Z",
    "size": 430,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-5.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Japan1-UCS2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9ff7-2ZwNkIuAda+mmqPFeak5OxOyndk\"",
    "mtime": "2026-09-22T11:29:46.750Z",
    "size": 40951,
    "path": "../public/crm/pdf/cmaps/Adobe-Japan1-UCS2.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Korea1-0.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"f1-yo4XdM3ShZugNB5EdNB9b7L5OVs\"",
    "mtime": "2026-09-22T11:29:46.752Z",
    "size": 241,
    "path": "../public/crm/pdf/cmaps/Adobe-Korea1-0.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Korea1-1.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"182-6beDljFgOAzP4z+h3N2cebHPKTQ\"",
    "mtime": "2026-09-22T11:29:46.753Z",
    "size": 386,
    "path": "../public/crm/pdf/cmaps/Adobe-Korea1-1.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Korea1-2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"187-C41/2EjePvqG+VjG4c9a7Om/G/Q\"",
    "mtime": "2026-09-22T11:29:46.754Z",
    "size": 391,
    "path": "../public/crm/pdf/cmaps/Adobe-Korea1-2.bcmap"
  },
  "/crm/pdf/cmaps/Adobe-Korea1-UCS2.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"5afd-FeTgfJaJGiuyd4td+N0KEx7e7VI\"",
    "mtime": "2026-09-22T11:29:46.760Z",
    "size": 23293,
    "path": "../public/crm/pdf/cmaps/Adobe-Korea1-UCS2.bcmap"
  },
  "/crm/pdf/cmaps/B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"43e-dx1xFTv2UtETS31lvrivxgyDX/Y\"",
    "mtime": "2026-09-22T11:29:46.767Z",
    "size": 1086,
    "path": "../public/crm/pdf/cmaps/B5-H.bcmap"
  },
  "/crm/pdf/cmaps/B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"8e-38c2LBV8JGUXYeUhbvDEarp5VIg\"",
    "mtime": "2026-09-22T11:29:46.769Z",
    "size": 142,
    "path": "../public/crm/pdf/cmaps/B5-V.bcmap"
  },
  "/crm/pdf/cmaps/B5pc-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"44b-KdX9QdyPxPGbWZSbmn9BDWP0870\"",
    "mtime": "2026-09-22T11:29:46.771Z",
    "size": 1099,
    "path": "../public/crm/pdf/cmaps/B5pc-H.bcmap"
  },
  "/crm/pdf/cmaps/B5pc-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"90-8Srm7SMgE2lZQg4osbk3ABzdTws\"",
    "mtime": "2026-09-22T11:29:46.773Z",
    "size": 144,
    "path": "../public/crm/pdf/cmaps/B5pc-V.bcmap"
  },
  "/crm/pdf/cmaps/CNS-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"6f4-HaeOtSeBMwFIyVzPZMeO3SByqZE\"",
    "mtime": "2026-09-22T11:29:46.775Z",
    "size": 1780,
    "path": "../public/crm/pdf/cmaps/CNS-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/CNS-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"780-iV/gOSWNrgDXqM6pOzsH15RUPS0\"",
    "mtime": "2026-09-22T11:29:46.777Z",
    "size": 1920,
    "path": "../public/crm/pdf/cmaps/CNS-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/CNS1-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2c2-B/Qisoyk/t8s3GzN9VHq7K5A9gs\"",
    "mtime": "2026-09-22T11:29:46.779Z",
    "size": 706,
    "path": "../public/crm/pdf/cmaps/CNS1-H.bcmap"
  },
  "/crm/pdf/cmaps/CNS2-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"5d-wIcMP62DSeM5H/fNop0fOpF+J/E\"",
    "mtime": "2026-09-22T11:29:46.786Z",
    "size": 93,
    "path": "../public/crm/pdf/cmaps/CNS2-V.bcmap"
  },
  "/crm/pdf/cmaps/CNS1-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"8f-dFW9kuGh8yv9LLW4Drk4qmZfa4o\"",
    "mtime": "2026-09-22T11:29:46.781Z",
    "size": 143,
    "path": "../public/crm/pdf/cmaps/CNS1-V.bcmap"
  },
  "/crm/pdf/cmaps/CNS2-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1f8-BXCoGGMRu6StIWJQ+AVGEiDUHQo\"",
    "mtime": "2026-09-22T11:29:46.783Z",
    "size": 504,
    "path": "../public/crm/pdf/cmaps/CNS2-H.bcmap"
  },
  "/crm/pdf/cmaps/ETen-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"465-nDtwcA164rjEzG9ljNyY9OZbO+Q\"",
    "mtime": "2026-09-22T11:29:46.788Z",
    "size": 1125,
    "path": "../public/crm/pdf/cmaps/ETen-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/ETen-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9e-W2N/obIDdU2YRjBTs4ovaUzeSZs\"",
    "mtime": "2026-09-22T11:29:46.789Z",
    "size": 158,
    "path": "../public/crm/pdf/cmaps/ETen-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/ETenms-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"ac-YxxYp/eoCU1EqFjSZIWrZbSZtZs\"",
    "mtime": "2026-09-22T11:29:46.793Z",
    "size": 172,
    "path": "../public/crm/pdf/cmaps/ETenms-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/ETenms-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"65-EgfJMSla1fV6QwMX1QFPtm0Oq30\"",
    "mtime": "2026-09-22T11:29:46.791Z",
    "size": 101,
    "path": "../public/crm/pdf/cmaps/ETenms-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/ETHK-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"114a-IlIFrTqtWJZ/ryOiUEcxq+vG3Mw\"",
    "mtime": "2026-09-22T11:29:46.795Z",
    "size": 4426,
    "path": "../public/crm/pdf/cmaps/ETHK-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/ETHK-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9e-A+Nef8G3VJXfVVmj9xxfDL0VF7o\"",
    "mtime": "2026-09-22T11:29:46.796Z",
    "size": 158,
    "path": "../public/crm/pdf/cmaps/ETHK-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"242-+IcptqQTrhNluvtdyAdrRlqh+4c\"",
    "mtime": "2026-09-22T11:29:46.799Z",
    "size": 578,
    "path": "../public/crm/pdf/cmaps/EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"aa-xHxC2QmcrxRHSY5X/ByPPH/0F7M\"",
    "mtime": "2026-09-22T11:29:46.800Z",
    "size": 170,
    "path": "../public/crm/pdf/cmaps/EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/Ext-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9e8-S2on4RJbsRv5/Y/pxTdfd4HJUgQ\"",
    "mtime": "2026-09-22T11:29:47.124Z",
    "size": 2536,
    "path": "../public/crm/pdf/cmaps/Ext-H.bcmap"
  },
  "/crm/pdf/cmaps/Ext-RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9ee-4cJWOm14WqXjDeQjkR0Xn+eeyVc\"",
    "mtime": "2026-09-22T11:29:47.129Z",
    "size": 2542,
    "path": "../public/crm/pdf/cmaps/Ext-RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/Ext-RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"da-VENZGCNze6mJk1N8TU6K9wo3yS4\"",
    "mtime": "2026-09-22T11:29:47.131Z",
    "size": 218,
    "path": "../public/crm/pdf/cmaps/Ext-RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/Ext-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"d7-DYinUXeD8lzh7uCCpe0SsPlgYcI\"",
    "mtime": "2026-09-22T11:29:47.133Z",
    "size": 215,
    "path": "../public/crm/pdf/cmaps/Ext-V.bcmap"
  },
  "/crm/pdf/cmaps/GB-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"225-QjHqsilouqKepOb9xCeLc3Bnp9o\"",
    "mtime": "2026-09-22T11:29:47.135Z",
    "size": 549,
    "path": "../public/crm/pdf/cmaps/GB-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/GB-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"210-PxwqaL3RNUHmos1qejk1gelETh4\"",
    "mtime": "2026-09-22T11:29:47.138Z",
    "size": 528,
    "path": "../public/crm/pdf/cmaps/GB-H.bcmap"
  },
  "/crm/pdf/cmaps/GB-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b3-fSaHMrMAQx/O0TUbS/0StRKZKD4\"",
    "mtime": "2026-09-22T11:29:47.137Z",
    "size": 179,
    "path": "../public/crm/pdf/cmaps/GB-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/GB-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"af-twR3qXOHCfY5rfa8IOgTY+/MntA\"",
    "mtime": "2026-09-22T11:29:47.140Z",
    "size": 175,
    "path": "../public/crm/pdf/cmaps/GB-V.bcmap"
  },
  "/crm/pdf/cmaps/GBK-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"3964-CJhrNwrCe2DPjNcCPJ5J9reEtSs\"",
    "mtime": "2026-09-22T11:29:47.282Z",
    "size": 14692,
    "path": "../public/crm/pdf/cmaps/GBK-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/GBK-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b4-Tw4M//r6IbMPeiXlFhc4+vLiZf4\"",
    "mtime": "2026-09-22T11:29:47.284Z",
    "size": 180,
    "path": "../public/crm/pdf/cmaps/GBK-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/GBK2K-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"4cce-o2BSuLXX3B3eK3IUN9aryQ7Hzv4\"",
    "mtime": "2026-09-22T11:29:47.524Z",
    "size": 19662,
    "path": "../public/crm/pdf/cmaps/GBK2K-H.bcmap"
  },
  "/crm/pdf/cmaps/GBK2K-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"db-0ntpFrfeGZNGTl8zgi8Xb9yOlJ8\"",
    "mtime": "2026-09-22T11:29:47.525Z",
    "size": 219,
    "path": "../public/crm/pdf/cmaps/GBK2K-V.bcmap"
  },
  "/crm/pdf/cmaps/GBKp-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"395e-qHhaREA/EwCX7pojw5I9WvJSrFE\"",
    "mtime": "2026-09-22T11:29:47.528Z",
    "size": 14686,
    "path": "../public/crm/pdf/cmaps/GBKp-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/GBKp-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b5-cX9tZYUYS/67iU5ZhoiGq488OPE\"",
    "mtime": "2026-09-22T11:29:47.531Z",
    "size": 181,
    "path": "../public/crm/pdf/cmaps/GBKp-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/GBpc-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b5-NgBKa+2uDt+upiCn2PYc+4dflkA\"",
    "mtime": "2026-09-22T11:29:47.535Z",
    "size": 181,
    "path": "../public/crm/pdf/cmaps/GBpc-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/GBT-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1c7a-4t2kSJakH0+oF8U5fxeJR2O3Yj4\"",
    "mtime": "2026-09-22T11:29:47.543Z",
    "size": 7290,
    "path": "../public/crm/pdf/cmaps/GBT-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/GBpc-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"22d-XDTvp8yk4vZS+B9EmP30HbG3seY\"",
    "mtime": "2026-09-22T11:29:47.533Z",
    "size": 557,
    "path": "../public/crm/pdf/cmaps/GBpc-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/GBT-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b4-nW71+ileMAXWIJBHVNfMFhBL6Qg\"",
    "mtime": "2026-09-22T11:29:47.544Z",
    "size": 180,
    "path": "../public/crm/pdf/cmaps/GBT-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/GBT-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1c65-YlCLvCK803leSvLH+jz93HE2eBM\"",
    "mtime": "2026-09-22T11:29:47.547Z",
    "size": 7269,
    "path": "../public/crm/pdf/cmaps/GBT-H.bcmap"
  },
  "/crm/pdf/cmaps/GBT-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b0-Lwk24L1DYvfG+MK1ZkLWSDNmzRE\"",
    "mtime": "2026-09-22T11:29:47.549Z",
    "size": 176,
    "path": "../public/crm/pdf/cmaps/GBT-V.bcmap"
  },
  "/crm/pdf/cmaps/GBTpc-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1c82-OI63a1OwCNkN/mjB4yiDFLIcPNw\"",
    "mtime": "2026-09-22T11:29:47.553Z",
    "size": 7298,
    "path": "../public/crm/pdf/cmaps/GBTpc-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/GBTpc-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b6-zhJfUgl8cfyDYxV3l3rCZ7iQHHg\"",
    "mtime": "2026-09-22T11:29:47.555Z",
    "size": 182,
    "path": "../public/crm/pdf/cmaps/GBTpc-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"229-FJwIwOrcQF9rpkrayTKf2zANEas\"",
    "mtime": "2026-09-22T11:29:47.556Z",
    "size": 553,
    "path": "../public/crm/pdf/cmaps/H.bcmap"
  },
  "/crm/pdf/cmaps/Hankaku.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"84-38L2Nd1mYC+ZeK4/5yaVoC5RKmo\"",
    "mtime": "2026-09-22T11:29:47.558Z",
    "size": 132,
    "path": "../public/crm/pdf/cmaps/Hankaku.bcmap"
  },
  "/crm/pdf/cmaps/Hiragana.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"7c-EOeg8gzeiGWh3TCGqJ8uluMw0aY\"",
    "mtime": "2026-09-22T11:29:47.560Z",
    "size": 124,
    "path": "../public/crm/pdf/cmaps/Hiragana.bcmap"
  },
  "/crm/pdf/cmaps/HKdla-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a5e-V7oCz0OOuojSBxvZnRvrgWtDi54\"",
    "mtime": "2026-09-22T11:29:47.562Z",
    "size": 2654,
    "path": "../public/crm/pdf/cmaps/HKdla-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/HKdla-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"94-A15AZFWd1WzrDwbDrBwudmrv/mI\"",
    "mtime": "2026-09-22T11:29:47.565Z",
    "size": 148,
    "path": "../public/crm/pdf/cmaps/HKdla-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/HKdlb-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"96e-K+d+pPTNijOP9wB9MUdzWC9WXvo\"",
    "mtime": "2026-09-22T11:29:47.569Z",
    "size": 2414,
    "path": "../public/crm/pdf/cmaps/HKdlb-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/HKdlb-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"94-PceRADBPguxVm3DRIBAPbr5qtcA\"",
    "mtime": "2026-09-22T11:29:47.571Z",
    "size": 148,
    "path": "../public/crm/pdf/cmaps/HKdlb-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/HKgccs-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"8f4-26oQJiIjcPpuMnXJjjvbXvPTdwk\"",
    "mtime": "2026-09-22T11:29:47.573Z",
    "size": 2292,
    "path": "../public/crm/pdf/cmaps/HKgccs-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/HKm314-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"95-PvX3416//mjeqOp1fNzqxbgVE3I\"",
    "mtime": "2026-09-22T11:29:47.579Z",
    "size": 149,
    "path": "../public/crm/pdf/cmaps/HKm314-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/HKgccs-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"95-byJ4SZDrFovPkZLn423hjgiSffs\"",
    "mtime": "2026-09-22T11:29:47.575Z",
    "size": 149,
    "path": "../public/crm/pdf/cmaps/HKgccs-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/HKm314-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"6ec-y/tlqwyuaQ52eaF2neUh6iD7ZgI\"",
    "mtime": "2026-09-22T11:29:47.577Z",
    "size": 1772,
    "path": "../public/crm/pdf/cmaps/HKm314-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/HKm471-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"87b-p18uMuVJXUbhSx0HrBJLP8Z17xo\"",
    "mtime": "2026-09-22T11:29:47.584Z",
    "size": 2171,
    "path": "../public/crm/pdf/cmaps/HKm471-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/HKm471-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"95-Km8sxNEF9GRDIYfa7/e4EEDAk+Q\"",
    "mtime": "2026-09-22T11:29:47.587Z",
    "size": 149,
    "path": "../public/crm/pdf/cmaps/HKm471-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/HKscs-B5-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"1155-RfF5Pncd4DCviZOO7SP/9Mfayjo\"",
    "mtime": "2026-09-22T11:29:47.590Z",
    "size": 4437,
    "path": "../public/crm/pdf/cmaps/HKscs-B5-H.bcmap"
  },
  "/crm/pdf/cmaps/HKscs-B5-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9f-+ls6Hws6tr1hT4o5yauAsgParfU\"",
    "mtime": "2026-09-22T11:29:47.593Z",
    "size": 159,
    "path": "../public/crm/pdf/cmaps/HKscs-B5-V.bcmap"
  },
  "/crm/pdf/cmaps/KSC-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"738-vDSTZ7tgsGr1/e7sBQR/WWrHGrM\"",
    "mtime": "2026-09-22T11:29:47.604Z",
    "size": 1848,
    "path": "../public/crm/pdf/cmaps/KSC-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/Katakana.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"64-2hAK0A8qm6GWiSv7TWZE7IKKT88\"",
    "mtime": "2026-09-22T11:29:47.596Z",
    "size": 100,
    "path": "../public/crm/pdf/cmaps/Katakana.bcmap"
  },
  "/crm/pdf/cmaps/KSC-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a4-RSndrHjJMdY0EbYGGwr3QLTETKU\"",
    "mtime": "2026-09-22T11:29:47.606Z",
    "size": 164,
    "path": "../public/crm/pdf/cmaps/KSC-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/KSC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"727-QuFfvOcL3sT3u1ssvQKw79i8Zfw\"",
    "mtime": "2026-09-22T11:29:47.609Z",
    "size": 1831,
    "path": "../public/crm/pdf/cmaps/KSC-H.bcmap"
  },
  "/crm/pdf/cmaps/KSC-Johab-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"4197-NYWszG5pV+2lUwI5P9nDpWPbbLs\"",
    "mtime": "2026-09-22T11:29:47.612Z",
    "size": 16791,
    "path": "../public/crm/pdf/cmaps/KSC-Johab-H.bcmap"
  },
  "/crm/pdf/cmaps/KSC-Johab-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a6-5ot3Cze1kYhMRZ1s47tDvEVWVHs\"",
    "mtime": "2026-09-22T11:29:47.614Z",
    "size": 166,
    "path": "../public/crm/pdf/cmaps/KSC-Johab-V.bcmap"
  },
  "/crm/pdf/cmaps/KSC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a0-IrCX/TdsIeQKD5OSlhvnSswxY0M\"",
    "mtime": "2026-09-22T11:29:47.617Z",
    "size": 160,
    "path": "../public/crm/pdf/cmaps/KSC-V.bcmap"
  },
  "/crm/pdf/cmaps/KSCms-UHC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"ae3-Tg7QF6KkHue/bqzw9+a0CuYNIj0\"",
    "mtime": "2026-09-22T11:29:47.619Z",
    "size": 2787,
    "path": "../public/crm/pdf/cmaps/KSCms-UHC-H.bcmap"
  },
  "/crm/pdf/cmaps/KSCms-UHC-HW-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"ae5-1BA0Gxmm8F4MIOpKGncHijCEBE4\"",
    "mtime": "2026-09-22T11:29:47.621Z",
    "size": 2789,
    "path": "../public/crm/pdf/cmaps/KSCms-UHC-HW-H.bcmap"
  },
  "/crm/pdf/cmaps/KSCms-UHC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a6-PefFxwzxcv9WCmLV3+hKkza09a0\"",
    "mtime": "2026-09-22T11:29:47.625Z",
    "size": 166,
    "path": "../public/crm/pdf/cmaps/KSCms-UHC-V.bcmap"
  },
  "/crm/pdf/cmaps/KSCms-UHC-HW-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a9-bP6zb0knAq71zlt2cTQikQELKeE\"",
    "mtime": "2026-09-22T11:29:47.623Z",
    "size": 169,
    "path": "../public/crm/pdf/cmaps/KSCms-UHC-HW-V.bcmap"
  },
  "/crm/pdf/cmaps/KSCpc-EUC-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"7e8-NwX9NiERen5aN3LDhJxdaWIO8I8\"",
    "mtime": "2026-09-22T11:29:47.627Z",
    "size": 2024,
    "path": "../public/crm/pdf/cmaps/KSCpc-EUC-H.bcmap"
  },
  "/crm/pdf/cmaps/KSCpc-EUC-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a6-HToRkyxEpfqPoi79K9Pbp9uaLI4\"",
    "mtime": "2026-09-22T11:29:47.629Z",
    "size": 166,
    "path": "../public/crm/pdf/cmaps/KSCpc-EUC-V.bcmap"
  },
  "/crm/pdf/cmaps/LICENSE": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"820-GvtZkfzg1gEQtQkraL+f92sMc/Y\"",
    "mtime": "2026-09-22T11:29:46.436Z",
    "size": 2080,
    "path": "../public/crm/pdf/cmaps/LICENSE"
  },
  "/crm/pdf/cmaps/NWP-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"acd-fQ9RxS16lr8onQxkVNfp3M8AnBU\"",
    "mtime": "2026-09-22T11:29:47.816Z",
    "size": 2765,
    "path": "../public/crm/pdf/cmaps/NWP-H.bcmap"
  },
  "/crm/pdf/cmaps/NWP-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"fc-iRqGbFK0bnUmEjeZqCnbJKxs2k8\"",
    "mtime": "2026-09-22T11:29:47.819Z",
    "size": 252,
    "path": "../public/crm/pdf/cmaps/NWP-V.bcmap"
  },
  "/crm/pdf/cmaps/RKSJ-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"216-pPfVzdE9MAjMQtgvaWctnlCp1bM\"",
    "mtime": "2026-09-22T11:29:47.822Z",
    "size": 534,
    "path": "../public/crm/pdf/cmaps/RKSJ-H.bcmap"
  },
  "/crm/pdf/cmaps/RKSJ-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"aa-Fq5CpG5+uSygSP4kZJtmjFEDtLI\"",
    "mtime": "2026-09-22T11:29:47.825Z",
    "size": 170,
    "path": "../public/crm/pdf/cmaps/RKSJ-V.bcmap"
  },
  "/crm/pdf/cmaps/Roman.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"60-V1V4HH6cUMyBkkJthzOlBjgrX90\"",
    "mtime": "2026-09-22T11:29:47.832Z",
    "size": 96,
    "path": "../public/crm/pdf/cmaps/Roman.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UCS2-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"bc98-fyiblMZDt8xD1JNgeBQ6I0fKD8E\"",
    "mtime": "2026-09-22T11:29:48.147Z",
    "size": 48280,
    "path": "../public/crm/pdf/cmaps/UniCNS-UCS2-H.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UCS2-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9c-axns5ckhUWQx65TSjXQID919Nbw\"",
    "mtime": "2026-09-22T11:29:48.150Z",
    "size": 156,
    "path": "../public/crm/pdf/cmaps/UniCNS-UCS2-V.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UTF16-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"c4f3-1z1VOIx2kyAzkVzqYnu2KO2tT2Y\"",
    "mtime": "2026-09-22T11:29:48.217Z",
    "size": 50419,
    "path": "../public/crm/pdf/cmaps/UniCNS-UTF16-H.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UTF16-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9c-D3FS8oRcwr5NPOfg4VMGOexBYuM\"",
    "mtime": "2026-09-22T11:29:48.220Z",
    "size": 156,
    "path": "../public/crm/pdf/cmaps/UniCNS-UTF16-V.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UTF32-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"cdc7-pYcoZOKxIcHfUGilQgHtFmxp1fE\"",
    "mtime": "2026-09-22T11:29:48.360Z",
    "size": 52679,
    "path": "../public/crm/pdf/cmaps/UniCNS-UTF32-H.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UTF32-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a0-3rqpisrxPzQaUAOFbvamp9+PbhQ\"",
    "mtime": "2026-09-22T11:29:48.362Z",
    "size": 160,
    "path": "../public/crm/pdf/cmaps/UniCNS-UTF32-V.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UTF8-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"d17d-c0rRoAAz1wwZXIE1i2Q8fLoTJ7I\"",
    "mtime": "2026-09-22T11:29:48.747Z",
    "size": 53629,
    "path": "../public/crm/pdf/cmaps/UniCNS-UTF8-H.bcmap"
  },
  "/crm/pdf/cmaps/UniCNS-UTF8-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9d-AZvQcWsqqAvBvKv9OJ09XhBluo4\"",
    "mtime": "2026-09-22T11:29:48.750Z",
    "size": 157,
    "path": "../public/crm/pdf/cmaps/UniCNS-UTF8-V.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UCS2-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a966-hoI440y5VIxNE4rxrcGkvqYt7Dc\"",
    "mtime": "2026-09-22T11:29:48.763Z",
    "size": 43366,
    "path": "../public/crm/pdf/cmaps/UniGB-UCS2-H.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UCS2-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"c1-9YU8qDwluIjB2SXiog70TgZNBk4\"",
    "mtime": "2026-09-22T11:29:48.766Z",
    "size": 193,
    "path": "../public/crm/pdf/cmaps/UniGB-UCS2-V.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UTF16-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"ac36-KJY4Zt+1dbWLQ3DmDr2b+25WrAk\"",
    "mtime": "2026-09-22T11:29:48.904Z",
    "size": 44086,
    "path": "../public/crm/pdf/cmaps/UniGB-UTF16-H.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UTF16-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b2-F3E3bu+XmtQsK1wBoa8dNPVFgLc\"",
    "mtime": "2026-09-22T11:29:48.906Z",
    "size": 178,
    "path": "../public/crm/pdf/cmaps/UniGB-UTF16-V.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UTF32-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b2aa-ueonjrTDJNEqgeLWJHlUjR5xJss\"",
    "mtime": "2026-09-22T11:29:49.018Z",
    "size": 45738,
    "path": "../public/crm/pdf/cmaps/UniGB-UTF32-H.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UTF32-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b6-gWe6UDqopsgF85vgylOLmYmKln0\"",
    "mtime": "2026-09-22T11:29:49.020Z",
    "size": 182,
    "path": "../public/crm/pdf/cmaps/UniGB-UTF32-V.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UTF8-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b6f5-Ccx3UPadp3Q0CT5MlCETlPVmXto\"",
    "mtime": "2026-09-22T11:29:49.039Z",
    "size": 46837,
    "path": "../public/crm/pdf/cmaps/UniGB-UTF8-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UCS2-HW-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"77-l8u4WZz2KRSIWosrR1lIZf/1IJk\"",
    "mtime": "2026-09-22T11:29:49.101Z",
    "size": 119,
    "path": "../public/crm/pdf/cmaps/UniJIS-UCS2-HW-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UCS2-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"635f-yvUlEl4p+k3ngIjl6xeFwa8fmVA\"",
    "mtime": "2026-09-22T11:29:49.100Z",
    "size": 25439,
    "path": "../public/crm/pdf/cmaps/UniJIS-UCS2-H.bcmap"
  },
  "/crm/pdf/cmaps/UniGB-UTF8-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b5-4jYW+hITLHP1IHG5bnbYdkMOzs8\"",
    "mtime": "2026-09-22T11:29:49.041Z",
    "size": 181,
    "path": "../public/crm/pdf/cmaps/UniGB-UTF8-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UCS2-HW-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2a8-82utnGgPS7psvPisV/U+fOIcgGs\"",
    "mtime": "2026-09-22T11:29:49.103Z",
    "size": 680,
    "path": "../public/crm/pdf/cmaps/UniJIS-UCS2-HW-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UCS2-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"298-RTlldqa9VGioTiwuSuZMI/5/LoU\"",
    "mtime": "2026-09-22T11:29:49.105Z",
    "size": 664,
    "path": "../public/crm/pdf/cmaps/UniJIS-UCS2-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UTF16-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9a13-Fkmek/CkR6lOHkS/qZUUAdKQ2J0\"",
    "mtime": "2026-09-22T11:29:49.182Z",
    "size": 39443,
    "path": "../public/crm/pdf/cmaps/UniJIS-UTF16-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UTF16-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"283-REArj3PgsBYIRrZB58sudauMgb0\"",
    "mtime": "2026-09-22T11:29:49.185Z",
    "size": 643,
    "path": "../public/crm/pdf/cmaps/UniJIS-UTF16-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UTF32-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9e5b-vEghFNIU4v/+hd0LdCL0jD4oLBc\"",
    "mtime": "2026-09-22T11:29:49.238Z",
    "size": 40539,
    "path": "../public/crm/pdf/cmaps/UniJIS-UTF32-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UTF32-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2a5-L17CWE/Xw59FUWGoV1UPp/6l9To\"",
    "mtime": "2026-09-22T11:29:49.241Z",
    "size": 677,
    "path": "../public/crm/pdf/cmaps/UniJIS-UTF32-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UTF8-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a2df-9HlWwcey6tvak6rCX+RUa0E+wKU\"",
    "mtime": "2026-09-22T11:29:49.322Z",
    "size": 41695,
    "path": "../public/crm/pdf/cmaps/UniJIS-UTF8-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS-UTF8-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2a6-s+qNIXKi9vnnPPYq5GeqhISN9tc\"",
    "mtime": "2026-09-22T11:29:49.323Z",
    "size": 678,
    "path": "../public/crm/pdf/cmaps/UniJIS-UTF8-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS2004-UTF16-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9a6e-uLDMZ3nTlgQmiZ/C588oZv/IAWc\"",
    "mtime": "2026-09-22T11:29:49.383Z",
    "size": 39534,
    "path": "../public/crm/pdf/cmaps/UniJIS2004-UTF16-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS2004-UTF16-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"287-KHLLJz2rnQ27fzMYJgRd8Ydkp7A\"",
    "mtime": "2026-09-22T11:29:49.384Z",
    "size": 647,
    "path": "../public/crm/pdf/cmaps/UniJIS2004-UTF16-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS2004-UTF32-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9eb6-9IcjIS0a0YwLPEEWjW9jB5jgQWA\"",
    "mtime": "2026-09-22T11:29:49.555Z",
    "size": 40630,
    "path": "../public/crm/pdf/cmaps/UniJIS2004-UTF32-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS2004-UTF8-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a333-OFq3YtA0mdNVOQSBdpKOAx5TQNE\"",
    "mtime": "2026-09-22T11:29:50.181Z",
    "size": 41779,
    "path": "../public/crm/pdf/cmaps/UniJIS2004-UTF8-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS2004-UTF32-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2a9-7xbMsxAvxEwdRvTK1Az72wIO4nc\"",
    "mtime": "2026-09-22T11:29:49.557Z",
    "size": 681,
    "path": "../public/crm/pdf/cmaps/UniJIS2004-UTF32-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJIS2004-UTF8-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2aa-VlVgpZ1RdKw3mo2R8WXI7N71TgY\"",
    "mtime": "2026-09-22T11:29:50.184Z",
    "size": 682,
    "path": "../public/crm/pdf/cmaps/UniJIS2004-UTF8-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJISPro-UCS2-HW-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2c1-Pwo2QkZxdwfbgpE1kzBMt703w3g\"",
    "mtime": "2026-09-22T11:29:50.188Z",
    "size": 705,
    "path": "../public/crm/pdf/cmaps/UniJISPro-UCS2-HW-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJISPro-UCS2-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2b1-saRzBfp5r6GatpbTOvUJnTVXDFY\"",
    "mtime": "2026-09-22T11:29:50.189Z",
    "size": 689,
    "path": "../public/crm/pdf/cmaps/UniJISPro-UCS2-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJISPro-UTF8-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2d6-7WtXGu7TiNO1O55lgkrz8BRqWFc\"",
    "mtime": "2026-09-22T11:29:50.191Z",
    "size": 726,
    "path": "../public/crm/pdf/cmaps/UniJISPro-UTF8-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJISX0213-UTF32-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2ac-374+KVUFl3tOGIHvMLgDYtdAa7w\"",
    "mtime": "2026-09-22T11:29:50.199Z",
    "size": 684,
    "path": "../public/crm/pdf/cmaps/UniJISX0213-UTF32-V.bcmap"
  },
  "/crm/pdf/cmaps/UniJISX0213-UTF32-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9e45-FclTw2Q20y90jsdGipXD5YQ9cLs\"",
    "mtime": "2026-09-22T11:29:50.197Z",
    "size": 40517,
    "path": "../public/crm/pdf/cmaps/UniJISX0213-UTF32-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJISX02132004-UTF32-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"9ea0-xB3VDfAePTMx8KzbbabBuFemfPc\"",
    "mtime": "2026-09-22T11:29:50.204Z",
    "size": 40608,
    "path": "../public/crm/pdf/cmaps/UniJISX02132004-UTF32-H.bcmap"
  },
  "/crm/pdf/cmaps/UniJISX02132004-UTF32-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"2b0-nEigxlSs9Lz1He/eL32LPOUqBj0\"",
    "mtime": "2026-09-22T11:29:50.206Z",
    "size": 688,
    "path": "../public/crm/pdf/cmaps/UniJISX02132004-UTF32-V.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UCS2-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"64b7-UPzOGy4yJHkbSAKJ58TEKTi+uFQ\"",
    "mtime": "2026-09-22T11:29:50.210Z",
    "size": 25783,
    "path": "../public/crm/pdf/cmaps/UniKS-UCS2-H.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UTF16-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"66d7-T0YDQIlm2awpqWw6Z1W58j56qVM\"",
    "mtime": "2026-09-22T11:29:50.218Z",
    "size": 26327,
    "path": "../public/crm/pdf/cmaps/UniKS-UTF16-H.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UCS2-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b2-Z0Oz4HNw/UmWK5fZe+d9ro0Yqrs\"",
    "mtime": "2026-09-22T11:29:50.213Z",
    "size": 178,
    "path": "../public/crm/pdf/cmaps/UniKS-UCS2-V.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UTF16-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a4-z9v78LDo75j+9iNupXDHNGXaFYE\"",
    "mtime": "2026-09-22T11:29:50.220Z",
    "size": 164,
    "path": "../public/crm/pdf/cmaps/UniKS-UTF16-V.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UTF32-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"6753-aw6Y4WQY+lqGM4s/s2HxcAlx9kk\"",
    "mtime": "2026-09-22T11:29:50.223Z",
    "size": 26451,
    "path": "../public/crm/pdf/cmaps/UniKS-UTF32-H.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UTF8-H.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"6c8e-gRfTHkmKjw+3wiPEFyuogcBJbG8\"",
    "mtime": "2026-09-22T11:29:50.227Z",
    "size": 27790,
    "path": "../public/crm/pdf/cmaps/UniKS-UTF8-H.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UTF32-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a8-c700OxiKgEcesVZlX1sZKQP4bL8\"",
    "mtime": "2026-09-22T11:29:50.224Z",
    "size": 168,
    "path": "../public/crm/pdf/cmaps/UniKS-UTF32-V.bcmap"
  },
  "/crm/pdf/cmaps/UniKS-UTF8-V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a9-WGxklIpn5MsS3mTiIbDcPZ5H3t8\"",
    "mtime": "2026-09-22T11:29:50.230Z",
    "size": 169,
    "path": "../public/crm/pdf/cmaps/UniKS-UTF8-V.bcmap"
  },
  "/crm/pdf/cmaps/V.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"a6-mXkPEsohoZa8HYNq5b8K16+V4Hk\"",
    "mtime": "2026-09-22T11:29:50.232Z",
    "size": 166,
    "path": "../public/crm/pdf/cmaps/V.bcmap"
  },
  "/crm/pdf/cmaps/WP-Symbol.bcmap": {
    "type": "text/plain; charset=utf-8",
    "etag": "\"b3-OmQXq61GChoIO+dWNsAU86c5N7U\"",
    "mtime": "2026-09-22T11:29:50.234Z",
    "size": 179,
    "path": "../public/crm/pdf/cmaps/WP-Symbol.bcmap"
  }
};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {"/crm/pdf/cmaps/":{"maxAge":0},"/crm/pdf/fonts/":{"maxAge":0},"/_nuxt/":{"maxAge":31536000}};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _8vKH0E = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError$1({ statusCode: 404 });
    }
    return;
  }
  if (asset.encoding !== void 0) {
    appendResponseHeader(event, "Vary", "Accept-Encoding");
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

const _SxA8c9 = defineEventHandler(() => {});

const _lazy_REU8AD = () => import('../routes/robots.txt.mjs');
const _lazy_fzv4V0 = () => import('../routes/sitemap.xml.mjs');
const _lazy_sFKfZ_ = () => import('../routes/renderer.mjs').then(function (n) { return n.r; });

const handlers = [
  { route: '', handler: _8vKH0E, lazy: false, middleware: true, method: undefined },
  { route: '/robots.txt', handler: _lazy_REU8AD, lazy: true, middleware: false, method: undefined },
  { route: '/sitemap.xml', handler: _lazy_fzv4V0, lazy: true, middleware: false, method: undefined },
  { route: '/__nuxt_error', handler: _lazy_sFKfZ_, lazy: true, middleware: false, method: undefined },
  { route: '/__nuxt_island/**', handler: _SxA8c9, lazy: false, middleware: false, method: undefined },
  { route: '/**', handler: _lazy_sFKfZ_, lazy: true, middleware: false, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((error_) => {
      console.error("Error while capturing another error", error_);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const fetchContext = event.node.req?.__unenv__;
      if (fetchContext?._platform) {
        event.context = {
          _platform: fetchContext?._platform,
          // #3335
          ...fetchContext._platform,
          ...event.context
        };
      }
      if (!event.context.waitUntil && fetchContext?.waitUntil) {
        event.context.waitUntil = fetchContext.waitUntil;
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (event.context.waitUntil) {
          event.context.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
      await nitroApp.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter({
    preemptive: true
  });
  const nodeHandler = toNodeListener(h3App);
  const localCall = (aRequest) => b(
    nodeHandler,
    aRequest
  );
  const localFetch = (input, init) => {
    if (!input.toString().startsWith("/")) {
      return globalThis.fetch(input, init);
    }
    return C(
      nodeHandler,
      input,
      init
    ).then((response) => normalizeFetchResponse(response));
  };
  const $fetch = createFetch({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  return app;
}
function runNitroPlugins(nitroApp2) {
  for (const plugin of plugins) {
    try {
      plugin(nitroApp2);
    } catch (error) {
      nitroApp2.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
}
const nitroApp = createNitroApp();
function useNitroApp() {
  return nitroApp;
}
runNitroPlugins(nitroApp);

function defineRenderHandler(render) {
  const runtimeConfig = useRuntimeConfig();
  return eventHandler(async (event) => {
    const nitroApp = useNitroApp();
    const ctx = { event, render, response: void 0 };
    await nitroApp.hooks.callHook("render:before", ctx);
    if (!ctx.response) {
      if (event.path === `${runtimeConfig.app.baseURL}favicon.ico`) {
        setResponseHeader(event, "Content-Type", "image/x-icon");
        return send(
          event,
          "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
        );
      }
      ctx.response = await ctx.render(event);
      if (!ctx.response) {
        const _currentStatus = getResponseStatus(event);
        setResponseStatus(event, _currentStatus === 200 ? 500 : _currentStatus);
        return send(
          event,
          "No response returned from render handler: " + event.path
        );
      }
    }
    await nitroApp.hooks.callHook("render:response", ctx.response, ctx);
    if (ctx.response.headers) {
      setResponseHeaders(event, ctx.response.headers);
    }
    if (ctx.response.statusCode || ctx.response.statusMessage) {
      setResponseStatus(
        event,
        ctx.response.statusCode,
        ctx.response.statusMessage
      );
    }
    return ctx.response.body;
  });
}

const NullObject = /* @__PURE__ */ (() => {
  const C = function() {
  };
  C.prototype = /* @__PURE__ */ Object.create(null);
  return C;
})();
function parse(str, options) {
  if (typeof str !== "string") {
    throw new TypeError("argument str must be a string");
  }
  const obj = new NullObject();
  const opt = options || {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) {
        val = val.slice(1, -1);
      }
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

export { $fetch as $, parseURL as A, decodePath as B, getContext as C, setCookie as D, getCookie as E, deleteCookie as F, withTrailingSlash as G, withoutTrailingSlash as H, createHooks as I, executeAsync as J, createDebugger as K, defu as L, hash$1 as M, trapUnhandledNodeErrors as a, useNitroApp as b, defineEventHandler as c, destr as d, setHeader as e, createError$1 as f, encodePath as g, defineRenderHandler as h, getQuery as i, joinRelativeURL as j, getRouteRules as k, getResponseStatusText as l, getResponseStatus as m, klona as n, hasProtocol as o, isScriptProtocol as p, joinURL as q, parseQuery as r, setupGracefulShutdown as s, toNodeListener as t, useRuntimeConfig as u, parse as v, getRequestHeader as w, isEqual as x, withQuery as y, sanitizeStatusCode as z };;globalThis.__timing__.logEnd('Load chunks/_/nitro');
//# sourceMappingURL=nitro.mjs.map
