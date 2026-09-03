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
import { AtSign, Camera, KeyRound, Lock, MailCheck, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DecompteTotp } from '@/components/ulamu/DecompteTotp'
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
  const [ouvert, setOuvert] = useState<'aucun' | 'reset' | 'codes' | 'desactiver'>('aucun')
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

  /**
   * Désactiver le second facteur (D-053, 02/09/2026).
   *
   * Le serveur exposait cette route depuis toujours ; **aucun écran ne l'appelait**. Un utilisateur
   * qui avait activé sa double authentification ne pouvait plus la retirer depuis l'application.
   *
   * Mot de passe ET code : désactiver un second facteur est exactement le geste qu'un voleur de
   * session voudrait faire. C'est le serveur qui l'exige, l'écran ne fait que le refléter.
   */
  const desactiver = useMutation({
    mutationFn: () => api.disableTotp({ password: motDePasse, code: code.trim() }),
    onSuccess: async () => {
      fermer()
      rafraichir(await api.me())
    },
    onError: (e) => setErreur(messageDe(e)),
  })

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

  const enCours = regenerer.isPending || reassocier.isPending || desactiver.isPending
  const restants = me.backupCodesRemaining
  const bas = me.totpEnabled && restants <= 3

  return (
    <>
      {/*
        ── Ce que cette carte a dit, et pourquoi elle le dit autrement (24 puis 31, 02/09/2026) ──

        Elle annonçait à tout le monde « Obligatoire sur ULAMU — elle ne peut pas être désactivée ».
        C'était faux pour un soignant (le serveur acceptait la désactivation, le cahier la donnait
        pour optionnelle) et vrai pour un administrateur (`disableTotp` répondait 403, et la garde
        d'administration refusait toute lecture sans second facteur).

        Le chantier 24 avait donc coupé la phrase en deux, une par type de compte.

        **Le chantier 31 supprime la distinction, sur décision du porteur (D-053) : le TOTP est
        optionnel pour TOUS les types de compte, désactivé par défaut, et chacun l'active ou le
        désactive comme il l'entend.** Les deux gardes serveur sont retirées.

        Reste une phrase unique, et elle ne prescrit rien : elle dit ce que le second facteur
        APPORTE. C'est la seule forme qui ne peut pas devenir fausse — une recommandation n'engage
        que celui qui l'écrit, une obligation engage un serveur qui doit la faire respecter.
      */}
      <Carte
        icone={ShieldCheck}
        titre="Double authentification"
        sousTitre="Fortement recommandée — le mot de passe seul ne protège pas un dossier de santé"
      >
        <Reglage
          titre={me.totpEnabled ? 'Active' : 'Non configurée'}
          aide={
            me.totpEnabled
              ? `Activée le ${dateFr(me.totpEnabledAt) ?? 'une date inconnue'}`
              : 'Votre compte est protégé par le mot de passe seul'
          }
        >
          {me.totpEnabled ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setOuvert(ouvert === 'reset' ? 'aucun' : 'reset')}>
                Reconfigurer l'appareil
              </Button>
              {/*
                « Désactiver » est en `ghost` et à droite : il est offert sans être proposé. Le
                geste est légitime (D-053) et doit exister — mais il retire une protection, et rien
                ne justifie de l'inviter du regard.
              */}
              <Button type="button" size="sm" variant="ghost" onClick={() => setOuvert(ouvert === 'desactiver' ? 'aucun' : 'desactiver')}>
                Désactiver
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" onClick={() => navigate('/configuration-totp')}>
              Configurer
            </Button>
          )}
        </Reglage>

        {ouvert === 'desactiver' ? (
          <Formulaire
            titre="Désactiver la double authentification"
            explication="Votre compte ne sera plus protégé que par son mot de passe, et vos codes de secours seront détruits. Vous pourrez la réactiver à tout moment."
            motDePasse={motDePasse}
            setMotDePasse={setMotDePasse}
            code={code}
            setCode={setCode}
            enCours={enCours}
            libelle="Désactiver"
            onValider={() => desactiver.mutate()}
            onAnnuler={fermer}
          />
        ) : null}

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
          {/*
            Le rythme du code (chantier 34). Ce champ accepte AUSSI un code de secours, qui ne tourne
            pas — le décompte ne prétend donc rien sur lui : il annonce quand l'APPLICATION produira
            son prochain code, ce qui reste vrai quel que soit ce qu'on tape ici.
          */}
          <div className="mt-2">
            <DecompteTotp />
          </div>
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


