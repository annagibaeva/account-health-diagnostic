import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readdirSync,readFileSync} from 'node:fs';
export function openLocalDb(path=new URL('../agents/state/shared.sqlite',import.meta.url)){
 if(path instanceof URL)mkdirSync(new URL('.',path),{recursive:true});
 const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL');db.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort()){if(db.prepare('SELECT name FROM _local_migrations WHERE name=?').get(name))continue;db.exec('BEGIN');try{db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));db.prepare('INSERT INTO _local_migrations VALUES (?)').run(name);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}
 const wrap=(sql,args=[])=>({bind(...v){return wrap(sql,v)},async first(){return db.prepare(sql).get(...args)??null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:db.prepare(sql).run(...args)}}});
 return {prepare:wrap,async batch(statements){db.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());db.exec('COMMIT');return result}catch(e){db.exec('ROLLBACK');throw e}},close:()=>db.close()};
}
