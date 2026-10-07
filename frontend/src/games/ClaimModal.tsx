import Swal from 'sweetalert2'
import { claimPrizes } from '../api/playApi'
import type { PlayGameShot } from '../api/playApi'

export async function showClaimModal(
  code: string,
  shots: PlayGameShot[],
  onSuccess: () => void
) {
  const prizesList = shots.length > 0
    ? shots
        .map((s) => `🎁 Tiro ${s.shot_number}: ${s.award_title}`)
        .join('<br>')
    : '<p class="text-white/50">No se registraron premios.</p>'

  const result = await Swal.fire({
    title: '¡Completaste tus tiros!',
    html: `
      <div class="text-left mb-4 text-sm space-y-1" style="color:#ccc">
        <p class="font-bold text-yellow-400 mb-2">Tus premios:</p>
        ${prizesList}
      </div>
      <p class="text-sm mb-3" style="color:#aaa">Para retirarlos, completá tus datos:</p>
      <input id="swal-name" class="swal2-input" placeholder="Nombre" maxlength="100" autocomplete="given-name">
      <input id="swal-lastname" class="swal2-input" placeholder="Apellido" maxlength="100" autocomplete="family-name">
      <input id="swal-phone" class="swal2-input" placeholder="Celular (09XXXXXXX)" maxlength="9" inputmode="numeric" autocomplete="tel">
      <input id="swal-email" class="swal2-input" placeholder="Email" type="email" autocomplete="email">
      <input id="swal-doc" class="swal2-input" placeholder="Cédula (sin puntos ni guiones)" maxlength="8" inputmode="numeric">
    `,
    showCancelButton: false,
    confirmButtonText: 'Reclamar premios',
    confirmButtonColor: '#eab308',
    allowOutsideClick: false,
    customClass: {
      popup: 'rounded-2xl',
      input: 'swal2-input',
    },
    preConfirm: () => {
      const name = (document.getElementById('swal-name') as HTMLInputElement)?.value?.trim()
      const last_name = (document.getElementById('swal-lastname') as HTMLInputElement)?.value?.trim()
      const phone = (document.getElementById('swal-phone') as HTMLInputElement)?.value?.trim()
      const email = (document.getElementById('swal-email') as HTMLInputElement)?.value?.trim()
      const doc_number = (document.getElementById('swal-doc') as HTMLInputElement)?.value?.trim()

      if (!name || !last_name || !phone || !email || !doc_number) {
        Swal.showValidationMessage('Todos los campos son obligatorios')
        return false
      }
      if (!/^\d{9}$/.test(phone)) {
        Swal.showValidationMessage('Celular: 9 dígitos (ej: 091234567)')
        return false
      }
      if (!/^\d{7,8}$/.test(doc_number)) {
        Swal.showValidationMessage('Cédula: 7 u 8 dígitos')
        return false
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        Swal.showValidationMessage('Email inválido')
        return false
      }

      return { name, last_name, phone, email, doc_number }
    },
  })

  if (result.isConfirmed && result.value) {
    try {
      await claimPrizes({ code, ...result.value })

      await Swal.fire({
        icon: 'success',
        title: '¡Datos guardados!',
        text: 'Tus premios fueron registrados correctamente.',
        confirmButtonColor: '#eab308',
        customClass: { popup: 'rounded-2xl' },
      })

      onSuccess()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'No se pudo completar el registro.',
        confirmButtonColor: '#eab308',
        customClass: { popup: 'rounded-2xl' },
      })
    }
  }
}
