import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken, RoomServiceClient, TokenVerifier, TrackSource } from 'livekit-server-sdk';
import { timingSafeEqual } from 'crypto';

// Until the media deployment has a tested watchdog that closes active WebRTC
// connections on loss of backend control, no configuration can bypass this.
export const LMS_LIVE_ACCESS_ENFORCEMENT_READY: boolean = false;
const opaqueId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type LmsMediaSettings = { url:string; apiUrl:string; key:string; secret:string; gatewayKey:string };

@Injectable()
export class LmsLiveMediaAdapter {
  constructor(private readonly config: ConfigService) {}

  settings(): LmsMediaSettings {
    if (!LMS_LIVE_ACCESS_ENFORCEMENT_READY) throw new ServiceUnavailableException('Прямые эфиры готовятся: защита доступа подключённых участников ещё не завершена.');
    if (String(this.config.get('LMS_LIVE_ENABLED', 'false')) !== 'true') throw new ServiceUnavailableException('Прямые эфиры пока не подключены.');
    const url = String(this.config.get('LMS_LIVEKIT_URL') || ''), apiUrl = String(this.config.get('LMS_LIVEKIT_API_URL') || '');
    const key = String(this.config.get('LMS_LIVEKIT_API_KEY') || ''), secret = String(this.config.get('LMS_LIVEKIT_API_SECRET') || ''), gatewayKey = String(this.config.get('LMS_LIVEKIT_GATEWAY_KEY') || '');
    try {
      const publicUrl = new URL(url), api = new URL(apiUrl);
      if (publicUrl.protocol !== 'wss:' || publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) throw new Error();
      if (api.protocol !== 'http:' || !['livekit-lms','127.0.0.1','[::1]'].includes(api.hostname) || api.username || api.password || api.pathname !== '/' || api.search || api.hash) throw new Error();
    } catch { throw new ServiceUnavailableException('Видеосервер эфиров не настроен.'); }
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(key) || secret.length < 32 || !/^[a-f0-9]{64}$/i.test(gatewayKey) || secret === gatewayKey) throw new ServiceUnavailableException('Видеосервер эфиров не настроен.');
    return { url, apiUrl, key, secret, gatewayKey };
  }
  room(sessionId:string) { if (!opaqueId.test(sessionId)) throw new Error('Invalid media room'); return `lms-${sessionId}`; }
  private client() { const s = this.settings(); return new RoomServiceClient(s.apiUrl, s.key, s.secret, { requestTimeout:5, failover:false }); }
  async probe() { await this.client().listRooms(); }
  async ensure(sessionId:string) { await this.client().createRoom({ name:this.room(sessionId), emptyTimeout:300, departureTimeout:60, maxParticipants:200 }); }
  async participants(sessionId:string) { try { return await this.client().listParticipants(this.room(sessionId)); } catch (e:any) { if (e?.code === 'not_found') return []; throw e; } }
  async remove(sessionId:string, identity:string) { try { await this.client().removeParticipant(this.room(sessionId), identity); } catch (e:any) { if (e?.code !== 'not_found') throw e; } }
  async close(sessionId:string) { try { await this.client().deleteRoom(this.room(sessionId)); } catch (e:any) { if (e?.code !== 'not_found') throw e; } }
  async issue(sessionId:string, identity:string, role:'host'|'viewer', expiresAt:Date) {
    const s = this.settings(), expiresIn = Math.min(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    if (!opaqueId.test(identity) || expiresIn < 1) throw new UnauthorizedException('Срок доступа к эфиру истёк.');
    const token = new AccessToken(s.key, s.secret, { identity, ttl:expiresIn });
    token.addGrant({ room:this.room(sessionId), roomJoin:true, canPublish:role === 'host', canSubscribe:true, canPublishData:false, canUpdateOwnMetadata:false, ...(role === 'host' ? { canPublishSources:[TrackSource.CAMERA,TrackSource.MICROPHONE,TrackSource.SCREEN_SHARE,TrackSource.SCREEN_SHARE_AUDIO] } : {}) });
    return { url:s.url, token:await token.toJwt(), room:this.room(sessionId), role, expiresIn };
  }
  verifyGatewayKey(gatewayKey:string) {
    const s=this.settings();
    if (typeof gatewayKey !== 'string' || gatewayKey.length > 512) throw new UnauthorizedException();
    const a=Buffer.from(gatewayKey),b=Buffer.from(s.gatewayKey);
    if (a.length !== b.length || !timingSafeEqual(a,b)) throw new UnauthorizedException();
    return s;
  }
  async verify(token:string, gatewayKey:string) {
    const s = this.verifyGatewayKey(gatewayKey);
    if (typeof token !== 'string' || !token || token.length > 8192) throw new UnauthorizedException();
    try {
      const claims = await new TokenVerifier(s.key,s.secret).verify(token,0), v = claims.video;
      if (!claims.sub || !opaqueId.test(claims.sub) || !v?.roomJoin || !v.room || !/^lms-[0-9a-f-]{36}$/i.test(v.room) || v.roomAdmin || v.roomCreate || v.roomList || v.roomRecord || v.ingressAdmin || v.hidden || v.destinationRoom || typeof v.canPublish !== 'boolean' || v.canPublishData !== false || v.canSubscribe !== true || v.canUpdateOwnMetadata !== false || claims.sip) throw new Error();
      // Missing sources can mean unrestricted publication. Require the
      // explicit safe subset on a host token and reject any escalation.
      if (v.canPublish && (!Array.isArray(v.canPublishSources) || !v.canPublishSources.length || v.canPublishSources.some(source => !['camera','microphone','screen_share','screen_share_audio'].includes(String(source))))) throw new Error();
      return { identity:claims.sub, room:v.room, canPublish:v.canPublish === true };
    } catch { throw new UnauthorizedException('Медиадоступ недействителен'); }
  }
}
