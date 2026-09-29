import { cardId, chatFixture } from './chat-records.fixture';

describe('Chat record references: per-recipient scopes (no DB/network)', () => {
  it.each([['OWN', 1], ['PARTICIPATING', 1], ['DEPARTMENT', 2], ['DEPARTMENT_TREE', 3], ['SELECTED_DEPARTMENTS', 1], ['COMPANY', 4]])('search respects %s before limit and projection', async (scope: string, count: number) => {
    const f = chatFixture(scope);
    for (const type of ['TASK', 'CUSTOMER']) {
      const rows = await f.service.search(type, '', 'actor'); expect(rows).toHaveLength(count);
      expect(JSON.stringify(rows)).not.toMatch(/private-|do-not-project/);
    }
  });
  it.each(['TASK', 'CUSTOMER', 'STAGE', 'PRODUCT'])('%s does not borrow another domain permission', async type => {
    const f = chatFixture('COMPANY', [type === 'CUSTOMER' ? 'customers.read' : type === 'PRODUCT' ? 'catalog.read' : 'crm.read']);
    await expect(f.service.search(type, '', 'actor')).rejects.toMatchObject({ status: 403 });
    for (const name of Object.keys(f.entities)) expect(f.db[name].findMany).not.toHaveBeenCalled();
  });
  it('filters search and direct IDs through the same scope; old records outside the first 20 remain addressable', async () => {
    const f = chatFixture('OWN');
    const other = f.entities.task[3];
    for (let i = 10; i < 40; i++) f.entities.task.unshift({ ...other, id: cardId(i) });
    expect((await f.service.search('TASK', 'Задача', 'actor')).map(row => row.id)).toEqual([cardId(0)]);
    expect((await f.service.resolve([{ type: 'TASK', id: cardId(0) }], 'actor'))[0].entityId).toBe(cardId(0));
    await expect(f.service.resolve([{ type: 'TASK', id: cardId(3) }], 'actor')).rejects.toMatchObject({ status: 404 });
  });
  it('stage count includes only visible deals; unrelated stages and inactive pipelines are hidden', async () => {
    const f = chatFixture('OWN'); const rows = await f.service.search('STAGE', '', 'actor');
    expect(rows[0].subtitle).toContain('Сделок в доступной области: 1');
    f.trash.push({ entityType: 'LEAD', entityId: cardId(0), status: 'TRASHED' });
    expect(await f.service.search('STAGE', '', 'actor')).toEqual([]);
    f.scopes['crm.read'] = 'COMPANY'; f.entities.crmPipelineStage[0].pipeline.isActive = false;
    expect(await f.service.search('STAGE', '', 'actor')).toEqual([]);
  });
  it('catalog without an ownership model fails closed for a narrow grant', async () => {
    const f = chatFixture('OWN'); expect(await f.service.search('PRODUCT', '', 'actor')).toEqual([]);
    expect(f.db.product.findMany).not.toHaveBeenCalled();
  });
  it('archived/cancelled/trashed cards cannot be searched or attached', async () => {
    const f = chatFixture(); f.entities.task[0].status = 'CANCELLED'; f.entities.customer[0].status = 'ARCHIVED';
    f.trash.push({ entityType: 'TASK', entityId: cardId(1), status: 'TRASHED' }, { entityType: 'PRODUCT', entityId: cardId(7), status: 'TRASHED' });
    expect((await f.service.search('TASK', '', 'actor')).map(row => row.id)).toEqual([cardId(2), cardId(3)]);
    expect(await f.service.search('CUSTOMER', '', 'actor', cardId(0))).toEqual([]);
    expect(await f.service.search('PRODUCT', '', 'actor')).toEqual([]);
    await expect(f.service.resolve([{ type: 'TASK', id: cardId(1) }], 'actor')).rejects.toMatchObject({ status: 404 });
  });
  it('new entity attachments persist IDs only, with duplicate references collapsed', async () => {
    const f = chatFixture(); const input = { type: 'TASK', id: cardId(0) };
    expect(await f.service.resolve([input, input], 'actor')).toEqual([{ kind: 'ENTITY', name: 'Карточка CRM', entityType: 'TASK', entityId: cardId(0) }]);
  });
  it.each([null, [{ type: 'TASK', id: 'invalid' }], Array(9).fill({ type: 'TASK', id: cardId(0) }), [{ type: 'SECRET', id: cardId(0) }], [{ type: '__proto__', id: cardId(0) }]])('rejects invalid multipart references before data lookup: %j', async input => {
    const f = chatFixture(); await expect(f.service.resolve(input as any, 'actor')).rejects.toMatchObject({ status: 400 }); expect(f.db.task.findMany).not.toHaveBeenCalled();
  });
  it('invalid type and oversized query never reach lookup', async () => {
    const f = chatFixture(); await expect(f.service.search('SECRET', '', 'actor')).rejects.toMatchObject({ status: 400 });
    await expect(f.service.search('TASK', 'x'.repeat(121), 'actor')).rejects.toMatchObject({ status: 400 }); expect(f.access.resolve).not.toHaveBeenCalled();
  });
  it('unauthorized recipient sees a neutral placeholder, without old metadata, title, ID or URL', async () => {
    const f = chatFixture('OWN');
    const result = await f.service.message('message', 'channel', 'actor');
    expect(result!.attachments[0]).toEqual({ id: 'attachment', kind: 'ENTITY', name: 'Карточка недоступна', restricted: true, entityType: null, entityId: null, metadata: null });
    expect(JSON.stringify(result)).not.toMatch(/stale-secret|malicious|tracker|private-email/); expect(JSON.stringify(result)).not.toContain(cardId(3));
  });
  it('authorized recipient gets current record values, not saved snapshots, and no contact/amount fields', async () => {
    const f = chatFixture(); const result = await f.service.message('message', 'channel', 'actor');
    expect(result!.attachments[0]).toMatchObject({ restricted: false, name: 'Задача other', metadata: { url: '/crm/tasks?task=' + cardId(3) } });
    expect(JSON.stringify(result)).not.toMatch(/stale-secret|malicious|tracker|private-/);
  });
  it('history and latest-message previews use the same recipient projection', async () => {
    const f = chatFixture('OWN'); const history = await f.service.messages('channel', 'actor'), channels = await f.service.channels('actor');
    expect(history[0].attachments[0].restricted).toBe(true); expect(channels[0].messages[0]!.attachments[0]).toEqual(history[0].attachments[0]);
  });
  it('batches repeated references across history into one lookup per record type', async () => {
    const f = chatFixture();
    for (let i = 0; i < 30; i++) f.messages.push({ ...f.messages[0], id: 'message-' + i });
    const rows = await f.service.messages('channel', 'actor');
    expect(rows).toHaveLength(31);
    expect(f.db.task.findMany).toHaveBeenCalledTimes(1);
    expect(f.db.task.findMany.mock.calls[0][0].take).toBe(1);
    expect(rows.every(row => row.attachments[0].restricted === false)).toBe(true);
  });
  it('rechecks permissions on every fetch even when message IDs have not changed', async () => {
    const f = chatFixture(); expect((await f.service.messages('channel', 'actor'))[0].attachments[0].restricted).toBe(false);
    f.denied.push('crm.read'); expect((await f.service.messages('channel', 'actor'))[0].attachments[0].restricted).toBe(true);
  });
  it('reply references are sanitized too; cross-channel and deleted quotes are omitted', async () => {
    const f = chatFixture('OWN'); f.messages[0].replyTo = { id: 'reply', channelId: 'channel', body: 'Reply', attachments: [f.legacy], author: {} };
    expect((await f.service.messages('channel', 'actor'))[0].replyTo!.attachments[0].restricted).toBe(true);
    f.messages[0].replyTo.channelId = 'private-channel'; expect((await f.service.messages('channel', 'actor'))[0].replyTo).toBeNull();
    f.messages[0].replyTo.channelId = 'channel'; f.messages[0].replyTo.deletedAt = new Date();
    expect((await f.service.messages('channel', 'actor'))[0].replyToId).toBeNull();
  });
  it('private channel membership, message channel and deletion are checked before projection', async () => {
    const f = chatFixture(); f.channel.type = 'PRIVATE';
    expect(await f.service.channels('peer')).toEqual([]); await expect(f.service.messages('channel', 'peer')).rejects.toMatchObject({ status: 404 });
    expect(await f.service.message('message', 'channel', 'peer')).toBeNull(); expect(await f.service.message('message', 'wrong-channel', 'actor')).toBeNull();
    f.messages[0].deletedAt = new Date(); expect(await f.service.message('message', 'channel', 'actor')).toBeNull();
  });
  it('disabled or external accounts cannot obtain history or channel previews', async () => {
    const f = chatFixture(); f.users[0].isActive = false;
    await expect(f.service.channels('actor')).rejects.toMatchObject({ status: 403 });
    f.users[0].isActive = true; f.users[0].role = 'CUSTOMER_B2B';
    await expect(f.service.messages('channel', 'actor')).rejects.toMatchObject({ status: 403 });
  });
  it('database errors do not fall back to stored snapshots', async () => {
    const f = chatFixture(); f.access.resolve.mockRejectedValueOnce(new Error('DB offline'));
    await expect(f.service.messages('channel', 'actor')).rejects.toThrow('DB offline');
  });
});