/**
 * La 2FA par EMAIL — injoignable depuis le web jusqu'au 02/09/2026 (chantier 31).
 *
 * ── Ce qui manquait, et ce que ça coûtait ─────────────────────────────────────────────────────
 *
 * Trois routes existaient au serveur — demander un code, activer, désactiver — et **aucune n'était
 * déclarée dans le client web**. Le réglage était donc invisible et inatteignable ici.
 *
 * Le pire n'était pas l'absence du réglage : c'est que la CONNEXION web ne savait pas non plus
 * reconnaître ce facteur. Un compte qui l'activait depuis le mobile puis revenait sur le web voyait
 * son bouton s'arrêter de tourner, sans un mot, sans étape suivante — et sans aucun moyen de
 * désactiver le réglage qui le bloquait, puisqu'il fallait être connecté pour l'atteindre.
 *
 * ── Pourquoi deux facteurs coexistent, et pourquoi on ne les oppose pas ───────────────────────
 *
 * Le TOTP ne dépend d'aucun réseau : il marche même sans couverture. L'email ne demande aucune
 * application à installer. Sur un téléphone d'entrée de gamme partagé, le second est souvent le
 * seul praticable — et à Brazzaville ce n'est pas un cas d'école.
 *
 * L'écran ne pousse donc ni l'un ni l'autre. Il dit ce que chacun apporte, et laisse choisir.
 */
function BlocDeuxFacteursEmail({ me, rafraichir }: { me: MeResponse; rafraichir: (m: MeResponse) => void }) {
  const [etape, setEtape] = useState<'aucune' | 'code' | 'desactiver'>('aucune')
  const [code, setCode] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)

  const fermer = () => {
    setEtape('aucune')
    setCode('')
    setMotDePasse('')
    setErreur(null)
  }

  const demander = useMutation({
    mutationFn: () => api.requestEmailTwoFactorOtp(),
    onSuccess: () => {
      setErreur(null)
      setEtape('code')
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const activer = useMutation({
    mutationFn: () => api.enableEmailTwoFactor(code.trim()),
    onSuccess: async () => {
      fermer()
      rafraichir(await api.me())
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  /* La désactivation ne demande QUE le mot de passe : c'est le serveur qui en décide ainsi, et la
     raison tient — exiger le code du facteur qu'on retire enfermerait dehors qui n'y accède plus,
     ce qui est précisément la situation où l'on veut le retirer. */
  const desactiver = useMutation({
    mutationFn: () => api.disableEmailTwoFactor(motDePasse),
    onSuccess: async () => {
      fermer()
      rafraichir(await api.me())
    },
    onError: (e) => setErreur(messageDe(e)),
  })

  const enCours = demander.isPending || activer.isPending || desactiver.isPending
  const actif = me.emailTwoFactorEnabled

  return (
    <Carte
      icone={MailCheck}
      titre="Code par email à la connexion"
      sousTitre="Une seconde façon de protéger le compte, sans application à installer"
    >
      <Reglage
        titre={actif ? 'Actif' : 'Inactif'}
        aide={
          actif
            ? `Un code part à ${me.email ?? 'l’adresse du compte'} à chaque connexion`
            : "Aucun code n'est demandé — le mot de passe seul ouvre le compte"
        }
      >
        {actif ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEtape(etape === 'desactiver' ? 'aucune' : 'desactiver')}>
            Désactiver
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => demander.mutate()} disabled={enCours || !me.email}>
            {demander.isPending ? 'Envoi…' : 'Activer'}
          </Button>
        )}
      </Reglage>

      {/* Sans adresse au compte, le bouton ne peut rien faire — on le dit plutôt que de le laisser
          inerte : un bouton désactivé sans explication ressemble à une panne. */}
      {!actif && !me.email ? (
        <Avis ton="alerte">
          Ce réglage demande une adresse email au compte. Ajoutez-la dans « Adresse email », juste
          au-dessus.
        </Avis>
      ) : null}

      {etape === 'code' ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary p-3">
          <p className="m-0 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">
            Un code à 6 chiffres vient de partir à {me.email}. Saisissez-le pour confirmer.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold leading-[1.4] text-muted-foreground">Code reçu</span>
            <Input value={code} onChange={(e) => setCode(e.target.value.trim())} maxLength={6} inputMode="numeric" autoComplete="one-time-code" autoFocus />
          </label>
          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => activer.mutate()} disabled={enCours || code.trim().length < 6}>
              {activer.isPending ? 'Vérification…' : 'Confirmer'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={fermer} disabled={enCours}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {etape === 'desactiver' ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-secondary p-3">
          <p className="m-0 text-[12px] leading-[1.5] text-[var(--texte-secondaire)]">
            Plus aucun code ne sera demandé à la connexion. Vous pourrez le réactiver à tout moment.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold leading-[1.4] text-muted-foreground">Mot de passe</span>
            <Input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="current-password" autoFocus />
          </label>
          {erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => desactiver.mutate()} disabled={enCours || motDePasse.length === 0}>
              {desactiver.isPending ? 'Désactivation…' : 'Désactiver'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={fermer} disabled={enCours}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}

      {etape === 'aucune' && erreur ? <Avis ton="erreur">{erreur}</Avis> : null}
    </Carte>
  )
}

// ── Section ─────────────────────────────────────────────────────────────────

export function SectionSecurite({ me, rafraichir }: { me: MeResponse; rafraichir: (m: MeResponse) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <BlocEmail me={me} rafraichir={rafraichir} />
      <BlocMotDePasse />
      <BlocDeuxFacteurs me={me} rafraichir={rafraichir} />
      <BlocDeuxFacteursEmail me={me} rafraichir={rafraichir} />
      <BlocPhoto me={me} rafraichir={rafraichir} />
    </div>
  )
}
