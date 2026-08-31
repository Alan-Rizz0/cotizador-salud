"use client";

import { useMemo, useState } from "react";
import { calculateQuote, type Category, type ContributionType, type Member, type MemberRole, type PlanName, type Region, PROMOTION_OPTIONS } from "@/lib/cotizador-engine";

const legalNotes = [
  "La presente cotización no contempla casos de alto costo y baja incidencia.",
  "La validez del presupuesto es de siete días hábiles desde su emisión.",
  "La cotización está sujeta a actualizaciones, aumentos y ajustes.",
  "Puede variar si se modifican los datos personales informados.",
  "Los aportes son estimados y pueden variar.",
  "El monto del plan informado está sujeto a incrementos.",
];

const regions: Region[] = ["AMBA", "Norte", "Sur", "Patagonia", "Bahía / Mar del Plata"];
const filiales = ["", "CABA", "GBA Sur", "GBA Oeste", "GBA Norte", "Córdoba", "Corrientes", "Misiones", "Tucumán", "Salta", "Jujuy", "Santa Fe", "Bahía Blanca", "Mar del Plata", "Comahue", "Patagonia Norte", "Patagonia Sur", "Mendoza", "Mercedes", "Rosario", "San Juan"];
const contributionTypes: ContributionType[] = ["Sin aportes", "OBRAS SOCIALES", "Medife", "OSPSA", "OSSSB", "Unificado", "Monotributo A", "Monotributo B", "Monotributo C", "Monotributo D", "Monotributo E", "Monotributo F", "Monotributo G", "Monotributo H", "Monotributo I", "Monotributo J", "Monotributo K"];
const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

function addBusinessDays(source: string, amount: number) {
  const date = new Date(source + "T12:00:00");
  let count = 0;
  while (count < amount) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) count++;
  }
  return date;
}

