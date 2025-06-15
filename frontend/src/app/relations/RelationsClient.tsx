'use client';
import React, { useState } from 'react';

interface Competency {
  key: string;
  description: string;
  knowledge: string[];
  skills: string[];
  attitudes: string[];
}

interface Domain {
  key: string;
  overview: string;
  competencies: Competency[];
}

interface KSAItem {
  summary: string;
  theme: string;
  explanation?: string;
}

interface TreeData {
  domains: Domain[];
  kMap: Record<string, KSAItem>;
  sMap: Record<string, KSAItem>;
  aMap: Record<string, KSAItem>;
}

export default function RelationsClient({ tree }: { tree: TreeData }) {
  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      <h1 className="mb-8 text-3xl font-bold text-center">Empowering Learners for the Age of AI</h1>
      <div className="max-w-3xl mx-auto">
        {tree.domains.map((domain) => (
          <DomainAccordion key={domain.key} domain={domain} kMap={tree.kMap} sMap={tree.sMap} aMap={tree.aMap} />
        ))}
      </div>
    </main>
  );
}

function DomainAccordion({ domain, kMap, sMap, aMap }: { domain: Domain, kMap: Record<string, KSAItem>, sMap: Record<string, KSAItem>, aMap: Record<string, KSAItem> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6">
      <div
        className="cursor-pointer bg-gradient-to-r from-blue-100 to-purple-100 px-6 py-4 rounded-lg shadow flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <span className="text-xl font-bold text-blue-800 mr-2">{domain.key}</span>
          <span className="text-gray-700 text-base font-medium">{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className="bg-white border border-gray-200 rounded-b-lg px-6 py-4">
          <p className="mb-4 text-gray-700">{domain.overview}</p>
          {domain.competencies.map((comp) => (
            <CompetencyAccordion key={comp.key} comp={comp} kMap={kMap} sMap={sMap} aMap={aMap} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetencyAccordion({ comp, kMap, sMap, aMap }: { comp: Competency, kMap: Record<string, KSAItem>, sMap: Record<string, KSAItem>, aMap: Record<string, KSAItem> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4">
      <div
        className="cursor-pointer bg-gray-100 px-4 py-2 rounded flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-blue-700 mr-2">{comp.key}</span>
        <span className="text-gray-700 font-medium flex-1">{comp.description}</span>
        <span className="ml-2">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="bg-white border border-gray-100 rounded-b px-4 py-3 mt-1">
          <KSAList type="Knowledge" codes={comp.knowledge} map={kMap} />
          <KSAList type="Skills" codes={comp.skills} map={sMap} />
          <KSAList type="Attitudes" codes={comp.attitudes} map={aMap} />
        </div>
      )}
    </div>
  );
}

function KSAList({ type, codes, map }: { type: string, codes: string[], map: Record<string, KSAItem> }) {
  return (
    <div className="mb-2">
      <div className="font-bold text-gray-600 mb-1">{type}</div>
      <div className="flex flex-wrap gap-2">
        {codes.map((code: string) => (
          <KSATagAccordion key={code} code={code} info={map[code]} />
        ))}
      </div>
    </div>
  );
}

function KSATagAccordion({ code, info }: { code: string, info: KSAItem }) {
  const [open, setOpen] = useState(false);
  if (!info) return null;
  return (
    <div>
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold cursor-pointer ${open ? 'bg-blue-200 text-blue-900' : 'bg-blue-100 text-blue-800'} mr-1 mb-1`}
        onClick={() => setOpen(o => !o)}
      >
        {code}
      </span>
      {open && (
        <div className="bg-gray-50 border border-blue-100 rounded px-3 py-2 mt-1 text-xs max-w-xs">
          <div className="font-bold mb-1">{info.summary}</div>
          <div className="text-gray-600">{info.theme && <span className="font-semibold">主題：</span>}{info.theme}</div>
          {info.explanation && <div className="text-gray-500 mt-1 whitespace-pre-line">{info.explanation}</div>}
        </div>
      )}
    </div>
  );
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          cursor: 'pointer',
          background: '#f0f0f5',
          padding: '8px 12px',
          borderRadius: 6,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
        }}
      >
        <span style={{ marginRight: 8 }}>{open ? '▼' : '▶'}</span>
        {title}
      </div>
      {open && (
        <div style={{ padding: '8px 16px', background: '#fff', borderRadius: 6, border: '1px solid #eee', marginTop: 4 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Tag({ children, color = 'blue' }: { children: React.ReactNode; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 mb-1 ${colorMap[color] || colorMap.blue}`}>{children}</span>
  );
}

function getTagColor(type: string) {
  if (type.startsWith('K')) return 'blue';
  if (type.startsWith('S')) return 'green';
  if (type.startsWith('A')) return 'purple';
  return 'gray';
}

function CompetencyCard({ item }: { item: any }) {
  return (
    <section
      className="mb-10 bg-white rounded-xl shadow-md p-8 border border-gray-200 max-w-2xl mx-auto"
    >
      <h2 className="text-xl font-bold mb-1 text-gray-800 flex items-center gap-2">
        <span className="text-base font-semibold text-gray-500">{item.domain}</span>
        <span className="text-lg font-bold text-blue-700">{item.competency}</span>
      </h2>
      <p className="font-medium text-gray-600 mb-4">{item.description}</p>
      <Accordion title="Knowledge">
        <ul className="m-0 pl-0 flex flex-wrap gap-2">
          {item.knowledge.map((k: any) => (
            <li key={k.code} className="list-none">
              <Tag color={getTagColor(k.code)}>{k.code}</Tag>
              <span className="text-gray-700 text-sm">{k.summary}</span>
            </li>
          ))}
        </ul>
      </Accordion>
      <Accordion title="Skills">
        <ul className="m-0 pl-0 flex flex-wrap gap-2">
          {item.skills.map((s: any) => (
            <li key={s.theme} className="list-none">
              <Tag color={getTagColor(s.theme)}>{s.theme}</Tag>
              <span className="text-gray-700 text-sm">{s.summary}</span>
            </li>
          ))}
        </ul>
      </Accordion>
      <Accordion title="Attitudes">
        <ul className="m-0 pl-0 flex flex-wrap gap-2">
          {item.attitudes.map((a: any) => (
            <li key={a.theme} className="list-none">
              <Tag color={getTagColor(a.theme)}>{a.theme}</Tag>
              <span className="text-gray-700 text-sm">{a.summary}</span>
            </li>
          ))}
        </ul>
      </Accordion>
    </section>
  );
} 