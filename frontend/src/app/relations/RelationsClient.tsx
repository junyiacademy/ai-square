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