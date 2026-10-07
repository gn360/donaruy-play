import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchPlayConfig, fetchNgos, initDonation } from '../api/playApi'
import type { PlayOption, NgoOption } from '../api/playApi'

export default function DonationForm() {
  const [options, setOptions] = useState<PlayOption[]>([])
  const [ngos, setNgos] = useState<NgoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [selectedOption, setSelectedOption] = useState(0)
  const [selectedNgo, setSelectedNgo] = useState('')
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [docNumber, setDocNumber] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [opts, ngoList] = await Promise.all([fetchPlayConfig(), fetchNgos()])
        setOptions(opts)
        setNgos(ngoList)
        if (ngoList.length > 0) setSelectedNgo(ngoList[0].slug)
      } catch {
        setError('Error al cargar datos. Reintentá.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!name || !lastName || !phone || !email || !docNumber || !selectedNgo) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (!/^\d{9}$/.test(phone)) {
      setError('Celular: 9 dígitos (ej: 091234567)')
      return
    }
    if (!/^\d{7,8}$/.test(docNumber)) {
      setError('Cédula: 7 u 8 dígitos')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido')
      return
    }

    setSubmitting(true)
    try {
      const result = await initDonation({
        option_index: selectedOption,
        name,
        last_name: lastName,
        phone,
        email,
        doc_number: docNumber,
        ngo_slug: selectedNgo,
      })

      // Redirigir a CobrosYa creando un formulario y haciendo submit
      const formEl = document.createElement('form')
      formEl.method = 'POST'
      formEl.action = result.redirect_url
      document.body.appendChild(formEl)
      formEl.submit()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error?.response?.data?.message || 'Error al iniciar el pago. Reintentá.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e8effe] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#6b7ba0]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#0C4AB5]/20 border-t-[#0C4AB5]" />
          <p className="text-sm">Cargando...</p>
        </div>
      </div>
    )
  }

  const selectedNgoData = ngos.find(n => n.slug === selectedNgo)

  return (
    <div className="min-h-screen bg-[#e8effe] text-[#1a2340] flex flex-col">
      <header className="bg-[#0C4AB5] text-white p-6 shadow-md flex justify-center items-center relative">
        <Link to="/" className="absolute left-4 text-white/70 hover:text-white transition-colors text-sm font-medium">← Volver</Link>
        <h1 className="text-2xl font-bold tracking-wide">DonaFácil Play</h1>
      </header>

      <main className="flex-1 container mx-auto p-4 sm:p-6 max-w-lg">
        <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          <div className="text-center">
            <span className="text-5xl">🎰</span>
            <h2 className="text-2xl font-bold mt-2">¡Girá la ruleta!</h2>
            <p className="text-[#6b7ba0] text-sm mt-1">
              Doná a una ONG y ganá tiros en la ruleta de premios.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de ONG */}
            <div>
              <label className="block text-sm font-bold text-[#1a2340] mb-1">
                Organización
              </label>
              <select
                value={selectedNgo}
                onChange={e => setSelectedNgo(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#0C4AB5] focus:border-[#0C4AB5] outline-none text-[#1a2340]"
                required
              >
                {ngos.map(ngo => (
                  <option key={ngo.id} value={ngo.slug}>
                    {ngo.name}
                  </option>
                ))}
              </select>
              {selectedNgoData?.avatar && (
                <img
                  src={selectedNgoData.avatar}
                  alt={selectedNgoData.name}
                  className="mt-2 w-12 h-12 rounded-lg object-cover border border-gray-200"
                />
              )}
            </div>

            {/* Selector de opción */}
            <div>
              <label className="block text-sm font-bold text-[#1a2340] mb-2">
                Elegí tu opción
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedOption(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedOption === i
                        ? 'border-[#0C4AB5] bg-blue-50 text-[#0C4AB5] font-bold'
                        : 'border-gray-200 hover:border-[#0C4AB5]/50 text-[#1a2340]'
                    }`}
                  >
                    <span className="text-lg">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-200" />

            {/* Datos personales */}
            <h3 className="font-bold text-[#1a2340]">Datos personales</h3>

            <input
              className="df-input"
              placeholder="Nombre"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              required
            />
            <input
              className="df-input"
              placeholder="Apellido"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              maxLength={100}
              required
            />
            <input
              className="df-input"
              placeholder="Celular (09XXXXXXX)"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              maxLength={9}
              inputMode="numeric"
              required
            />
            <input
              className="df-input"
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              maxLength={100}
              required
            />
            <input
              className="df-input"
              placeholder="Cédula (sin puntos ni guiones)"
              value={docNumber}
              onChange={e => setDocNumber(e.target.value)}
              maxLength={8}
              inputMode="numeric"
              required
            />

            <div className="bg-blue-50 rounded-xl p-3 text-sm text-[#6b7ba0]">
              📋 Serás redirigido a la pasarela de pago para completar los datos de tu
              tarjeta de forma segura.
            </div>

            <button
              type="submit"
              disabled={submitting || options.length === 0}
              className="w-full bg-[#0C4AB5] text-white font-bold py-4 px-6 rounded-xl hover:bg-[#083790] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {submitting
                ? 'Procesando...'
                : `Pagar con tarjeta — $${options[selectedOption]?.amount || '...'}`}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
