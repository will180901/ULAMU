/**
 * B3 · Sécurité du compte — photo, adresse, mot de passe, double authentification, codes de secours.
 *
 * Quatre des cinq blocs n'avaient AUCUN endpoint le 23/08/2026. Ils en ont un depuis, ajoutés à M01
 * dans le même palier (§9 du plan) : sans cela, cet écran aurait affiché quatre boutons morts.
 *
 * Deux écarts à la maquette, tous deux tracés au §9 :
 *  • Elle affiche la règle « différent des 3 derniers mots de passe ». Aucun historique n'existe en
 *    base, et en créer un signifie conserver des empreintes de mots de passe abandonnés. La règle
 *    appliquée — et affichée — est « différent du mot de passe actuel », qui est vraie et vérifiée.
 *  • Elle ne prévoit aucun bloc pour l'adresse email. Il en faut un : l'adresse est le canal de
 *    récupération, et les comptes créés par le seed n'en ont pas.
 */
import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AtSign, Camera, KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avis, Carte, Critere, Reglage } from '@/components/ulamu/parts'
import { api, ApiError, urlAvatar, type MeResponse } from '@/lib/api'

const dateFr = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null

const messageDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Une erreur est survenue. Réessayez dans un moment.')

/** Initiales — le repli quand il n'y a pas de photo, jamais un avatar générique anonyme. */
function initiales(me: MeResponse): string {
  const a = (me.firstName ?? '').trim()[0] ?? ''
  const b = (me.lastName ?? '').trim()[0] ?? ''
  return (a + b).toUpperCase() || (me.username ?? '?').slice(0, 2).toUpperCase()
}

// ── Photo de profil ─────────────────────────────────────────────────────────

function BlocPhoto({ me, rafraichir }: { me: MeResponse; rafraichir: (m: MeResponse) => void }) {
  const champ = useRef<HTMLInputElement>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = useMutation({
    mutationFn: (f: File) =>
      new Promise<MeResponse>((resolve, reject) => {
        const lecteur = new FileReader()
        lecteur.onerror = () => reject(new Error('Fichier illisible'))
        lecteur.onload = () => {
          // L'API attend le base64 SEUL ; le préfixe `data:` du navigateur ferait échouer le décodage.
          const brut = String(lecteur.result)
          resolve(api.setAvatar({ imageBase64: brut.slice(brut.indexOf(',') + 1), mime: f.type }))
        }
        lecteur.readAsDataURL(f)
      }),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })
  const retirer = useMutation({
    mutationFn: () => api.removeAvatar(),
    onSuccess: rafraichir,
    onError: (e) => setErreur(messageDe(e)),
  })

  const choisir = (f: File | undefined) => {
    setErreur(null)
    if (!f) return
    // Refusé ici plutôt que par un 400 après un aller-retour : sur une connexion de Brazzaville,
    // téléverser 5 Mo pour se voir répondre « trop lourd » est une minute perdue pour rien.
    if (f.size > 2 * 1024 * 1024) {
      setErreur('Image trop lourde : 2 Mo maximum.')
      return
    }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)) {
      setErreur('Format accepté : JPEG, PNG ou WebP.')
      return
    }
    envoyer.mutate(f)
  }

  if (me.accountType === 'ADMIN') {
    return (
      <Carte icone={Camera} titre="Photo de profil" sousTitre="Réservée aux comptes qui apparaissent devant un patient">
        <Avis ton="info">Un compte d'administration n'a pas de vitrine publique : aucune photo n'y est associée.</Avis>
      </Carte>
    )
  }

  return (
    <Carte icone={Camera} titre="Photo de profil" sousTitre="Visible par les patients sur votre vitrine publique">
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[var(--ap-50)] font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ap-600)]">
          {me.avatarKey ? (
            <img src={urlAvatar(me.avatarKey)} alt="Votre photo de profil" className="size-full object-cover" />
          ) : (
            <span aria-hidden="true">{initiales(me)}</span>
          )}
        </span>
        <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">
          <p className="text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">JPEG, PNG ou WebP · 2 Mo maximum.</p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={champ}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => choisir(e.target.files?.[0])}
            />
            <Button type="button" size="sm" onClick={() => champ.current?.click()} disabled={envoyer.isPending}>
              {envoyer.isPending ? 'Envoi…' : 'Téléverser une photo'}
            </Button>
            {me.avatarKey ? (
              <Button type="button" size="sm" variant="outline" onClick={() => retirer.mutate()} disabled={retirer.isPending}>
                Retirer
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </Carte>
  )
}

