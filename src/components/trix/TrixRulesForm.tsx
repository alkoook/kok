import type { TrixRules } from '../../types';

export function TrixRulesForm({ rules, onChange }: { rules: TrixRules; onChange: (rules: TrixRules) => void }) {
  const number = (label: string, key: keyof Pick<TrixRules, 'kingPenalty' | 'queenPenalty' | 'diamondPenalty' | 'trickPenalty'>) => <label><span className="label">{label}</span><input className="field" type="number" value={rules[key]} onChange={(event) => onChange({ ...rules, [key]: Number(event.target.value) })}/></label>;
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">{number('شيخ الكبة', 'kingPenalty')}{number('كل بنت', 'queenPenalty')}{number('كل ديناري', 'diamondPenalty')}{number('كل لطش', 'trickPenalty')}</div>
    <div><span className="label">نقاط ترتيب التركس</span><div className="grid grid-cols-4 gap-2" dir="ltr">{rules.trixRanks.map((score, index) => <input key={index} className="field px-2 text-center" aria-label={`المركز ${index + 1}`} type="number" value={score} onChange={(event) => { const ranks = [...rules.trixRanks] as TrixRules['trixRanks']; ranks[index] = Number(event.target.value); onChange({ ...rules, trixRanks: ranks }); }}/>)}</div></div>
    <p className="muted">الدبل غير مفعّل افتراضيًا لأن تفاصيله تختلف بين المجموعات.</p>
  </div>;
}
