"use client"

import { useMemo, useState, type FormEvent } from "react"
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  Box,
  ClipboardList,
  LogOut,
  Package,
  Plus,
  Search,
  Shield,
  ShoppingCart,
  Truck,
  UserCheck,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import {
  assignments as initialAssignments,
  bases,
  equipmentTypes,
  expenditures,
  purchases as initialPurchases,
  transfers as initialTransfers,
  type Assignment,
  type Purchase,
  type Transfer,
} from "@/lib/mock-data"

type Section = "dashboard" | "purchases" | "transfers" | "assignments"
type Draft = Record<string, string>

const navigation: { id: Section; label: string; icon: typeof Activity }[] = [
  { id: "dashboard", label: "Overview", icon: Activity },
  { id: "purchases", label: "Purchases", icon: ShoppingCart },
  { id: "transfers", label: "Transfers", icon: Truck },
  { id: "assignments", label: "Assignments", icon: UserCheck },
]

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"

function formatDate(date: string) {
  if (!date) return "—"
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function baseName(id: string) {
  return bases.find((base) => base.id === id)?.name ?? "Unknown base"
}

function equipmentName(id: string) {
  return equipmentTypes.find((item) => item.id === id)?.name ?? "Unknown equipment"
}

function StatusPill({ children }: { children: string }) {
  const color = children === "completed" || children === "active"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
    : children === "pending" || children === "in_transit"
      ? "bg-amber-50 text-amber-700 ring-amber-600/20"
      : "bg-slate-100 text-slate-600 ring-slate-500/10"
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${color}`}>{children.replaceAll("_", " ")}</span>
}

export default function HomePage() {
  const { user, loading, login, logout } = useAuth()
  const [section, setSection] = useState<Section>("dashboard")
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<Draft>({})
  const [loginName, setLoginName] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginBusy, setLoginBusy] = useState(false)
  const [purchaseRows, setPurchaseRows] = useState<Purchase[]>(initialPurchases)
  const [transferRows, setTransferRows] = useState<Transfer[]>(initialTransfers)
  const [assignmentRows, setAssignmentRows] = useState<Assignment[]>(initialAssignments)

  const visibleNavigation = navigation.filter((item) => item.id !== "assignments" || user?.role !== "logistics_officer")
  const selectedNavigation = navigation.find((item) => item.id === section) ?? navigation[0]
  const filteredPurchases = useMemo(() => purchaseRows.filter((row) => {
    const matchesBase = user?.role === "admin" || !user?.baseId || row.baseId === user.baseId
    const text = `${row.supplier} ${row.purchaseOrderNumber} ${equipmentName(row.equipmentTypeId)} ${baseName(row.baseId)}`.toLowerCase()
    return matchesBase && text.includes(search.toLowerCase())
  }), [purchaseRows, search, user])
  const filteredTransfers = useMemo(() => transferRows.filter((row) => {
    const matchesBase = user?.role === "admin" || !user?.baseId || row.fromBaseId === user.baseId || row.toBaseId === user.baseId
    const text = `${row.reason} ${equipmentName(row.equipmentTypeId)} ${baseName(row.fromBaseId)} ${baseName(row.toBaseId)} ${row.status}`.toLowerCase()
    return matchesBase && text.includes(search.toLowerCase())
  }), [transferRows, search, user])
  const filteredAssignments = useMemo(() => assignmentRows.filter((row) => `${row.assignedToName} ${row.assignedToRank} ${row.assignedToUnit} ${row.assignmentReason}`.toLowerCase().includes(search.toLowerCase())), [assignmentRows, search])

  const metricPurchases = purchaseRows.reduce((sum, row) => sum + row.quantity, 0)
  const metricIncoming = transferRows.filter((row) => row.status === "completed").reduce((sum, row) => sum + row.quantity, 0)
  const metricAssigned = assignmentRows.filter((row) => row.status === "active").length
  const metricExpended = expenditures.length

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoginBusy(true)
    setLoginError("")
    try {
      if (!(await login(loginName, loginPassword))) setLoginError("That username and password combination was not recognized.")
    } catch {
      setLoginError("Sign-in could not be completed. Please try again.")
    } finally {
      setLoginBusy(false)
    }
  }

  function openForm() {
    setDraft({ date: new Date().toISOString().slice(0, 10) })
    setShowForm(true)
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const id = `${Date.now()}`
    if (section === "purchases") {
      const quantity = Number(draft.quantity)
      const unitPrice = Number(draft.unitPrice)
      if (!draft.baseId || !draft.equipmentTypeId || !draft.supplier?.trim() || quantity <= 0 || unitPrice < 0) return
      setPurchaseRows((rows) => [{
        id,
        baseId: draft.baseId,
        equipmentTypeId: draft.equipmentTypeId,
        quantity,
        unitPrice,
        totalAmount: quantity * unitPrice,
        supplier: draft.supplier.trim(),
        purchaseDate: draft.date,
        purchaseOrderNumber: draft.purchaseOrderNumber.trim() || `PO-${id.slice(-6)}`,
        createdBy: user?.id ?? "",
      }, ...rows])
    } else if (section === "transfers") {
      const quantity = Number(draft.quantity)
      if (!draft.fromBaseId || !draft.toBaseId || draft.fromBaseId === draft.toBaseId || !draft.equipmentTypeId || quantity <= 0) return
      setTransferRows((rows) => [{
        id,
        fromBaseId: draft.fromBaseId,
        toBaseId: draft.toBaseId,
        equipmentTypeId: draft.equipmentTypeId,
        quantity,
        transferDate: draft.date,
        reason: draft.reason?.trim() || "Transfer requested",
        status: "pending",
        requestedBy: user?.id ?? "",
      }, ...rows])
    } else if (section === "assignments") {
      if (!draft.assignedToName?.trim() || !draft.assignedToUnit?.trim() || !draft.assetId?.trim()) return
      setAssignmentRows((rows) => [{
        id,
        assetId: draft.assetId.trim(),
        assignedToName: draft.assignedToName.trim(),
        assignedToRank: draft.assignedToRank?.trim() || "—",
        assignedToUnit: draft.assignedToUnit.trim(),
        assignmentDate: draft.date,
        assignmentReason: draft.reason?.trim() || "Operational assignment",
        status: "active",
        assignedBy: user?.id ?? "",
      }, ...rows])
    }
    setShowForm(false)
    setDraft({})
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-700 border-r-transparent" aria-label="Loading" /></main>
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f6fb] p-5">
        <section className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10 md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white md:flex">
            <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute -right-6 -top-10 h-52 w-52 rounded-full border border-white/10" />
            <div className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500"><Shield size={24} /></span><div><p className="font-bold tracking-wide">MAMS</p><p className="text-xs text-slate-400">Asset readiness platform</p></div></div>
            <div className="relative max-w-sm"><p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-blue-300">Command overview</p><h1 className="text-4xl font-semibold leading-tight">Every asset accounted for. Every mission ready.</h1><p className="mt-5 leading-7 text-slate-300">A unified operational view of procurement, transfers, and personnel assignments.</p></div>
            <p className="relative text-xs text-slate-500">Military Asset Management System · Secure access</p>
          </div>
          <div className="flex items-center justify-center p-7 sm:p-12"><div className="w-full max-w-sm">
            <div className="mb-8 md:hidden"><span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-700 text-white"><Shield size={24} /></span></div>
            <p className="text-sm font-semibold text-blue-700">Welcome back</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sign in to MAMS</h2><p className="mt-2 text-sm leading-6 text-slate-500">Use your assigned account to access asset operations.</p>
            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Username</span><input autoComplete="username" className={inputClass} value={loginName} onChange={(event) => setLoginName(event.target.value)} placeholder="Enter username" required /></label>
              <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">Password</span><input autoComplete="current-password" type="password" className={inputClass} value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} placeholder="Enter password" required /></label>
              {loginError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loginError}</p>}
              <button type="submit" className={`${buttonClass} w-full`} disabled={loginBusy}>{loginBusy ? "Signing in…" : "Sign in securely"}</button>
            </form>
            <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo access</p><p className="mt-2 text-sm text-slate-700">Admin: <span className="font-mono">admin / admin123</span></p><p className="mt-1 text-sm text-slate-700">Commander: <span className="font-mono">cmd_liberty / admin123</span></p><p className="mt-1 text-sm text-slate-700">Logistics: <span className="font-mono">log_liberty / admin123</span></p></div>
          </div></div>
        </section>
      </main>
    )
  }

  const canCreate = section === "purchases" || section === "transfers" || (section === "assignments" && user.role !== "logistics_officer")
  const sectionLabel = selectedNavigation.label

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-700 text-white"><Shield size={21} /></span><div><p className="font-bold tracking-wide">MAMS</p><p className="text-[11px] text-slate-500">Asset operations</p></div></div>
          <div className="px-4 pt-7"><p className="px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p><nav className="mt-3 space-y-1" aria-label="Main navigation">{visibleNavigation.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setSection(id); setSearch("") }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${section === id ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}><Icon size={18} />{label}{section === id && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-700" />}</button>)}</nav></div>
          <div className="mt-auto border-t border-slate-100 p-4"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{user.name}</p><p className="truncate text-xs capitalize text-slate-500">{user.role.replaceAll("_", " ")}</p></div></div><button onClick={logout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"><LogOut size={16} />Sign out</button></div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex min-h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
            <div><p className="text-xs font-medium text-slate-400">Operations / {sectionLabel}</p><h1 className="mt-1 text-xl font-semibold tracking-tight">{section === "dashboard" ? "Asset overview" : sectionLabel}</h1></div>
            <div className="flex items-center gap-3"><span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">System operational</span><button aria-label="Sign out" title="Sign out" onClick={logout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><LogOut size={18} /></button><div className="hidden h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 sm:grid">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div></div>
          </header>

          <div className="space-y-6 p-5 sm:p-8">
            <div className="flex items-end justify-between gap-4"><div><p className="text-sm text-slate-500">Good day, {user.name.split(" ").at(-1)}.</p><p className="mt-1 text-sm text-slate-400">Here is the latest snapshot of your asset operations.</p></div>{canCreate && <button className={buttonClass} onClick={openForm}><Plus size={17} />Add {section === "purchases" ? "purchase" : section === "transfers" ? "transfer" : "assignment"}</button>}</div>

            {section === "dashboard" && <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[{ label: "Purchase quantity", value: metricPurchases, icon: ShoppingCart, note: "Items procured" }, { label: "Completed transfers", value: metricIncoming, icon: ArrowLeftRight, note: "Items moved" }, { label: "Active assignments", value: metricAssigned, icon: UserCheck, note: "Personnel assignments" }, { label: "Recorded expenditures", value: metricExpended, icon: ClipboardList, note: "Logged events" }].map(({ label, value, icon: Icon, note }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-700"><Icon size={18} /></span></div><p className="mt-5 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p><p className="mt-1 text-xs text-slate-400">{note}</p></article>)}
              </div>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-start justify-between"><div><h2 className="font-semibold">Recent transfers</h2><p className="mt-1 text-sm text-slate-500">Movement activity across bases</p></div><button onClick={() => setSection("transfers")} className="text-sm font-semibold text-blue-700 hover:text-blue-900">View all</button></div><div className="mt-5 divide-y divide-slate-100">{transferRows.slice(0, 4).map((transfer) => <div key={transfer.id} className="flex items-center gap-3 py-4 first:pt-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><Truck size={17} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{equipmentName(transfer.equipmentTypeId)} <span className="font-normal text-slate-400">· {transfer.quantity} units</span></p><p className="mt-1 truncate text-xs text-slate-500">{baseName(transfer.fromBaseId)} <ArrowUpRight className="mx-1 inline" size={12} /> {baseName(transfer.toBaseId)}</p></div><StatusPill>{transfer.status}</StatusPill></div>)}</div></article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="font-semibold">Stock by category</h2><p className="mt-1 text-sm text-slate-500">Purchase volume by equipment</p><div className="mt-6 space-y-5">{equipmentTypes.slice(0, 4).map((item, index) => { const quantity = purchaseRows.filter((row) => row.equipmentTypeId === item.id).reduce((sum, row) => sum + row.quantity, 0); const max = Math.max(50, ...equipmentTypes.map((type) => purchaseRows.filter((row) => row.equipmentTypeId === type.id).reduce((sum, row) => sum + row.quantity, 0))); return <div key={item.id}><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{item.name}</span><span className="text-slate-500">{quantity}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${["bg-blue-600", "bg-indigo-500", "bg-sky-500", "bg-cyan-500"][index]}`} style={{ width: `${Math.max(4, (quantity / max) * 100)}%` }} /></div></div>})}</div><div className="mt-7 rounded-xl bg-blue-50 p-4"><div className="flex gap-3"><Box className="mt-0.5 text-blue-700" size={18} /><div><p className="text-sm font-semibold text-blue-950">Readiness snapshot</p><p className="mt-1 text-xs leading-5 text-blue-800">{bases.length} bases tracked with procurement and movement activity in one view.</p></div></div></div></article>
              </div>
              <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Latest purchases</h2><p className="mt-1 text-sm text-slate-500">Recent procurement records</p></div><button onClick={() => setSection("purchases")} className="text-sm font-semibold text-blue-700 hover:text-blue-900">View all</button></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase tracking-wide text-slate-400"><tr><th className="pb-3 font-medium">Equipment</th><th className="pb-3 font-medium">Base</th><th className="pb-3 font-medium">Supplier</th><th className="pb-3 font-medium">Date</th><th className="pb-3 text-right font-medium">Quantity</th></tr></thead><tbody className="divide-y divide-slate-100">{purchaseRows.slice(0, 4).map((row) => <tr key={row.id}><td className="py-3 font-medium">{equipmentName(row.equipmentTypeId)}</td><td className="py-3 text-slate-500">{baseName(row.baseId)}</td><td className="py-3 text-slate-500">{row.supplier}</td><td className="py-3 text-slate-500">{formatDate(row.purchaseDate)}</td><td className="py-3 text-right font-semibold">{row.quantity}</td></tr>)}</tbody></table></div></article>
            </>}

            {section !== "dashboard" && <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-semibold">{sectionLabel} records</h2><p className="mt-1 text-sm text-slate-500">Search and review current {sectionLabel.toLowerCase()} activity.</p></div><label className="relative block w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input className={`${inputClass} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${sectionLabel.toLowerCase()}…`} /></label></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400"><tr>{section === "purchases" ? <><th className="px-6 py-3 font-medium">Item / PO</th><th className="px-6 py-3 font-medium">Base</th><th className="px-6 py-3 font-medium">Supplier</th><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 text-right font-medium">Qty / total</th></> : section === "transfers" ? <><th className="px-6 py-3 font-medium">Equipment</th><th className="px-6 py-3 font-medium">Route</th><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 text-right font-medium">Qty</th></> : <><th className="px-6 py-3 font-medium">Personnel</th><th className="px-6 py-3 font-medium">Unit</th><th className="px-6 py-3 font-medium">Assignment</th><th className="px-6 py-3 font-medium">Date</th><th className="px-6 py-3 text-right font-medium">Status</th></>}</tr></thead>
                {section === "purchases" && <tbody className="divide-y divide-slate-100">{filteredPurchases.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-6 py-4"><p className="font-semibold">{equipmentName(row.equipmentTypeId)}</p><p className="mt-1 text-xs text-slate-400">{row.purchaseOrderNumber}</p></td><td className="px-6 py-4 text-slate-600">{baseName(row.baseId)}</td><td className="px-6 py-4 text-slate-600">{row.supplier}</td><td className="px-6 py-4 text-slate-600">{formatDate(row.purchaseDate)}</td><td className="px-6 py-4 text-right"><p className="font-semibold">{row.quantity} units</p><p className="mt-1 text-xs text-slate-400">${row.totalAmount.toLocaleString()}</p></td></tr>)}</tbody>}
                {section === "transfers" && <tbody className="divide-y divide-slate-100">{filteredTransfers.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-6 py-4 font-semibold">{equipmentName(row.equipmentTypeId)}</td><td className="px-6 py-4"><p className="text-slate-700">{baseName(row.fromBaseId)}</p><p className="mt-1 text-xs text-slate-400">to {baseName(row.toBaseId)}</p></td><td className="px-6 py-4 text-slate-600">{formatDate(row.transferDate)}</td><td className="px-6 py-4"><StatusPill>{row.status}</StatusPill></td><td className="px-6 py-4 text-right font-semibold">{row.quantity}</td></tr>)}</tbody>}
                {section === "assignments" && <tbody className="divide-y divide-slate-100">{filteredAssignments.map((row) => <tr key={row.id} className="hover:bg-slate-50/70"><td className="px-6 py-4"><p className="font-semibold">{row.assignedToName}</p><p className="mt-1 text-xs text-slate-400">{row.assignedToRank}</p></td><td className="px-6 py-4 text-slate-600">{row.assignedToUnit}</td><td className="px-6 py-4"><p className="text-slate-700">{row.assignmentReason}</p><p className="mt-1 text-xs text-slate-400">Asset {row.assetId}</p></td><td className="px-6 py-4 text-slate-600">{formatDate(row.assignmentDate)}</td><td className="px-6 py-4 text-right"><StatusPill>{row.status}</StatusPill></td></tr>)}</tbody>}</table>
                {((section === "purchases" && !filteredPurchases.length) || (section === "transfers" && !filteredTransfers.length) || (section === "assignments" && !filteredAssignments.length)) && <div className="px-6 py-14 text-center"><Package className="mx-auto text-slate-300" size={28} /><p className="mt-3 text-sm font-medium text-slate-700">No matching records</p><p className="mt-1 text-xs text-slate-400">Try another search, or add a new record.</p></div>}</div>
            </article>}
          </div>
        </section>
      </div>

      {showForm && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}><section role="dialog" aria-modal="true" aria-labelledby="record-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="record-title" className="text-xl font-semibold">Add {section === "purchases" ? "purchase" : section === "transfers" ? "transfer request" : "assignment"}</h2><p className="mt-1 text-sm text-slate-500">Enter the record details below.</p></div><button type="button" onClick={() => setShowForm(false)} aria-label="Close dialog" className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100">×</button></div>
        <form onSubmit={handleCreate} className="mt-6 space-y-4">
          {section === "purchases" && <><label className="block text-sm font-medium text-slate-700">Base<select className={`${inputClass} mt-1.5`} value={draft.baseId ?? ""} onChange={(event) => setDraft({ ...draft, baseId: event.target.value })} required><option value="">Select a base</option>{bases.map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Equipment<select className={`${inputClass} mt-1.5`} value={draft.equipmentTypeId ?? ""} onChange={(event) => setDraft({ ...draft, equipmentTypeId: event.target.value })} required><option value="">Select equipment</option>{equipmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Quantity<input className={`${inputClass} mt-1.5`} type="number" min="1" required value={draft.quantity ?? ""} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label><label className="block text-sm font-medium text-slate-700">Unit price<input className={`${inputClass} mt-1.5`} type="number" min="0" step="0.01" required value={draft.unitPrice ?? ""} onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} /></label></div><label className="block text-sm font-medium text-slate-700">Supplier<input className={`${inputClass} mt-1.5`} required value={draft.supplier ?? ""} onChange={(event) => setDraft({ ...draft, supplier: event.target.value })} /></label><label className="block text-sm font-medium text-slate-700">Purchase order number<input className={`${inputClass} mt-1.5`} value={draft.purchaseOrderNumber ?? ""} onChange={(event) => setDraft({ ...draft, purchaseOrderNumber: event.target.value })} /></label></>}
          {section === "transfers" && <><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">From base<select className={`${inputClass} mt-1.5`} value={draft.fromBaseId ?? ""} onChange={(event) => setDraft({ ...draft, fromBaseId: event.target.value })} required><option value="">Select base</option>{bases.map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">To base<select className={`${inputClass} mt-1.5`} value={draft.toBaseId ?? ""} onChange={(event) => setDraft({ ...draft, toBaseId: event.target.value })} required><option value="">Select base</option>{bases.filter((base) => base.id !== draft.fromBaseId).map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}</select></label></div><label className="block text-sm font-medium text-slate-700">Equipment<select className={`${inputClass} mt-1.5`} value={draft.equipmentTypeId ?? ""} onChange={(event) => setDraft({ ...draft, equipmentTypeId: event.target.value })} required><option value="">Select equipment</option>{equipmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Quantity<input className={`${inputClass} mt-1.5`} type="number" min="1" required value={draft.quantity ?? ""} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></label><label className="block text-sm font-medium text-slate-700">Transfer date<input className={`${inputClass} mt-1.5`} type="date" required value={draft.date ?? ""} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label></div><label className="block text-sm font-medium text-slate-700">Reason<input className={`${inputClass} mt-1.5`} value={draft.reason ?? ""} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} /></label></>}
          {section === "assignments" && <><label className="block text-sm font-medium text-slate-700">Asset identifier<input className={`${inputClass} mt-1.5`} required value={draft.assetId ?? ""} onChange={(event) => setDraft({ ...draft, assetId: event.target.value })} placeholder="e.g. M4-001-2024" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-700">Personnel name<input className={`${inputClass} mt-1.5`} required value={draft.assignedToName ?? ""} onChange={(event) => setDraft({ ...draft, assignedToName: event.target.value })} /></label><label className="block text-sm font-medium text-slate-700">Rank<input className={`${inputClass} mt-1.5`} value={draft.assignedToRank ?? ""} onChange={(event) => setDraft({ ...draft, assignedToRank: event.target.value })} /></label></div><label className="block text-sm font-medium text-slate-700">Unit<input className={`${inputClass} mt-1.5`} required value={draft.assignedToUnit ?? ""} onChange={(event) => setDraft({ ...draft, assignedToUnit: event.target.value })} /></label><label className="block text-sm font-medium text-slate-700">Assignment reason<input className={`${inputClass} mt-1.5`} value={draft.reason ?? ""} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} /></label></>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" className={buttonClass}>Save record</button></div>
        </form>
      </section></div>}
    </main>
  )
}

