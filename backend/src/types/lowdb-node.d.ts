declare module 'lowdb/node' {
  export { JSONFile, JSONFileSync, TextFile, TextFileSync } from 'lowdb/lib/adapters/JSONFileSync';
  export * from 'lowdb/lib/adapters/JSONFile';
  export * from 'lowdb/lib/adapters/JSONFileSync';
  export * from 'lowdb/lib/adapters/TextFile';
  export * from 'lowdb/lib/adapters/TextFileSync';
}
