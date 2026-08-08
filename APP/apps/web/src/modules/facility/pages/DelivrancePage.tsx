/**
 * Délivrance d'ordonnance — M09, CU-09-02. La pièce qui referme le parcours médicament.
 *
 * Le patient présente le QR de son ordonnance ; la pharmacie le vérifie, puis sert tout ou partie
 * des lignes. Sans cet écran, une ordonnance scellée par un soignant ne pouvait être servie **nulle
 * part** : le parcours s'arrêtait au moment précis où il devenait utile.
 *
 * Deux principes, tous deux tranchés par le SERVEUR et jamais recalculés ici :
 *  • **`dispensable`** tient compte de l'expiration selon l'horloge serveur (RM-09-02). Une
 *    ordonnance périmée depuis dix minutes ne doit pas être servie parce que le poste de l'officine
 *    retarde.
 *  • **`remaining`** — une ordonnance se délivre en PLUSIEURS fois (EF-09-07). Le champ est
 *    pré-rempli avec le restant, mais reste modifiable : c'est la réalité d'une pharmacie qui n'a
 *    que la moitié de la boîte.
 *
 * Pas de caméra : la saisie du code est manuelle. Un lecteur de code-barres de comptoir se comporte
 * comme un clavier et remplit ce champ tout seul — exiger une caméra aurait exclu les postes fixes.
 */
import { useState } from 'react'
import { QrCode, ScanLine } from 'lucide-react'
import { PageHeader } from '@/components/ulamu/PageHeader'
import { Button } from '@/components/ulamu/Button'
import { Field } from '@/components/ulamu/Field'
import { StatusPill } from '@/components/ulamu/StatusPill'
import { api, ApiError, type ScannedPrescription } from '@/lib/api'