export default function Home() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [step, setStep] = useState(1);
  const [seller, setSeller] = useState({ name: "", phone: "" });
  const [client, setClient] = useState<{ name: string; dni: string; region: Region; category: Category; filial: string; issueDate: string }>({ name: "", dni: "", region: "AMBA", category: "Voluntario", filial: "", issueDate: today });
  const [members, setMembers] = useState<Member[]>([{ id: 1, role: "Titular", age: 30, contributionType: "Sin aportes", grossSalary: 0 }]);
  const [promotion, setPromotion] = useState("Sin descuento");
  const [rules, setRules] = useState({ child: false, young: false, filial: false });
  const [selectedPlan, setSelectedPlan] = useState<PlanName>("Bronce");

  const quotes = useMemo(() => calculateQuote({ region: client.region, category: client.category, filial: client.filial, members, promotion, applyChildAdjustment: rules.child, applyYoungSegment: rules.young, applyFilialDiscount: rules.filial }), [client.region, client.category, client.filial, members, promotion, rules]);
  const selected = quotes.find((q) => q.plan === selectedPlan) ?? quotes[0];
  const validity = useMemo(() => addBusinessDays(client.issueDate, 7), [client.issueDate]);
  const canContinue = seller.name.trim() && seller.phone.trim() && client.name.trim() && client.dni.trim();

  function updateMember(id: number, patch: Partial<Member>) {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member));
  }
  function addMember(role: MemberRole = "Hijo/a") {
    if (members.length >= 11) return;
    setMembers((current) => [...current, { id: Date.now(), role, age: role === "Hijo/a" ? 0 : 30, contributionType: "Sin aportes", grossSalary: 0 }]);
  }

  return <main>
    <header className="topbar no-print">
      <a className="brand" href="#top"><span className="brand-mark">+</span><span>Cotizador <b>Salud</b></span></a>
      <span className="secure"><span className="dot" /> Matriz comercial agosto 2026</span>
    </header>

    <section className="hero no-print" id="top">
      <p className="eyebrow">Una decisión más clara</p>
      <h1>Encontrá el plan adecuado<br/>para cada familia.</h1>
      <p>Precios y reglas trasladados de la matriz comercial, con cada componente del cálculo visible.</p>
    </section>

    <div className="shell">
      <nav className="steps no-print">{["Datos", "Grupo familiar", "Cotización"].map((label, index) =>
        <button key={label} className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""} onClick={() => index + 1 < step && setStep(index + 1)}><span>{step > index + 1 ? "✓" : index + 1}</span>{label}</button>)}</nav>

      <div className="workspace">
        <section className="content-card">
          {step === 1 && <div className="stage">
            <div className="stage-title"><span>01</span><div><h2>Datos de la cotización</h2><p>Información del vendedor, asociado y condición comercial.</p></div></div>
            <div className="section-label">Datos del vendedor</div>
            <div className="form-grid">
              <label>Nombre y apellido<input value={seller.name} onChange={(e)=>setSeller({...seller,name:e.target.value})} placeholder="Ej. María González"/></label>
              <label>Teléfono<input value={seller.phone} onChange={(e)=>setSeller({...seller,phone:e.target.value})} placeholder="Ej. 11 5555 5555"/></label>
            </div>
            <div className="section-label">Datos del asociado</div>
            <div className="form-grid">
              <label>Nombre y apellido<input value={client.name} onChange={(e)=>setClient({...client,name:e.target.value})} placeholder="Ej. Nicolás Pérez"/></label>
              <label>DNI<input value={client.dni} onChange={(e)=>setClient({...client,dni:e.target.value.replace(/\D/g,"")})} placeholder="Sin puntos" inputMode="numeric"/></label>
              <label>Región<select value={client.region} onChange={(e)=>setClient({...client,region:e.target.value as Region,filial:""})}>{regions.map(r=><option key={r}>{r}</option>)}</select></label>
              <label>Filial / procedencia<select value={client.filial} onChange={(e)=>setClient({...client,filial:e.target.value})}>{filiales.map(f=><option key={f} value={f}>{f || "Sin filial específica"}</option>)}</select></label>
              <label>Categoría<select value={client.category} onChange={(e)=>{const category=e.target.value as Category;setClient({...client,category});setPromotion("Sin descuento")}}><option>Voluntario</option><option>Obligatorio</option></select></label>
              <label>Fecha del presupuesto<input type="date" value={client.issueDate} onChange={(e)=>setClient({...client,issueDate:e.target.value})}/></label>
            </div>
            <div className="actions"><span className={canContinue ? "hint ready" : "hint"}>{canContinue ? "Datos completos" : "Completá los datos obligatorios"}</span><button className="primary" disabled={!canContinue} onClick={()=>setStep(2)}>Continuar <span>→</span></button></div>
          </div>}

          {step === 2 && <div className="stage">
            <div className="stage-title"><span>02</span><div><h2>Grupo familiar</h2><p>Indicá parentesco, edad y aportes de cada integrante.</p></div></div>
            <div className="members">
              {members.map((member,index)=><div className="member-row exact" key={member.id}>
                <span className="member-number">{String(index+1).padStart(2,"0")}</span>
                <label>Integrante<select value={member.role} disabled={index===0} onChange={(e)=>updateMember(member.id,{role:e.target.value as MemberRole})}><option>Titular</option><option>Cónyuge</option><option>Hijo/a</option><option>Familiar a cargo</option></select></label>
                <label>Edad<input type="number" min="0" max="99" value={member.age} onChange={(e)=>updateMember(member.id,{age:Math.min(99,Math.max(0,Number(e.target.value)))})}/></label>
                {client.category === "Obligatorio" && <><label>Aporte<select value={member.contributionType} onChange={(e)=>updateMember(member.id,{contributionType:e.target.value as ContributionType})}>{contributionTypes.map(x=><option key={x}>{x}</option>)}</select></label>{!String(member.contributionType).startsWith("Monotributo") && member.contributionType !== "Sin aportes" && <label>Sueldo bruto<input type="number" min="0" value={member.grossSalary || ""} placeholder="$ 0" onChange={(e)=>updateMember(member.id,{grossSalary:Math.max(0,Number(e.target.value))})}/></label>}</>}
                {index>0 && <button className="remove" onClick={()=>setMembers(current=>current.filter(x=>x.id!==member.id))}>×</button>}
              </div>)}
            </div>
            <div className="member-adds"><button className="add" onClick={()=>addMember("Cónyuge")}>+ Cónyuge</button><button className="add" onClick={()=>addMember("Hijo/a")}>+ Hijo/a</button><button className="add" onClick={()=>addMember("Familiar a cargo")}>+ Familiar a cargo</button></div>
            <div className="promo"><div><span className="promo-icon">%</span><div><strong>Descuento promocional</strong><small>Esquema temporal definido en Políticas Comerciales</small></div></div><select value={promotion} onChange={(e)=>setPromotion(e.target.value)}>{Object.keys(PROMOTION_OPTIONS[client.category]).map(x=><option key={x}>{x}</option>)}</select></div>
            <div className="rule-switches">
              <label><input type="checkbox" checked={rules.child} onChange={(e)=>setRules({...rules,child:e.target.checked})}/><span><b>Ajuste de hijos</b><small>AMBA −45% · Interior −55%</small></span></label>
              <label><input type="checkbox" checked={rules.young} onChange={(e)=>setRules({...rules,young:e.target.checked})}/><span><b>Segmento joven</b><small>Según edad, región y plan</small></span></label>
              <label><input type="checkbox" checked={rules.filial} onChange={(e)=>setRules({...rules,filial:e.target.checked})}/><span><b>Descuento filial</b><small>Solo cuando corresponde</small></span></label>
            </div>
            <div className="actions"><button className="secondary" onClick={()=>setStep(1)}>← Volver</button><button className="primary" onClick={()=>setStep(3)}>Calcular cotización <span>→</span></button></div>
          </div>}

          {step === 3 && <div className="stage quote-stage">
            <div className="stage-title"><span>03</span><div><h2>Comparación de planes</h2><p>Desglose calculado con la matriz de agosto 2026.</p></div></div>
            <div className="quote-meta"><span><small>Región</small>{client.region}</span><span><small>Categoría</small>{client.category}</span><span><small>Integrantes</small>{members.length}</span><span><small>Vigencia</small>{validity.toLocaleDateString("es-AR")}</span></div>
            <div className="plan-grid">
              {quotes.map((plan,index)=><article className={`plan ${selectedPlan===plan.plan?"selected":""}`} key={plan.plan} onClick={()=>setSelectedPlan(plan.plan)}>
                {selectedPlan===plan.plan && <span className="recommended">Seleccionado</span>}
                <div className="plan-index">0{index+1}</div><h3>{plan.plan}</h3>
                <div className="price"><small>Primera cuota</small><strong>{money.format(plan.firstInstallment)}</strong><em>{promotion}</em></div>
                <div className="later"><span>Desde cuota 13</span><b>{money.format(plan.installment13)}</b></div>
                <details><summary>Ver cálculo</summary><dl className="breakdown"><div><dt>Precio del plan</dt><dd>{money.format(plan.listPrice)}</dd></div><div><dt>Ajustes permanentes</dt><dd>{money.format(plan.permanentAdjustment)}</dd></div><div><dt>Descuento filial</dt><dd>{money.format(plan.filialDiscount)}</dd></div><div><dt>Promoción</dt><dd>{money.format(plan.promotionalDiscount)}</dd></div><div><dt>{client.category==="Voluntario"?"IVA 10,5%":"Aportes"}</dt><dd>{money.format(plan.ivaOrContribution)}</dd></div></dl></details>
              </article>)}
            </div>
            <p className="estimate-warning"><b>Estado de validación:</b> el motor utiliza precios y reglas extraídos del Excel, pero la equivalencia integral continúa sujeta a pruebas contra casos comerciales reales.</p>
            <div className="actions no-print"><button className="secondary" onClick={()=>setStep(2)}>← Modificar datos</button><button className="primary" onClick={()=>window.print()}>Descargar cotización en PDF</button></div>
          </div>}
        </section>

        <aside className="summary no-print">
          <p className="eyebrow">Resumen</p><h3>Tu cotización</h3>
          <dl><div><dt>Asociado</dt><dd>{client.name||"Sin completar"}</dd></div><div><dt>Región</dt><dd>{client.region}</dd></div><div><dt>Categoría</dt><dd>{client.category}</dd></div><div><dt>Grupo familiar</dt><dd>{members.length} {members.length===1?"integrante":"integrantes"}</dd></div><div><dt>Promoción</dt><dd>{promotion}</dd></div>{step===3&&<div><dt>Plan elegido</dt><dd>{selectedPlan}</dd></div>}</dl>
          <div className="summary-bottom"><span className="shield">✓</span><p><b>Motor auditable</b><br/>Cada resultado conserva la referencia de las tablas utilizadas.</p></div>
        </aside>
      </div>
    </div>

    <section className="print-only print-document">
      <div className="print-head"><div className="brand"><span className="brand-mark">+</span><span>Cotizador <b>Salud</b></span></div><div><small>Fecha de emisión</small><b>{new Date(client.issueDate+"T12:00:00").toLocaleDateString("es-AR")}</b></div></div>
      <h1>Cotización de planes de salud</h1>
      <div className="print-details"><div><h2>Asociado</h2><p><b>{client.name||"—"}</b><br/>DNI {client.dni||"—"}<br/>{client.region} · {client.category}</p></div><div><h2>Vendedor</h2><p><b>{seller.name||"—"}</b><br/>{seller.phone||"—"}</p></div><div><h2>Vigencia</h2><p><b>Hasta el {validity.toLocaleDateString("es-AR")}</b><br/>7 días hábiles</p></div></div>
      <h2>Comparación de planes</h2>
      <table><thead><tr><th>Plan</th><th>Precio plan</th><th>Descuentos / ajustes</th><th>IVA / aportes</th><th>Primera cuota</th><th>Desde cuota 13</th></tr></thead><tbody>{quotes.map(p=><tr className={p.plan===selectedPlan?"chosen":""} key={p.plan}><td><b>{p.plan}{p.plan===selectedPlan?" · Seleccionado":""}</b></td><td>{money.format(p.listPrice)}</td><td>{money.format(p.permanentAdjustment+p.filialDiscount+p.promotionalDiscount)}</td><td>{money.format(p.ivaOrContribution)}</td><td>{money.format(p.firstInstallment)}</td><td>{money.format(p.installment13)}</td></tr>)}</tbody></table>
      <h2>Grupo familiar</h2><table><thead><tr><th>Integrante</th><th>Edad</th><th>Aporte informado</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td>{m.role}</td><td>{m.age} años</td><td>{client.category==="Obligatorio"?m.contributionType:"No corresponde"}</td></tr>)}</tbody></table>
      <div className="print-promo">Promoción: <b>{promotion}</b>. Plan seleccionado: <b>{selected.plan}</b>.</div>
      <div className="legal"><h2>Información importante</h2><ol>{legalNotes.map(note=><li key={note}>{note}</li>)}</ol><p><b>Validación pendiente:</b> aunque los datos provienen de la matriz comercial, esta versión debe completar la batería de pruebas antes de considerarse contractualmente exacta.</p></div>
    </section>
  </main>;
}
