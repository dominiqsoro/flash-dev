const { parseLsof, parseSs, parseNetstat } = require('../commands/ports');

describe('ports — analyseurs de sortie système', () => {
  test('parseLsof extrait port, pid et processus', () => {
    const output = [
      'COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME',
      'node    12345 user   23u  IPv4 123456      0t0  TCP *:3000 (LISTEN)',
      'postgres 999 user    7u  IPv6 987654      0t0  TCP 127.0.0.1:5432 (LISTEN)'
    ].join('\n');

    const entries = parseLsof(output);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ port: 3000, pid: 12345, process: 'node' });
    expect(entries[1]).toMatchObject({ port: 5432, pid: 999, process: 'postgres' });
  });

  test('parseSs extrait port et processus', () => {
    const output = [
      'State  Recv-Q Send-Q Local Address:Port Peer Address:Port Process',
      'LISTEN 0      511          0.0.0.0:3000      0.0.0.0:*    users:(("node",pid=4321,fd=23))'
    ].join('\n');

    const entries = parseSs(output);
    expect(entries[0]).toMatchObject({ port: 3000, pid: 4321, process: 'node' });
  });

  test('parseSs tolère l\'absence d\'information de processus', () => {
    const output = [
      'State  Recv-Q Send-Q Local Address:Port Peer Address:Port',
      'LISTEN 0      511          0.0.0.0:8080      0.0.0.0:*'
    ].join('\n');

    expect(parseSs(output)[0]).toMatchObject({ port: 8080, pid: null, process: 'inconnu' });
  });

  test('parseNetstat ne retient que les sockets en écoute', () => {
    const output = [
      '  Proto  Adresse locale         Adresse distante       État           PID',
      '  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       7788',
      '  TCP    127.0.0.1:52344        127.0.0.1:3000         ESTABLISHED     9900'
    ].join('\n');

    const entries = parseNetstat(output);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ port: 3000, pid: 7788 });
  });

  test.each([[''], ['sortie inattendue']])('gère une sortie illisible (%p)', (output) => {
    expect(parseLsof(output)).toEqual([]);
    expect(parseSs(output)).toEqual([]);
    expect(parseNetstat(output)).toEqual([]);
  });
});
