import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AccessToken, RoomServiceClient, TokenVerifier, TrackSource } from 'livekit-server-sdk';
import { timingSafeEqual } from 'crypto';
import { meetingMediaConfig } from './meeting-media.config';

@Injectable()
export class MeetingMediaAdapter {
  readonly config=meetingMediaConfig();
  private client?:RoomServiceClient;
  constructor(){if(this.config.enabled)this.client=new RoomServiceClient(this.config.apiUrl,this.config.apiKey,this.config.apiSecret,{requestTimeout:5,failover:false});}
  requireEnabled(){if(!this.client)throw new ServiceUnavailableException('Видеосервер ещё не подключён');return this.client;}
  roomName(id:string){return 'crm-'+id;}
  async probe(){await this.requireEnabled().listRooms();}
  async ensureRoom(id:string){return this.requireEnabled().createRoom({name:this.roomName(id),maxParticipants:10,emptyTimeout:300,departureTimeout:60});}
  async remove(id:string,identity:string){try{await this.requireEnabled().removeParticipant(this.roomName(id),identity);}catch(e:any){if(e?.code!=='not_found')throw e;}}
  async close(id:string){try{await this.requireEnabled().deleteRoom(this.roomName(id));}catch(e:any){if(e?.code!=='not_found')throw e;}}
  async participants(id:string){try{return await this.requireEnabled().listParticipants(this.roomName(id));}catch(e:any){if(e?.code==='not_found')return [];throw e;}}
  async token(roomId:string,sessionId:string,name:string){
    this.requireEnabled();
    const at=new AccessToken(this.config.apiKey,this.config.apiSecret,{identity:sessionId,name,ttl:60});
    at.addGrant({room:this.roomName(roomId),roomJoin:true,canPublish:true,canSubscribe:true,canPublishData:false,canUpdateOwnMetadata:false,canPublishSources:[TrackSource.CAMERA,TrackSource.MICROPHONE,TrackSource.SCREEN_SHARE,TrackSource.SCREEN_SHARE_AUDIO]});
    return {url:this.config.publicUrl,token:await at.toJwt(),identity:sessionId,tokenTtlSeconds:60};
  }
  async verify(token:string,gatewayKey:string){
    this.requireEnabled();
    const a=Buffer.from(gatewayKey||''),b=Buffer.from(this.config.gatewayKey);
    if(a.length!==b.length||!timingSafeEqual(a,b))throw new UnauthorizedException();
    if(!token||token.length>8192)throw new UnauthorizedException();
    try{
      const claims=await new TokenVerifier(this.config.apiKey,this.config.apiSecret).verify(token,0);
      const v=claims.video;
      if(!claims.sub||!v?.roomJoin||!v.room||v.roomAdmin||v.roomCreate||v.roomList||v.roomRecord||v.ingressAdmin||v.hidden||v.destinationRoom||claims.sip)throw new Error('Unsupported media grant');
      return {identity:claims.sub,roomName:v.room};
    }catch{throw new UnauthorizedException('Медиадоступ недействителен');}
  }
}