// ── Adresse email ───────────────────────────────────────────────────────────

/**
 * ⚠️ Bloc ABSENT de la maquette, ajouté délibérément (§9 du plan).
 *
 * L'adresse email est le canal de récupération : c'est par elle qu'arrive le code de « mot de passe
 * oublié » et celui de la clôture. Un compte sans adresse — tous ceux créés par le seed — n'a aucun
 * moyen de revenir en cas de perte.
 *
 * Deux codes sont exigés dès qu'une adresse existe déjà : sans preuve sur l'ancienne, une session
 * volée suffirait à détourner le canal, puis à réinitialiser le mot de passe en toute apparence de
 * légalité.
 */
function BlocEmail({ me, rafraichir }: { me: MeResponse; rafraichir: (m: MeResponse) => void }) {
  const [etape, setEtape] = useState<'repos' | 'codes'>('repos')
  const [adresse, setAdresse] = useState('')
  const [codeNouvelle, setCodeNouvelle] = useState('')
  const [codeAncienne, setCodeAncienne] = useState('')
  const [indice, setIndice] = useState<{ deuxCodes: boolean; ancienne: string | null } | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  const demarrer = useMutation({
    mutationFn: () => api.startEmailChange({ newEmail: adresse.trim() }),
    onSuccess: (r) => {
      setIndice({ deuxCodes: r.requiresOldEmailCode, ancienne: r.oldEmailHint })
      setEtape('codes')
      setErreur(null)
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const confirmer = useMutation({
    mutationFn: () =>
      api.confirmEmailChange({
        newEmail: adresse.trim(),
        newEmailCode: codeNouvelle.trim(),
        ...(indice?.deuxCodes ? { oldEmailCode: codeAncienne.trim() } : {}),
      }),
    onSuccess: async () => {
      setFait(true)
      setEtape('repos')
      setAdresse('')
      setCodeNouvelle('')
      setCodeAncienne('')
      rafraichir(await api.me())
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  return (
    <Carte
      icone={AtSign}
      titre="Adresse email"
      sousTitre={
        me.email ? 'Le canal par lequel vous récupérez votre compte' : 'Aucune adresse — ce compte ne pourrait pas être récupéré'
      }
    >
      {me.email ? (
        <p className="text-[13px] font-medium text-foreground">{me.email}</p>
      ) : (
        <Avis ton="erreur">
          Ce compte n'a pas d'adresse email. En cas de mot de passe oublié, aucun code ne pourrait vous être envoyé.
        </Avis>
      )}

      {etape === 'repos' ? (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 basis-64">
              <Label htmlFor="nouvelle-adresse" className="mb-1.5 block text-[13px]">
                {me.email ? 'Nouvelle adresse' : 'Adresse à ajouter'}
              </Label>
              <Input
                id="nouvelle-adresse"
                type="email"
                autoComplete="email"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="vous@exemple.cg"
              />
            </div>
            <Button
              type="button"
              onClick={() => {
                setErreur(null)
                setFait(false)
                demarrer.mutate()
              }}
              disabled={!adresse.includes('@') || demarrer.isPending}
            >
              {demarrer.isPending ? 'Envoi…' : 'Envoyer un code'}
            </Button>
          </div>
          {fait ? <Avis ton="succes">Adresse enregistrée.</Avis> : null}
        </>
      ) : (
        <>
          <Avis ton="info">
            {indice?.deuxCodes
              ? `Deux codes ont été envoyés : un à ${adresse}, un à ${indice.ancienne}. Les deux sont nécessaires — c'est ce qui empêche qu'on détourne votre canal de récupération à votre insu.`
              : `Un code a été envoyé à ${adresse}.`}
          </Avis>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-0 flex-1 basis-40">
              <Label htmlFor="code-nouvelle" className="mb-1.5 block text-[13px]">
                Code reçu à la nouvelle adresse
              </Label>
              <Input
                id="code-nouvelle"
                inputMode="numeric"
                maxLength={6}
                value={codeNouvelle}
                onChange={(e) => setCodeNouvelle(e.target.value)}
              />
            </div>
            {indice?.deuxCodes ? (
              <div className="min-w-0 flex-1 basis-40">
                <Label htmlFor="code-ancienne" className="mb-1.5 block text-[13px]">
                  Code reçu à l'ancienne
                </Label>
                <Input
                  id="code-ancienne"
                  inputMode="numeric"
                  maxLength={6}
                  value={codeAncienne}
                  onChange={(e) => setCodeAncienne(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={() => confirmer.mutate()} disabled={confirmer.isPending || codeNouvelle.length !== 6}>
              {confirmer.isPending ? 'Vérification…' : "Valider l'adresse"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEtape('repos')
                setErreur(null)
              }}
            >
              Annuler
            </Button>
          </div>
        </>
      )}
      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </Carte>
  )
}

// ── Mot de passe ────────────────────────────────────────────────────────────

function BlocMotDePasse() {
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [resultat, setResultat] = useState<number | null>(null)

  // La troisième règle de la maquette — « différent des 3 derniers » — n'a aucun stockage en base.
  // Celle-ci est vraie, et le serveur la vérifie aussi (§9 du plan).
  const regles = [
    { label: '8 caractères minimum', ok: nouveau.length >= 8 },
    { label: 'Au moins une lettre et un chiffre', ok: /[a-zA-Z]/.test(nouveau) && /[0-9]/.test(nouveau) },
    { label: 'Différent du mot de passe actuel', ok: nouveau.length > 0 && nouveau !== actuel },
  ]
  const pret = actuel.length > 0 && regles.every((r) => r.ok)

  const changer = useMutation({
    mutationFn: () => api.changePassword({ currentPassword: actuel, newPassword: nouveau }),
    onSuccess: (r) => {
      setResultat(r.otherSessionsClosed)
      setErreur(null)
      setActuel('')
      setNouveau('')
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  return (
    <Carte icone={Lock} titre="Mot de passe" sousTitre="Les autres appareils seront déconnectés — celui-ci reste ouvert">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          setResultat(null)
          changer.mutate()
        }}
      >
        <div className="flex flex-wrap gap-3">
          <div className="min-w-0 flex-1 basis-52">
            <Label htmlFor="mdp-actuel" className="mb-1.5 block text-[13px]">
              Mot de passe actuel
            </Label>
            <Input
              id="mdp-actuel"
              type="password"
              autoComplete="current-password"
              value={actuel}
              onChange={(e) => setActuel(e.target.value)}
            />
          </div>
          <div className="min-w-0 flex-1 basis-52">
            <Label htmlFor="mdp-nouveau" className="mb-1.5 block text-[13px]">
              Nouveau mot de passe
            </Label>
            <Input
              id="mdp-nouveau"
              type="password"
              autoComplete="new-password"
              value={nouveau}
              onChange={(e) => setNouveau(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {regles.map((r) => (
            <Critere key={r.label} ok={r.ok} label={r.label} />
          ))}
        </div>
        <div>
          <Button type="submit" disabled={!pret || changer.isPending}>
            {changer.isPending ? 'Enregistrement…' : 'Changer le mot de passe'}
          </Button>
        </div>
      </form>
      {resultat !== null ? (
        <Avis ton="succes">
          Mot de passe changé.{' '}
          {resultat > 0
            ? `${resultat} autre${resultat > 1 ? 's' : ''} appareil${resultat > 1 ? 's ont' : ' a'} été déconnecté${resultat > 1 ? 's' : ''}.`
            : 'Aucun autre appareil n’était connecté.'}
        </Avis>
      ) : null}
      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </Carte>
  )
}

// ── Double authentification et codes de secours ─────────────────────────────

/**
 * Un même formulaire sert la ré-association de l'appareil et la régénération des codes : les deux
 * exigent le mot de passe plus un facteur, et le second accepte un code de secours — c'est justement
 * quand le téléphone est perdu qu'on répare.
 */
function BlocDeuxFacteurs({ me, rafraichir }: { me: MeResponse; rafraichir: (m: MeResponse) => void }) {
  const [ouvert, setOuvert] = useState<'aucun' | 'reset' | 'codes'>('aucun')
  const [motDePasse, setMotDePasse] = useState('')
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [nouveauxCodes, setNouveauxCodes] = useState<string[] | null>(null)
  const [copie, setCopie] = useState(false)
  const navigate = useNavigate()

  const fermer = () => {
    setOuvert('aucun')
    setMotDePasse('')
    setCode('')
    setErreur(null)
  }

  const regenerer = useMutation({
    mutationFn: () => api.regenerateBackupCodes({ password: motDePasse, code: code.trim() }),
    onSuccess: async (r) => {
      setNouveauxCodes(r.backupCodes)
      fermer()
      rafraichir(await api.me())
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  /**
   * La ré-association désarme le second facteur côté serveur ; l'écran A4 « Configuration 2FA » sait
   * déjà présenter un QR et enchaîner sur la confirmation, et son `setupTotp` fonctionne de nouveau
   * puisque le TOTP n'est plus actif. On l'y envoie plutôt que de reconstruire le même écran ici.
   *
   * Le secret renvoyé par `resetTotp` n'est donc pas utilisé côté web : A4 en demandera un neuf. Il
   * sert aux clients qui n'ont pas d'écran de configuration séparé — le mobile.
   */
  const reassocier = useMutation({
    mutationFn: () => api.resetTotp({ password: motDePasse, code: code.trim() }),
    onSuccess: async () => {
      rafraichir(await api.me())
      navigate('/configuration-totp')
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const enCours = regenerer.isPending || reassocier.isPending
  const restants = me.backupCodesRemaining
  const bas = me.totpEnabled && restants <= 3

  return (
    <>
      <Carte icone={ShieldCheck} titre="Double authentification" sousTitre="Obligatoire sur ULAMU — elle ne peut pas être désactivée">
        <Reglage
          titre={me.totpEnabled ? 'Active' : 'Non configurée'}
          aide={
            me.totpEnabled
              ? `Activée le ${dateFr(me.totpEnabledAt) ?? 'une date inconnue'}`
              : 'Votre compte est protégé par le mot de passe seul'
          }
        >
          {me.totpEnabled ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setOuvert(ouvert === 'reset' ? 'aucun' : 'reset')}>
              Reconfigurer l'appareil
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => navigate('/configuration-totp')}>
              Configurer
            </Button>
          )}
        </Reglage>

        {ouvert === 'reset' ? (
          <Formulaire
            titre="Ré-associer un appareil"
            explication="Votre compte n'aura plus de second facteur entre cette étape et le nouveau scan. Vos codes de secours actuels seront détruits."
            motDePasse={motDePasse}
            setMotDePasse={setMotDePasse}
            code={code}
            setCode={setCode}
            enCours={enCours}
            libelle="Continuer"
            onValider={() => reassocier.mutate()}
            onAnnuler={fermer}
          />
        ) : null}
      </Carte>

      <Carte icone={KeyRound} titre="Codes de secours" sousTitre="Ils ouvrent votre compte quand l'appareil n'est plus là">
        {!me.totpEnabled ? (
          <Avis ton="info">Les codes de secours n'existent qu'avec la double authentification.</Avis>
        ) : (
          <>
            <Reglage
              titre={`${restants} code${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''} sur ${me.backupCodesTotal}`}
              aide={dateFr(me.backupCodesGeneratedAt) ? `Générés le ${dateFr(me.backupCodesGeneratedAt)}` : undefined}
            >
              <Button type="button" size="sm" variant="outline" onClick={() => setOuvert(ouvert === 'codes' ? 'aucun' : 'codes')}>
                Régénérer les codes
              </Button>
            </Reglage>
            {bas ? (
              <Avis ton="erreur">
                Il vous en reste {restants}. À zéro, un téléphone perdu vous enfermerait dehors — régénérez-les maintenant.
              </Avis>
            ) : null}
            {ouvert === 'codes' ? (
              <Formulaire
                titre="Nouveau lot de codes"
                explication="Les dix codes actuels cesseront de fonctionner immédiatement, y compris ceux que vous auriez notés."
                motDePasse={motDePasse}
                setMotDePasse={setMotDePasse}
                code={code}
                setCode={setCode}
                enCours={enCours}
                libelle="Régénérer"
                onValider={() => regenerer.mutate()}
                onAnnuler={fermer}
              />
            ) : null}
          </>
        )}

        {nouveauxCodes ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary p-3">
            <p className="text-[12px] font-medium text-foreground">
              Notez-les maintenant : ils ne seront plus jamais affichés.
            </p>
            <ul className="grid grid-cols-2 gap-1 font-mono text-[13px] text-foreground sm:grid-cols-5">
              {nouveauxCodes.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(nouveauxCodes.join('\n')).then(() => setCopie(true))
                }}
              >
                {copie ? 'Copié' : 'Copier dans le presse-papier'}
              </Button>
            </div>
          </div>
        ) : null}
      </Carte>

      {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </>
  )
}

/** Mot de passe + facteur — la preuve exigée par les deux gestes ci-dessus. */
function Formulaire({
  titre,
  explication,
  motDePasse,
  setMotDePasse,
  code,
  setCode,
  enCours,
  libelle,
  onValider,
  onAnnuler,
}: {
  titre: string
  explication: string
  motDePasse: string
  setMotDePasse: (v: string) => void
  code: string
  setCode: (v: string) => void
  enCours: boolean
  libelle: string
  onValider: () => void
  onAnnuler: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-secondary p-3">
      <div>
        <p className="text-[13px] font-medium text-foreground">{titre}</p>
        <p className="mt-0.5 text-[11px] leading-[1.45] text-[var(--texte-tertiaire)]">{explication}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <Label htmlFor="preuve-mdp" className="mb-1.5 block text-[13px]">
            Mot de passe
          </Label>
          <Input
            id="preuve-mdp"
            type="password"
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <Label htmlFor="preuve-code" className="mb-1.5 block text-[13px]">
            Code de l'application, ou code de secours
          </Label>
          <Input id="preuve-code" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={onValider} disabled={enCours || motDePasse.length === 0 || code.trim().length < 6}>
          {enCours ? 'Vérification…' : libelle}
        </Button>
        <Button type="button" variant="ghost" onClick={onAnnuler}>
          Annuler
        </Button>
      </div>
    </div>
  )
}

// ── Section ─────────────────────────────────────────────────────────────────

export function SectionSecurite({ me, rafraichir }: { me: MeResponse; rafraichir: (m: MeResponse) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <BlocEmail me={me} rafraichir={rafraichir} />
      <BlocMotDePasse />
      <BlocDeuxFacteurs me={me} rafraichir={rafraichir} />
      <BlocPhoto me={me} rafraichir={rafraichir} />
    </div>
  )
}
