/**
 * Les coordonnées de contact d'ULAMU — une seule source, deux écrans.
 *
 * ── Pourquoi ce fichier existe ─────────────────────────────────────────────────────────────────
 *
 * L'adresse était écrite en dur à deux endroits : le bouton « Écrire à l'administration » de C1 et
 * les mentions légales de B3. Deux copies d'un même fait finissent toujours par diverger — et
 * celle-ci a une particularité : **elle est fausse aujourd'hui.**
 *
 * ── ⚠️ Dette ouverte, à trancher par le porteur ────────────────────────────────────────────────
 *
 * `ulamu.cg` **n'appartient pas au projet**. L'application vit sur `onrender.com`, l'API sur
 * `ulamu-api.onrender.com`, et les courriels partent d'une adresse d'expéditeur vérifiée chez Brevo
 * (`BREVO_FROM_EMAIL`, réglée dans le tableau de bord Render). Écrire `support@ulamu.cg` sur des
 * mentions légales, c'est donner un moyen de contact que **personne ne relève**.
 *
 * Ce n'est pas un détail de façade : les mentions légales sont acceptées à l'inscription, elles
 * valent preuve sous la loi n° 29-2019 — et une preuve qui donne une adresse morte expose autant
 * qu'une preuve qui affirme un fait faux. C'est la même famille d'erreur que le « hébergées au
 * Congo-Brazzaville » corrigé le 24/08.
 *
 * **Deux issues, et le choix n'est pas technique :**
 *
 * 1. Acquérir `ulamu.cg` (ou un autre domaine) et y relever une boîte. Coût réel, hors budget actuel.
 * 2. Afficher l'adresse réellement relevée — celle qui sert déjà d'expéditeur aux courriels du
 *    service. Coût nul, et immédiatement vrai.
 *
 * Tant que le porteur n'a pas tranché, l'adresse reste ici, à UN endroit, pour qu'une seule ligne
 * suffise à la corriger partout.
 */

/** L'adresse affichée dans les mentions légales et derrière « Écrire à l'administration ». */
export const EMAIL_SUPPORT = 'support@ulamu.cg'

/** Le pays que le service dessert — distinct de celui où les données sont hébergées (Allemagne). */
export const PAYS_DE_SERVICE = 'Congo-Brazzaville'
