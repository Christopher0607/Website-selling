// Desk storage in local JSON files — only for tests on a computer (site/tools/dev-server.mjs). Node only.
//   <file>            the desk document (prospects-v1)
//   <file>.keys.json  the mockup key pair
//   <file>.views.json mockup views, by mockup name
//   <file>.forms.json website form submissions, by id
//   <file>.misc.json  anything else
import fs from 'node:fs';

export function fileStore(file) {
  const read = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return fb; } };
  const where = (k) => {
    if (k === 'prospects-v1') return { f: file };
    if (k.startsWith('preview-keys')) return { f: file + '.keys.json', sub: k };
    if (k.startsWith('view:')) return { f: file + '.views.json', sub: k.slice(5) };
    if (k.startsWith('form:')) return { f: file + '.forms.json', sub: k.slice(5) };
    return { f: file + '.misc.json', sub: k };
  };
  const api = {
    async get(k) {
      const w = where(k);
      if (!w.sub) return read(w.f, null);
      const all = read(w.f, {});
      return all[w.sub] === undefined ? null : all[w.sub];
    },
    async set(k, value) {
      const w = where(k);
      if (!w.sub) { fs.writeFileSync(w.f, JSON.stringify(value)); return; }
      const all = read(w.f, {});
      all[w.sub] = value;
      fs.writeFileSync(w.f, JSON.stringify(all));
    },
    async getMany(keys) {
      const out = new Map();
      for (const k of keys) { const v = await api.get(k); if (v !== null) out.set(k, v); }
      return out;
    },
    async list(prefix, limit = 50) {
      const w = where(prefix + 'x');
      const all = read(w.f, {});
      return Object.keys(all).filter((s) => (prefix + s).startsWith(prefix)).sort().reverse().slice(0, limit).map((s) => ({ key: prefix + s, value: all[s] }));
    },
    async del(k) {
      const w = where(k);
      if (!w.sub) { try { fs.unlinkSync(w.f); } catch (e) { /* none */ } return; }
      const all = read(w.f, {});
      delete all[w.sub];
      fs.writeFileSync(w.f, JSON.stringify(all));
    },
  };
  return api;
}
