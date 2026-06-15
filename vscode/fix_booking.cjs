const fs = require('fs');
let c = fs.readFileSync('src/components/Booking.tsx', 'utf8');

// 1. Add FileText to imports, and format12h
c = c.replace(/import \{([^}]+)\} from 'lucide-react';/, (m, p1) => {
  if (!p1.includes('FileText')) return `import { ${p1}, FileText } from 'lucide-react';`;
  return m;
});
if (!c.includes('import { format12h }')) {
  c = c.replace(/import \{\s*useSettingsStore\s*\}\s*from\s*'..\/store\/settingsStore';/, 
    `import { useSettingsStore } from '../store/settingsStore';\nimport { format12h } from '../lib/timeFormat';`);
}

// 2. Interface Pkg
if (!c.includes('interface Pkg {')) {
  c = c.replace(/interface ExistingAppt \{/, `interface Pkg {\n  id: string;\n  name: string;\n  service_id: string;\n}\n\ninterface ExistingAppt {`);
}

// 3. State for packages
if (!c.includes('const [packages, setPackages] = useState')) {
  c = c.replace(/const \[services, setServices\] = useState<Service\[\]>\(\[\]\);/, 
    `const [services, setServices] = useState<Service[]>([]);\n  const [packages, setPackages] = useState<Pkg[]>([]);`);
}

// 4. Load Data
c = c.replace(/const \[svcRes, staffRes\] = await Promise\.all\(\[/, `const [svcRes, pkgRes, staffRes] = await Promise.all([`);
c = c.replace(/supabase\s*\.from\('staff'\)/, `supabase.from('session_packages').select('id, name, service_id').eq('active', true).order('name'),\n        supabase\n          .from('staff')`);
c = c.replace(/if \(staffRes\.data\) setStaffList\(staffRes\.data as StaffMember\[\]\);/, 
  `if (staffRes.data) setStaffList(staffRes.data as StaffMember[]);\n      if (pkgRes && pkgRes.data) setPackages(pkgRes.data as Pkg[]);`);

// 5. Lookup logic AND availableStaff FIX
const lookupOriginal = `  const selectedService = services.find((s) => s.id === form.serviceId);
  const selectedStaff = staffList.find((s) => s.id === form.staffId);

  // Only show staff who can perform the selected service
  const availableStaff = useMemo(() => {
    if (!form.serviceId) return [];
    return staffList.filter((s) => {
      const ids = s.service_ids ?? [];
      return ids.length === 0 || ids.includes(form.serviceId);
    });
  }, [form.serviceId, staffList]);`;

const lookupReplacement = `  const isPackage = form.serviceId.startsWith('pkg_');
  const actualServiceId = isPackage ? packages.find(p => p.id === form.serviceId.replace('pkg_', ''))?.service_id : form.serviceId;
  const selectedService = services.find((s) => s.id === actualServiceId);
  const selectedPackage = isPackage ? packages.find(p => p.id === form.serviceId.replace('pkg_', '')) : null;
  const selectedStaff = staffList.find((s) => s.id === form.staffId);

  // Only show staff who can perform the selected service
  const availableStaff = useMemo(() => {
    if (!actualServiceId) return [];
    return staffList.filter((s) => {
      const ids = s.service_ids ?? [];
      return ids.length === 0 || ids.includes(actualServiceId);
    });
  }, [actualServiceId, staffList]);`;

c = c.replace(lookupOriginal, lookupReplacement);

// 6. WhatsApp message
c = c.replace(/`Hora: \$\{form\.time\}\\n` \+/, `\`Hora: \${format12h(form.time)}\\n\` +`);

// 7. DB insert service name
c = c.replace(/service: selectedService\.name,/, `service: selectedPackage ? \`Paquete: \${selectedPackage.name}\` : selectedService.name,`);

// 8. Select dropdown
const selectOriginal = `<option value="">Selecciona un servicio</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.duration} min)
                  </option>
                ))}`;

const selectReplacement = `<option value="">Selecciona un servicio o paquete</option>
                {services.length > 0 && (
                  <optgroup label="Servicios">
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.duration} min)
                      </option>
                    ))}
                  </optgroup>
                )}
                {packages.length > 0 && (
                  <optgroup label="Paquetes">
                    {packages.map((p) => {
                      const svc = services.find(s => s.id === p.service_id);
                      return (
                        <option key={p.id} value={\`pkg_\${p.id}\`}>
                          {p.name} {svc ? \`(\${svc.duration} min / sesion)\` : ''}
                        </option>
                      );
                    })}
                  </optgroup>
                )}`;

c = c.replace(selectOriginal, selectReplacement);

// 9. Time slot formatting
c = c.replace(/>\s*\{time\}\s*<\/button>/g, `>\n                      {format12h(time)}\n                    </button>`);

// 10. Notes icon
c = c.replace(/<label htmlFor="booking-notes">📝 Notas adicionales<\/label>/, `<label htmlFor="booking-notes"><FileText size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} /> Notas adicionales</label>`);

fs.writeFileSync('src/components/Booking.tsx', c, 'utf8');
console.log('Done');