export function DelivrancePage() {
  const [facilityId, setFacilityId] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [ord, setOrd] = useState<ScannedPrescription | null>(null)
  const [quantites, setQuantites] = useState<Record<string, string>>({})
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [servie, setServie] = useState(false)

  const scanner = async () => {
    setErreur(null)
    setServie(false)
    setOccupe(true)
    try {
      const f = facilityId ?? (await api.myFacility())?.id ?? null
      if (!f) {
        setErreur('Aucune pharmacie rattachée à votre compte.')
        return
      }
      setFacilityId(f)
      const r = await api.scanPrescription(token.trim(), f)
      setOrd(r)
      // Pré-remplissage au RESTANT : le cas courant est de tout servir, et retaper les quantités à
      // chaque fois ferait perdre du temps au comptoir pour rien.
      setQuantites(Object.fromEntries(r.lines.map((l) => [l.id, String(l.remaining ?? 0)])))
    } catch (e) {
      setOrd(null)
      setErreur(e instanceof ApiError ? e.message : 'Code non reconnu — vérifiez la saisie.')
    } finally {
      setOccupe(false)
    }
  }

  const delivrer = async () => {
    if (!ord || !facilityId) return
    setErreur(null)
    setOccupe(true)
    try {
      await api.dispense(token.trim(), {
        facilityId,
        lines: ord.lines
          .map((l) => ({ prescriptionLineId: l.id, quantity: Number(quantites[l.id] ?? 0) }))
          .filter((l) => l.quantity > 0),
      })
      setServie(true)
      setOrd(null)
      setToken('')
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'Délivrance impossible — réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  const aServir = ord?.lines.filter((l) => Number(quantites[l.id] ?? 0) > 0).length ?? 0

  return (
    <div>
      <PageHeader
        icon={<QrCode size={20} />}
        title="Délivrance"
        subtitle="Scannez ou saisissez le code de l’ordonnance présentée par le patient."
      />

      <section className="ul-card" aria-labelledby="scan-titre">
        <div className="ul-card__head">
          <h2 id="scan-titre" className="t-display-sm" style={{ margin: 0 }}>
            Ordonnance
          </h2>
        </div>

        {servie ? (
          <div className="ul-notice" role="status">
            <p className="t-text-sm" style={{ margin: 0 }}>
              Délivrance enregistrée. Le stock a été décrémenté et le patient en est informé.
            </p>
          </div>
        ) : null}

        <Field
          label="Code de l’ordonnance"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          onKeyDown={(e) => {
            // Un lecteur de code-barres de comptoir « tape » le code puis envoie Entrée : la
            // vérification doit donc partir sur Entrée, sans clic.
            if (e.key === 'Enter') {
              e.preventDefault()
              scanner()
            }
          }}
          hint="Un lecteur de code-barres remplit ce champ automatiquement."
          autoFocus
        />

        <div>
          <Button onClick={scanner} loading={occupe} disabled={occupe || token.trim().length === 0}>
            <ScanLine size={15} /> Vérifier
          </Button>
        </div>

        {erreur ? (
          <p className="t-text-sm" role="alert" style={{ color: 'var(--erreur-texte)', margin: 0 }}>
            {erreur}
          </p>
        ) : null}
      </section>

      {ord ? (
        <section className="ul-card" aria-labelledby="lignes-titre">
          <div className="ul-card__head">
            <h2 id="lignes-titre" className="t-display-sm" style={{ margin: 0 }}>
              À délivrer
            </h2>
            {/* Le verdict vient du serveur, avec SON horloge : une ordonnance périmée depuis dix
                minutes ne doit pas passer parce que le poste de l'officine retarde. */}
            <StatusPill tone={ord.dispensable ? 'success' : 'error'}>
              {ord.dispensable ? 'Valide' : 'Non délivrable'}
            </StatusPill>
          </div>

          {!ord.dispensable ? (
            <div className="ul-notice ul-notice--warning" role="alert">
              <p className="t-text-sm" style={{ margin: 0 }}>
                Cette ordonnance ne peut pas être servie — statut « {ord.status} », expiration le{' '}
                {new Date(ord.expiresAt).toLocaleDateString('fr-FR')}. Invitez le patient à revenir vers son
                soignant.
              </p>
            </div>
          ) : null}

          <ul className="ul-doclist">
            {ord.lines.map((l) => {
              const restant = l.remaining ?? 0
              const saisie = Number(quantites[l.id] ?? 0)
              return (
                <li className="ul-docrow ul-docrow--bloc" key={l.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--espace-3)', width: '100%' }}>
                    <span className="ul-docrow__label">
                      {l.freeText ?? 'Médicament du référentiel'}
                      <span className="t-caption" style={{ display: 'block', color: 'var(--texte-tertiaire)', fontWeight: 400 }}>
                        {l.posology}
                      </span>
                    </span>
                    {/* EF-09-07 : une ordonnance se délivre en plusieurs fois. Montrer ce qui a DÉJÀ
                        été servi évite de servir deux fois la même boîte. */}
                    <StatusPill tone={restant > 0 ? 'neutral' : 'success'}>
                      {l.qtyDispensed > 0 ? `${l.qtyDispensed} déjà servi · ` : ''}
                      {restant > 0 ? `${restant} restant` : 'complet'}
                    </StatusPill>
                  </div>

                  {ord.dispensable && restant > 0 ? (
                    <Field
                      label="Quantité à délivrer"
                      value={quantites[l.id] ?? ''}
                      onChange={(e) => setQuantites((q) => ({ ...q, [l.id]: e.target.value.replace(/\D/g, '') }))}
                      inputMode="numeric"
                      error={saisie > restant ? `Il ne reste que ${restant} à servir` : undefined}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>

          {ord.dispensable ? (
            <div>
              <Button
                onClick={delivrer}
                loading={occupe}
                disabled={
                  occupe ||
                  aServir === 0 ||
                  ord.lines.some((l) => Number(quantites[l.id] ?? 0) > (l.remaining ?? 0))
                }
              >
                Délivrer {aServir} ligne{aServir > 1 ? 's' : ''}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
