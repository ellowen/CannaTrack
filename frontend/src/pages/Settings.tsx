import { useState } from 'react'
import { useUserStore } from '@/store/userStore'
import { Button, Card, Badge } from '@/components/ui'

export default function Settings() {
  const { name, plan, potVolumeLiters, setName, setPotVolume } = useUserStore()
  const [nameInput, setNameInput] = useState(name)
  const [volumeInput, setVolumeInput] = useState(potVolumeLiters)
  const [saved, setSaved] = useState(false)

  const fieldClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200'

  function handleSave() {
    setName(nameInput.trim() || 'Cultivador')
    setPotVolume(Number(volumeInput) || 11)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Ajustes</h1>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Plan actual</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {plan === 'free' ? 'Gratis — hasta 1 planta activa' : 'Pro — plantas ilimitadas'}
            </p>
          </div>
          <Badge variant={plan === 'pro' ? 'amber' : 'gray'}>
            {plan === 'free' ? 'Free' : 'Pro'}
          </Badge>
        </div>
        {plan === 'free' && (
          <button
            className="mt-3 w-full py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
            onClick={() =>
              alert('Próximamente — Plan Pro disponible en la versión comercial')
            }
          >
            Actualizar a Pro
          </button>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Perfil</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Volumen de maceta por defecto (litros)
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={volumeInput}
              onChange={(e) => setVolumeInput(Number(e.target.value))}
              className={fieldClass}
            />
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          onClick={handleSave}
          variant={saved ? 'secondary' : 'primary'}
        >
          {saved ? 'Guardado' : 'Guardar cambios'}
        </Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acerca de</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex justify-between">
            <span>Versión</span>
            <span>0.1.0 — Etapa 1</span>
          </div>
          <div className="flex justify-between">
            <span>Tabla nutricional</span>
            <span>REVEGETAR v1</span>
          </div>
          <div className="flex justify-between">
            <span>Datos</span>
            <span>Almacenados localmente</span>
          </div>
        </div>
      </Card>
    </div>
  )
}
