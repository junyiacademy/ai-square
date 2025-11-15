/**
 * Mock for pg (node-postgres) module
 */

export class Pool {
  query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  connect = jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  });
  end = jest.fn().mockResolvedValue(undefined);
  on = jest.fn();
}

export class Client {
  query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
  connect = jest.fn().mockResolvedValue(undefined);
  end = jest.fn().mockResolvedValue(undefined);
  on = jest.fn();
  release = jest.fn();
}

const pgModule = {
  Pool,
  Client,
};

export default pgModule;
