const langs = ['en','zhTW','zhCN','pt','ar','id','th','es','ja','ko','fr','de','ru','it'];

async function hit(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.headers.get('X-Cache');
}

async function main() {
  const base = process.env.BASE_URL || 'http://localhost:3001';
  const rel = `${base}/api/relations?lang=`;
  const disc = `${base}/api/discovery/scenarios?lang=`;

  console.log('Prewarming relations...');
  for (const l of langs) {
    const x = await hit(rel + l);
    console.log(`relations(${l}) -> ${x}`);
  }

  console.log('Prewarming discovery scenarios (anonymous)...');
  for (const l of langs) {
    const x = await hit(disc + l);
    console.log(`discovery(${l}) -> ${x}`);
  }

  console.log('Done');
}

main().catch(e => { console.error(e); process.exit(1); }); 