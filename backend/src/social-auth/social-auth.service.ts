import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntegrationSecretsService } from '../system-settings/integration-secrets.service';

type Provider = 'yandex' | 'vk';
type RequestContext = { userAgent?: string; ipAddress?: string };

@Injectable()
export class SocialAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly secrets: IntegrationSecretsService,
    private readonly config: ConfigService,
  ) {}

  async start(providerValue: string, returnUrl?: string) {
    const provider = this.provider(providerValue);
    const settings = await this.settings(provider);
    const state = randomBytes(32).toString('base64url');
    const codeVerifier = provider === 'vk' ? randomBytes(48).toString('base64url') : null;
    await this.prisma.oAuthLoginState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await this.prisma.oAuthLoginState.create({
      data: { stateHash: this.hash(state), provider, codeVerifier, returnUrl: this.safeReturnUrl(returnUrl), expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
    const params = new URLSearchParams({ response_type: 'code', client_id: settings.clientId, redirect_uri: settings.redirectUri, state });
    if (provider === 'yandex') {
      params.set('scope', 'login:email login:info');
      return { authorizationUrl: `https://oauth.yandex.ru/authorize?${params}` };
    }
    params.set('scope', 'email');
    params.set('code_challenge_method', 'S256');
    params.set('code_challenge', createHash('sha256').update(codeVerifier!).digest('base64url'));
    return { authorizationUrl: `https://id.vk.com/authorize?${params}` };
  }

  async callback(providerValue: string, query: Record<string, string | undefined>) {
    const provider = this.provider(providerValue);
    if (query.error) throw new UnauthorizedException('Вход отменён пользователем или провайдером');
    if (!query.state || !query.code) throw new BadRequestException('Провайдер не вернул код авторизации');
    const state = await this.prisma.oAuthLoginState.findUnique({ where: { stateHash: this.hash(query.state) } });
    if (!state || state.provider !== provider || state.usedAt || state.expiresAt <= new Date()) throw new UnauthorizedException('Сессия социального входа недействительна или истекла');
    await this.prisma.oAuthLoginState.update({ where: { id: state.id }, data: { usedAt: new Date() } });
    const settings = await this.settings(provider);
    const profile = provider === 'yandex'
      ? await this.yandexProfile(query.code, settings)
      : await this.vkProfile(query.code, query.device_id, state.codeVerifier, settings);
    const user = await this.auth.resolveSocialUser(profile);
    const rawTicket = randomBytes(32).toString('base64url');
    await this.prisma.socialLoginTicket.create({ data: { tokenHash: this.hash(rawTicket), userId: user.id, expiresAt: new Date(Date.now() + 2 * 60 * 1000) } });
    return { ticket: rawTicket, returnUrl: state.returnUrl };
  }

  async exchange(ticket: string, context: RequestContext) {
    if (!ticket) throw new BadRequestException('Не передан одноразовый билет входа');
    const row = await this.prisma.socialLoginTicket.findUnique({ where: { tokenHash: this.hash(ticket) } });
    if (!row || row.usedAt || row.expiresAt <= new Date()) throw new UnauthorizedException('Билет входа недействителен или истёк');
    const claimed = await this.prisma.socialLoginTicket.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw new UnauthorizedException('Билет входа уже использован');
    return this.auth.issueSocialSession(row.userId, context);
  }

  private async yandexProfile(code: string, settings: Record<string, string>) {
    const token = await this.postForm('https://oauth.yandex.ru/token', { grant_type: 'authorization_code', code, client_id: settings.clientId, client_secret: settings.clientSecret, redirect_uri: settings.redirectUri });
    const response = await fetch('https://login.yandex.ru/info?format=json', { headers: { Authorization: `OAuth ${token.access_token}` } });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data.id) throw new UnauthorizedException('Яндекс ID не передал данные пользователя');
    return { provider: 'YANDEX_ID', externalId: String(data.id), email: data.default_email, firstName: data.first_name, lastName: data.last_name, phone: data.default_phone?.number, avatarUrl: data.default_avatar_id ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200` : null, metadata: { login: data.login, avatarId: data.default_avatar_id } };
  }

  private async vkProfile(code: string, deviceId: string | undefined, codeVerifier: string | null, settings: Record<string, string>) {
    if (!deviceId || !codeVerifier) throw new BadRequestException('VK ID не передал обязательные параметры защищённого входа');
    const token = await this.postForm('https://id.vk.com/oauth2/auth', { grant_type: 'authorization_code', code, code_verifier: codeVerifier, client_id: settings.clientId, client_secret: settings.clientSecret, redirect_uri: settings.redirectUri, device_id: deviceId });
    const info = await this.postForm('https://id.vk.com/oauth2/user_info', { access_token: token.access_token, client_id: settings.clientId });
    const data = info.user || info;
    if (!data.user_id && !data.id) throw new UnauthorizedException('VK ID не передал данные пользователя');
    return { provider: 'VK_ID', externalId: String(data.user_id || data.id), email: data.email || token.email, firstName: data.first_name, lastName: data.last_name, phone: data.phone, avatarUrl: data.avatar, metadata: { avatar: data.avatar } };
  }

  private async postForm(url: string, values: Record<string, string | undefined>) {
    const body = new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])));
    const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new UnauthorizedException(data.error_description || data.error?.message || 'Провайдер отклонил авторизацию');
    return data;
  }

  private async settings(provider: Provider) {
    const key = provider === 'yandex' ? 'YANDEX_ID' : 'VK_ID';
    const integration = await this.prisma.ecosystemIntegration.findUnique({ where: { key } });
    if (!integration?.isEnabled) throw new ServiceUnavailableException(`${provider === 'yandex' ? 'Яндекс ID' : 'VK ID'} ещё не подключён в настройках экосистемы`);
    const config = (integration.config || {}) as Record<string, string>;
    const secret = this.secrets.decrypt(integration.encryptedSecrets);
    const values = { ...config, ...secret };
    if (!values.clientId || !values.clientSecret || !values.redirectUri) throw new ServiceUnavailableException('Не заполнены параметры OAuth-интеграции');
    return values;
  }

  private provider(value: string): Provider {
    if (value !== 'yandex' && value !== 'vk') throw new BadRequestException('Поддерживаются только Яндекс ID и VK ID');
    return value;
  }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private safeReturnUrl(value?: string) { return value && value.startsWith('/') && !value.startsWith('//') ? value.slice(0, 300) : '/account'; }
  public appUrl() { return this.config.get('PUBLIC_APP_URL', 'http://localhost:3001').replace(/\/$/, ''); }
}
