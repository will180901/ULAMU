/**
 * La saisie d'un code à 6 chiffres — chantier 140, 16/09/2026.
 *
 * ── ⚠️ ULAMU le faisait déjà à moitié ─────────────────────────────────────────────────────────
 *
 * La connexion, l'inscription, le mot de passe oublié, l'activation TOTP et le recours affichaient
 * **six cases séparées**. Partout ailleurs — signature du contrat, changement d'adresse, changement
 * de numéro, retrait d'argent, clôture de compte, vérification Mobile Money — le même code se
 * saisissait dans une **boîte de texte ordinaire**.
 *
 * > **Ce n'était pas une nouveauté à inventer : c'était une incohérence à l'intérieur du produit.**
 *
 * Le composant existait (`components/ui/input-otp`), le paquet était installé, et cinq écrans s'en
 * servaient déjà. *Une capacité qui n'est branchée qu'à la moitié des écrans se lit, depuis l'autre
 * moitié, comme une capacité absente.*
 *
 * ── Pourquoi des cases, et pas seulement parce que c'est joli ─────────────────────────────────
 *
 * 📌 Elles **disent combien de chiffres sont attendus** avant qu'on commence à taper. Une boîte vide
 * ne le dit pas, et son intitulé le dit rarement.
 * 📌 Elles **montrent où l'on en est** : on voit d'un coup d'œil qu'il en manque deux.
 * 📌 Elles **recadrent le collage** : un code copié depuis un email arrive souvent avec une espace.
 *
 * ── ⚠️ Ce que ce champ NE fait PAS par défaut : valider tout seul ─────────────────────────────
 *
 * `onComplete` n'est pas posé ici : il se passe écran par écran, et **jamais sur un geste qui
 * coûte**. Se connecter ou finir une inscription au sixième chiffre fait gagner un clic ; signer un
 * contrat, retirer de l'argent ou clôturer un compte au sixième chiffre ne laisse plus la seconde
 * pendant laquelle on se ravise.
 *
 * > **Un geste qu'on ne peut pas défaire ne se déclenche pas à la sixième frappe.**
 */
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

const CASES = [0, 1, 2, 3, 4, 5]

export interface ChampCodeProps {
  /** L'identifiant, pour qu'un `<Label htmlFor>` désigne bien ce champ. */
  id?: string
  /** Quand aucun intitulé visible ne l'accompagne — la case seule ne dit pas de quel code il s'agit. */
  'aria-label'?: string
  valeur: string
  onChange: (v: string) => void
  /**
   * Appelé au sixième chiffre. **À ne poser que sur un geste qu'on peut refaire** — connexion,
   * inscription, activation d'une protection. Jamais sur une signature, un retrait ou une clôture.
   */
  onComplete?: () => void
  autoFocus?: boolean
  disabled?: boolean
}

export function ChampCode({ id, valeur, onChange, onComplete, autoFocus, disabled, ...reste }: ChampCodeProps) {
  return (
    <InputOTP
      id={id}
      maxLength={6}
      value={valeur}
      onChange={onChange}
      onComplete={onComplete}
      autoFocus={autoFocus}
      disabled={disabled}
      aria-label={reste['aria-label']}
      autoComplete="one-time-code"
      inputMode="numeric"
    >
      <InputOTPGroup>
        {CASES.map((i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
